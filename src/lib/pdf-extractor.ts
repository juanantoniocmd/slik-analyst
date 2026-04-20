import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import type {
  PDFDocumentProxy,
  TextItem,
} from 'pdfjs-dist/types/src/display/api'

// Use the legacy build which works in Node.js without a worker
const pdfjsVersion = pdfjsLib.version

// Configure worker for server-side usage (no worker needed in Node)
if (typeof window === 'undefined') {
  // Server-side: provide an importable worker module specifier for fake worker.
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'pdfjs-dist/legacy/build/pdf.worker.mjs'
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PositionedText {
  text: string
  x: number
  y: number
  width: number
  height: number
  page: number
}

export interface TableCell {
  text: string
  colIndex: number
  rowIndex: number
}

export interface ExtractedTable {
  page: number
  headers: string[]
  rows: Record<string, string>[]
  rawCells: TableCell[][]
}

export interface ExtractionResult {
  rawText: string
  tables: ExtractedTable[]
  pageCount: number
  version: string
}

export interface ExtractionError {
  success: false
  error: string
}

export type ExtractionOutcome =
  | ({ success: true } & ExtractionResult)
  | ExtractionError

// ─── PDF Parsing ──────────────────────────────────────────────────────────────

/**
 * Load and parse a PDF buffer, extracting positioned text items from all pages.
 */
async function extractPositionedText(
  buffer: ArrayBuffer,
): Promise<{ items: PositionedText[]; pageCount: number }> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    // Disable font rendering (we only need text content)
    disableFontFace: true,
    // Prevent worker usage in Node.js
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  })

  const pdf: PDFDocumentProxy = await loadingTask.promise
  const pageCount = pdf.numPages
  const allItems: PositionedText[] = []

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.0 })
    const textContent = await page.getTextContent()

    for (const item of textContent.items) {
      const textItem = item as TextItem
      if (!textItem.str || textItem.str.trim() === '') continue

      // PDF coordinates are bottom-left origin; convert to top-left
      const transform = textItem.transform
      const x = transform[4]
      const y = viewport.height - transform[5]
      const width = textItem.width
      const height = textItem.height

      allItems.push({
        text: textItem.str,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: Math.round(width * 100) / 100,
        height: Math.round(height * 100) / 100,
        page: pageNum,
      })
    }
  }

  await pdf.destroy()
  return { items: allItems, pageCount }
}

// ─── Raw Text Reconstruction ──────────────────────────────────────────────────

/**
 * Reconstruct the raw text from positioned items, preserving reading order.
 */
function reconstructRawText(items: PositionedText[]): string {
  // Group by page → sort by y (top to bottom) → within y cluster, sort by x
  const byPage = new Map<number, PositionedText[]>()
  for (const item of items) {
    const list = byPage.get(item.page) ?? []
    list.push(item)
    byPage.set(item.page, list)
  }

  const lines: string[] = []

  for (const [, pageItems] of [...byPage.entries()].sort(([a], [b]) => a - b)) {
    // Cluster items into lines by y-proximity (within Y_TOLERANCE treated as same line)
    const Y_TOLERANCE = 3
    const clusters = clusterByY(pageItems, Y_TOLERANCE)

    for (const cluster of clusters) {
      const sorted = [...cluster].sort((a, b) => a.x - b.x)
      lines.push(sorted.map((i) => i.text).join(' '))
    }
  }

  return lines.join('\n')
}

// ─── Table Detection ──────────────────────────────────────────────────────────

const Y_LINE_TOLERANCE = 3 // px — items within this y-range are same row
const X_COLUMN_TOLERANCE = 8 // px — column boundaries cluster
const MIN_TABLE_ROWS = 2 // minimum rows (header + 1 data) to qualify as table
const MIN_TABLE_COLS = 2 // minimum columns to qualify as table

/**
 * Detect and extract tables from positioned text items, per page.
 * Strategy:
 *  1. Cluster text items into rows (by Y coordinate)
 *  2. Identify rows that have multi-column structure (multiple X clusters)
 *  3. Group consecutive multi-column rows into a table candidate
 *  4. Assign cells to columns using X-coordinate alignment
 */
function detectTables(items: PositionedText[]): ExtractedTable[] {
  const tables: ExtractedTable[] = []

  // Process each page independently
  const byPage = new Map<number, PositionedText[]>()
  for (const item of items) {
    const list = byPage.get(item.page) ?? []
    list.push(item)
    byPage.set(item.page, list)
  }

  for (const [pageNum, pageItems] of [...byPage.entries()].sort(
    ([a], [b]) => a - b,
  )) {
    const rows = clusterByY(pageItems, Y_LINE_TOLERANCE)
    const tableGroups = findTableGroups(rows)

    for (const group of tableGroups) {
      const table = buildTable(group, pageNum)
      if (table) tables.push(table)
    }
  }

  return tables
}

/**
 * Cluster items into rows based on Y proximity.
 */
function clusterByY(
  items: PositionedText[],
  tolerance: number,
): PositionedText[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y)
  const clusters: PositionedText[][] = []
  let current: PositionedText[] = []

  for (const item of sorted) {
    if (
      current.length === 0 ||
      Math.abs(item.y - current[current.length - 1].y) <= tolerance
    ) {
      current.push(item)
    } else {
      clusters.push(current)
      current = [item]
    }
  }
  if (current.length > 0) clusters.push(current)

  return clusters
}

/**
 * Find groups of consecutive rows that form table-like structures.
 * A row is "tabular" if it has items spread across multiple X-clusters.
 */
function findTableGroups(rows: PositionedText[][]): PositionedText[][][] {
  const groups: PositionedText[][][] = []
  let currentGroup: PositionedText[][] = []

  for (const row of rows) {
    const xClusters = clusterByX(row, X_COLUMN_TOLERANCE)
    const isTabular = xClusters.length >= MIN_TABLE_COLS

    if (isTabular) {
      currentGroup.push(row)
    } else {
      if (currentGroup.length >= MIN_TABLE_ROWS) {
        groups.push(currentGroup)
      }
      currentGroup = []
    }
  }

  if (currentGroup.length >= MIN_TABLE_ROWS) {
    groups.push(currentGroup)
  }

  return groups
}

/**
 * Cluster items in a single row by X coordinate proximity.
 */
function clusterByX(
  items: PositionedText[],
  tolerance: number,
): PositionedText[][] {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  const clusters: PositionedText[][] = []
  let current: PositionedText[] = []

  for (const item of sorted) {
    if (current.length === 0) {
      current.push(item)
    } else {
      const lastItem = current[current.length - 1]
      const lastRight = lastItem.x + lastItem.width
      // New column if item starts beyond the end of last item + tolerance
      if (item.x > lastRight + tolerance) {
        clusters.push(current)
        current = [item]
      } else {
        current.push(item)
      }
    }
  }
  if (current.length > 0) clusters.push(current)

  return clusters
}

/**
 * Build a structured ExtractedTable from a group of tabular rows.
 */
function buildTable(
  rows: PositionedText[][],
  page: number,
): ExtractedTable | null {
  if (rows.length < MIN_TABLE_ROWS) return null

  // Determine column boundaries from ALL rows (not just header)
  const allItems = rows.flat()
  const columnBoundaries = computeColumnBoundaries(allItems)

  if (columnBoundaries.length < MIN_TABLE_COLS) return null

  // Map each row to its cells, assigning to the nearest column
  const cellMatrix: string[][] = rows.map((row) => {
    const rowCells: string[] = Array(columnBoundaries.length).fill('')
    const xClusters = clusterByX(row, X_COLUMN_TOLERANCE)

    for (const cluster of xClusters) {
      const clusterX = cluster[0].x
      const colIdx = assignToColumn(clusterX, columnBoundaries)
      const cellText = cluster
        .sort((a, b) => a.x - b.x)
        .map((i) => i.text)
        .join(' ')
        .trim()

      // If cell already has content, append (handles merged text within cell)
      if (rowCells[colIdx]) {
        rowCells[colIdx] += ' ' + cellText
      } else {
        rowCells[colIdx] = cellText
      }
    }

    return rowCells
  })

  // First row is headers
  const headers = cellMatrix[0].map((h, i) => h.trim() || `Kolom ${i + 1}`)
  const dataRows = cellMatrix.slice(1)

  // Validate: every data row must have the same column count as headers
  for (const row of dataRows) {
    if (row.length !== headers.length) return null
  }

  const structuredRows: Record<string, string>[] = dataRows.map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? ''
    })
    return obj
  })

  const rawCells: TableCell[][] = cellMatrix.map((row, rowIndex) =>
    row.map((text, colIndex) => ({ text, colIndex, rowIndex })),
  )

  return {
    page,
    headers,
    rows: structuredRows,
    rawCells,
  }
}

/**
 * Compute stable column X-boundaries from all items in a table candidate.
 * Uses a gap-detection approach: find X positions where large horizontal
 * gaps exist between consecutive item start positions.
 */
function computeColumnBoundaries(items: PositionedText[]): number[] {
  const xPositions = [...new Set(items.map((i) => i.x))].sort((a, b) => a - b)
  if (xPositions.length === 0) return []

  const boundaries: number[] = [xPositions[0]]

  for (let i = 1; i < xPositions.length; i++) {
    const gap = xPositions[i] - xPositions[i - 1]
    if (gap > X_COLUMN_TOLERANCE) {
      boundaries.push(xPositions[i])
    }
  }

  return boundaries
}

/**
 * Assign an X position to the nearest column boundary index.
 */
function assignToColumn(x: number, boundaries: number[]): number {
  let best = 0
  let bestDist = Math.abs(x - boundaries[0])

  for (let i = 1; i < boundaries.length; i++) {
    const dist = Math.abs(x - boundaries[i])
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }

  return best
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateTables(tables: ExtractedTable[]): string | null {
  for (let t = 0; t < tables.length; t++) {
    const table = tables[t]

    if (table.headers.some((h) => !h.trim())) {
      return `Tabel ${t + 1} (halaman ${table.page}): ditemukan header kosong`
    }

    for (let r = 0; r < table.rows.length; r++) {
      const keys = Object.keys(table.rows[r])
      if (keys.length !== table.headers.length) {
        return `Tabel ${t + 1} baris ${r + 1}: jumlah kolom tidak konsisten`
      }
    }
  }

  return null
}

function normalizeTables(tables: ExtractedTable[]): ExtractedTable[] {
  return tables.filter((table) => {
    if (!table.headers.length) return false
    if (!table.rows.length) return false

    const hasAnyValue = table.rows.some((row) =>
      table.headers.some((header) => (row[header] ?? '').trim() !== ''),
    )

    return hasAnyValue
  })
}

function buildRowBasedFallbackTables(
  items: PositionedText[],
): ExtractedTable[] {
  const byPage = new Map<number, PositionedText[]>()
  for (const item of items) {
    const list = byPage.get(item.page) ?? []
    list.push(item)
    byPage.set(item.page, list)
  }

  const tables: ExtractedTable[] = []

  for (const [page, pageItems] of [...byPage.entries()].sort(
    ([a], [b]) => a - b,
  )) {
    const rows = clusterByY(pageItems, Y_LINE_TOLERANCE)
      .map((row) => {
        const cells = clusterByX(row, X_COLUMN_TOLERANCE)
          .map((cluster) =>
            cluster
              .sort((a, b) => a.x - b.x)
              .map((item) => item.text)
              .join(' ')
              .trim(),
          )
          .filter((cell) => cell !== '')

        return cells
      })
      .filter((cells) => cells.length > 0)

    const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0)
    if (rows.length < 3 || maxCols < 2) continue

    const headers = Array.from(
      { length: maxCols },
      (_, index) => `Kolom ${index + 1}`,
    )
    const structuredRows = rows.map((row) => {
      const record: Record<string, string> = {}
      headers.forEach((header, index) => {
        record[header] = row[index] ?? ''
      })
      return record
    })

    const rawCells: TableCell[][] = structuredRows.map((row, rowIndex) =>
      headers.map((header, colIndex) => ({
        text: row[header] ?? '',
        colIndex,
        rowIndex,
      })),
    )

    tables.push({
      page,
      headers,
      rows: structuredRows,
      rawCells,
    })
  }

  return tables
}

function buildKeyValueFallbackTable(rawText: string): ExtractedTable[] {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')

  const keyValueRows = lines
    .map((line) => {
      const separatorIndex = line.indexOf(':')
      if (separatorIndex <= 0 || separatorIndex >= line.length - 1) return null

      const key = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).trim()
      if (!key || !value) return null

      return { key, value }
    })
    .filter((row): row is { key: string; value: string } => row !== null)

  if (!keyValueRows.length) return []

  const headers = ['Field', 'Value']
  const rows = keyValueRows.map((entry) => ({
    Field: entry.key,
    Value: entry.value,
  }))

  const rawCells: TableCell[][] = rows.map((row, rowIndex) =>
    headers.map((header, colIndex) => ({
      text: (row as Record<string, string>)[header] ?? '',
      colIndex,
      rowIndex,
    })),
  )

  return [
    {
      page: 1,
      headers,
      rows,
      rawCells,
    },
  ]
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function extractPdf(
  buffer: ArrayBuffer,
): Promise<ExtractionOutcome> {
  try {
    const { items, pageCount } = await extractPositionedText(buffer)

    if (items.length === 0) {
      return {
        success: false,
        error:
          'PDF tidak mengandung teks yang dapat diekstrak. Pastikan PDF bukan hasil scan (image-based).',
      }
    }

    const rawText = reconstructRawText(items)
    const detectedTables = detectTables(items)
    let tables = normalizeTables(detectedTables)

    if (!tables.length) {
      tables = normalizeTables(buildRowBasedFallbackTables(items))
    }

    if (!tables.length) {
      tables = buildKeyValueFallbackTable(rawText)
    }

    const validationError = validateTables(tables)
    if (validationError && tables.length) {
      // Keep processing using normalized fallback tables if strict validation fails.
      tables = normalizeTables(buildRowBasedFallbackTables(items))
      if (!tables.length) {
        tables = buildKeyValueFallbackTable(rawText)
      }
    }

    return {
      success: true,
      rawText,
      tables,
      pageCount,
      version: pdfjsVersion,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: `Gagal memproses PDF: ${message}`,
    }
  }
}
