import { useState } from 'react'

import {
  uploadSlikPdf,
  type UploadSlikPdfResponse,
} from '../features/slik/upload-slik'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

interface SlikUploadFormProps {
  onResult: (result: UploadSlikPdfResponse | null) => void
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export function SlikUploadForm({ onResult }: SlikUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!file) {
      setError('Pilih file PDF terlebih dahulu.')
      return
    }

    if (file.type !== 'application/pdf') {
      setError('Hanya file PDF yang diperbolehkan.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const base64Data = arrayBufferToBase64(await file.arrayBuffer())
      const response = await uploadSlikPdf({
        data: {
          filename: file.name,
          mimeType: file.type,
          base64Data,
        },
      })

      if (!isUploadSlikPdfResponse(response)) {
        throw new Error(
          'Response ekstraksi tidak valid. Silakan coba upload ulang.',
        )
      }

      const result = response

      onResult(result)

      if (!result.success) {
        setError(result.error)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Terjadi kesalahan upload.'
      setError(message)
      onResult(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload PDF SLIK OJK</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="slik-pdf" className="block text-sm font-medium">
              File PDF
            </label>
            <Input
              id="slik-pdf"
              name="slik-pdf"
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const selectedFile = event.currentTarget.files?.[0] ?? null
                setFile(selectedFile)
                setError(null)
                onResult(null)
              }}
            />
          </div>

          <Button type="submit" disabled={isSubmitting || !file}>
            {isSubmitting ? 'Memproses...' : 'Extract PDF'}
          </Button>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Ekstraksi gagal</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}
