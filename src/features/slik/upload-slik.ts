import { createHash } from 'node:crypto'

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { prisma } from '../../db'
import { extractPdf } from '../../lib/pdf-extractor'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const uploadSlikPdfInput = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  base64Data: z.string().min(1),
})

export type UploadSlikPdfResponse =
  | {
      success: true
      extractionId: string
      filename: string
      fileHash: string
      pageCount: number
      rawText: string
      tables: Array<{
        page: number
        headers: string[]
        rows: Record<string, string>[]
      }>
      extractedAt: string
    }
  | {
      success: false
      error: string
      extractionId?: string
    }

export const uploadSlikPdf = createServerFn({ method: 'POST' })
  .inputValidator(uploadSlikPdfInput)
  .handler(async ({ data }): Promise<UploadSlikPdfResponse> => {
    let fileHash = ''

    try {
      const mimeType = data.mimeType.toLowerCase()
      if (mimeType !== 'application/pdf') {
        return {
          success: false,
          error: 'File harus berformat PDF.',
        }
      }

      const buffer = Buffer.from(data.base64Data, 'base64')

      if (!buffer.length) {
        return {
          success: false,
          error: 'File PDF kosong atau tidak valid.',
        }
      }

      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return {
          success: false,
          error: 'Ukuran file terlalu besar. Maksimal 10MB.',
        }
      }

      fileHash = createHash('sha256').update(buffer).digest('hex')
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer

      const extraction = await extractPdf(arrayBuffer)

      if (!extraction.success) {
        const failedRecord = await prisma.slikExtraction.create({
          data: {
            filename: data.filename,
            fileHash,
            rawText: '',
            extractedTables: [],
            pageCount: 0,
            status: 'FAILED',
            errorMessage: extraction.error,
          },
        })

        return {
          success: false,
          error: extraction.error,
          extractionId: failedRecord.id,
        }
      }

      const record = await prisma.slikExtraction.create({
        data: {
          filename: data.filename,
          fileHash,
          rawText: extraction.rawText,
          extractedTables: extraction.tables,
          pageCount: extraction.pageCount,
          status: 'SUCCESS',
        },
      })

      return {
        success: true,
        extractionId: record.id,
        filename: record.filename,
        fileHash: record.fileHash,
        pageCount: record.pageCount,
        rawText: extraction.rawText,
        tables: extraction.tables.map((table) => ({
          page: table.page,
          headers: table.headers,
          rows: table.rows,
        })),
        extractedAt: record.createdAt.toISOString(),
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const safeError = `Terjadi error saat memproses PDF: ${message}`

      let extractionId: string | undefined
      try {
        const failedRecord = await prisma.slikExtraction.create({
          data: {
            filename: data.filename,
            fileHash,
            rawText: '',
            extractedTables: [],
            pageCount: 0,
            status: 'FAILED',
            errorMessage: safeError,
          },
        })
        extractionId = failedRecord.id
      } catch {
        // If DB logging fails, still return a structured error response.
      }

      return {
        success: false,
        error: safeError,
        extractionId,
      }
    }
  })
