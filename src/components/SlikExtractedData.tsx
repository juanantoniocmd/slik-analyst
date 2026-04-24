import type {
  GenerateSlikSummaryResponse,
  UploadSlikPdfResponse,
} from '../features/slik/upload-slik'
import { LoaderCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { MarkdownViewer } from './MarkdownViewer'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

interface SlikExtractedDataProps {
  result: UploadSlikPdfResponse | null
  aiSummaryResult: GenerateSlikSummaryResponse | null
  isGeneratingAiSummary: boolean
}

function isUploadSlikPdfResponse(
  value: unknown,
): value is UploadSlikPdfResponse {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    typeof (value as { success?: unknown }).success === 'boolean'
  )
}

export function SlikExtractedData({
  result,
  aiSummaryResult,
  isGeneratingAiSummary,
}: SlikExtractedDataProps) {
  if (!result) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Hasil ekstraksi akan muncul di sini setelah file diproses.
        </CardContent>
      </Card>
    )
  }

  if (!isUploadSlikPdfResponse(result)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Ekstraksi gagal</AlertTitle>
        <AlertDescription>
          Format hasil ekstraksi tidak valid. Silakan upload ulang file.
        </AlertDescription>
      </Alert>
    )
  }

  if (!result.success) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Ekstraksi gagal</AlertTitle>
        <AlertDescription>
          <p>{result.error}</p>
          {result.extractionId ? <p>ID: {result.extractionId}</p> : null}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Ekstraksi Berhasil <Badge>SUCCESS</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p>File: {result.filename}</p>
          <p>Pages: {result.pageCount}</p>
          <p>Extraction ID: {result.extractionId}</p>
          <p>
            Extracted At: {new Date(result.extractedAt).toLocaleString('id-ID')}
          </p>
        </CardContent>
      </Card>

      {isGeneratingAiSummary ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
              AI Summary sedang diproses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ringkasan AI dibuat di background. Hasil ekstraksi dan scoring
              tetap bisa langsung digunakan.
            </p>
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-foreground/10" />
              <div className="h-3 w-full animate-pulse rounded bg-foreground/8" />
              <div className="h-3 w-[92%] animate-pulse rounded bg-foreground/8" />
              <div className="h-3 w-[86%] animate-pulse rounded bg-foreground/8" />
              <div className="h-4 w-32 animate-pulse rounded bg-foreground/10 pt-2" />
              <div className="h-3 w-full animate-pulse rounded bg-foreground/8" />
              <div className="h-3 w-[88%] animate-pulse rounded bg-foreground/8" />
            </div>
          </CardContent>
        </Card>
      ) : aiSummaryResult?.aiSummary ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              AI Summary
              <Badge variant="outline">
                {aiSummaryResult.aiSummary.provider.toUpperCase()} •{' '}
                {aiSummaryResult.aiSummary.model}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] overflow-auto rounded-lg bg-muted p-4">
              <MarkdownViewer
                content={aiSummaryResult.aiSummary.content}
                className="prose prose-sm max-w-none dark:prose-invert"
              />
            </div>
          </CardContent>
        </Card>
      ) : aiSummaryResult?.aiSummaryAttempts.length ? (
        <Alert>
          <AlertTitle>AI Summary tidak muncul</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 text-sm">
              <p>Provider AI sudah dicoba, tetapi semua request gagal.</p>
              <ul className="list-disc space-y-1 pl-5">
                {aiSummaryResult.aiSummaryAttempts.map((attempt, index) => (
                  <li key={`${attempt.provider}-${index}`}>
                    {attempt.provider.toUpperCase()} ({attempt.model})
                    {attempt.statusCode ? ` - HTTP ${attempt.statusCode}` : ''}
                    {attempt.error ? ` - ${attempt.error}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* <Card>
        <CardHeader>
          <CardTitle>Tables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada tabel terdeteksi.
            </p>
          ) : (
            result.tables.map((table, tableIndex) => (
              <div key={`table-${tableIndex}`} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Table {tableIndex + 1} - Page {table.page}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {table.headers.map((header, idx) => (
                        <TableHead key={`${header}-${idx}`}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.rows.map((row, rowIndex) => (
                      <TableRow key={`row-${rowIndex}`}>
                        {table.headers.map((header) => (
                          <TableCell key={`${rowIndex}-${header}`}>
                            {(row[header] ?? '').trim() || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </CardContent>
      </Card> */}

      <Card>
        <CardHeader>
          <CardTitle>JSON Output</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted p-3 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* <Card>
        <CardHeader>
          <CardTitle>Raw Text</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
            {result.rawText}
          </pre>
        </CardContent>
      </Card> */}
    </section>
  )
}
