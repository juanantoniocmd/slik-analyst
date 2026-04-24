import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { SlikAnalysis } from '../components/SlikAnalysis'
import { SlikExtractedData } from '../components/SlikExtractedData'
import { SlikUploadForm } from '../components/SlikUploadForm'
import {
  generateSlikSummary,
  type GenerateSlikSummaryResponse,
  type UploadSlikPdfResponse,
} from '../features/slik/upload-slik'

export const Route = createFileRoute('/')({ component: App })
function App() {
  const [result, setResult] = useState<UploadSlikPdfResponse | null>(null)
  const [aiSummaryResult, setAiSummaryResult] =
    useState<GenerateSlikSummaryResponse | null>(null)
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!result?.success) {
      setAiSummaryResult(null)
      setIsGeneratingAiSummary(false)
      return
    }

    setAiSummaryResult(null)
    setIsGeneratingAiSummary(true)

    void generateSlikSummary({
      data: {
        rawText: result.rawText,
        tables: result.tables,
      },
    })
      .then((response) => {
        if (!cancelled) {
          setAiSummaryResult(response)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAiSummaryResult({
            success: false,
            aiSummaryAttempts: [],
          })
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsGeneratingAiSummary(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [result])

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
        <SlikExtractedData
          result={result}
          aiSummaryResult={aiSummaryResult}
          isGeneratingAiSummary={isGeneratingAiSummary}
        />
      </section>

      {result && result.success && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Analisis Kredit SLIK</h2>
          <SlikAnalysis
            tables={result.tables}
            rawText={result.rawText}
            aiSummary={aiSummaryResult?.aiSummary?.content}
            aiProvider={aiSummaryResult?.aiSummary?.provider}
            aiSummaryAttempts={aiSummaryResult?.aiSummaryAttempts}
            isGeneratingAiSummary={isGeneratingAiSummary}
          />
        </section>
      )}
    </main>
  )
}
