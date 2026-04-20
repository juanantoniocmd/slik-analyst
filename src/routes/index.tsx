import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { SlikAnalysis } from '../components/SlikAnalysis'
import { SlikExtractedData } from '../components/SlikExtractedData'
import { SlikUploadForm } from '../components/SlikUploadForm'
import type { UploadSlikPdfResponse } from '../features/slik/upload-slik'

export const Route = createFileRoute('/')({ component: App })
function App() {
  const [result, setResult] = useState<UploadSlikPdfResponse | null>(null)

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <header className="space-y-1 text-left">
        <h1 className="text-2xl font-bold">
          SLIK OJK PDF Extractor & Analisis Kredit
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload file PDF SLIK OJK, ekstrak data, lalu jalankan analisis kredit
          otomatis berdasarkan model scoring SLIK-only.
        </p>
      </header>

      <SlikUploadForm onResult={setResult} />

      <section>
        <SlikExtractedData result={result} />
      </section>

      {result && result.success && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Analisis Kredit SLIK</h2>
          <SlikAnalysis tables={result.tables} rawText={result.rawText} />
        </section>
      )}
    </main>
  )
}
