import OpenAI from 'openai'

import { env } from '../../env'

type SlikTable = {
  page: number
  headers: string[]
  rows: Record<string, string>[]
}

export type SlikAiSummaryResult = {
  summary: string
  provider: 'chatgpt' | 'gemini'
  model: string
}

export type SlikAiSummaryAttempt = {
  provider: 'chatgpt' | 'gemini'
  ok: boolean
  model: string
  error?: string
  statusCode?: number
}

export type SlikAiSummaryExecution = {
  result: SlikAiSummaryResult | null
  attempts: SlikAiSummaryAttempt[]
}

const OPENAI_MODEL = 'gpt-4.1'
const GEMINI_MODEL = 'models/gemini-flash-latest'

function buildSlikPrompt(rawText: string, tables: SlikTable[]): string {
  const compactTables = tables.slice(0, 6).map((table) => ({
    page: table.page,
    headers: table.headers,
    rows: table.rows.slice(0, 8),
  }))

  const truncatedRawText = rawText.slice(0, 12000)

  return [
    'Anda adalah analis risiko kredit yang membaca data SLIK OJK.',
    'Buat ringkasan analitis dalam bahasa Indonesia yang ringkas dan profesional.',
    'Format jawaban WAJIB berupa markdown dengan bagian berikut:',
    '1) Profil Debitur (2-3 poin)',
    '2) Temuan Utama SLIK (3-6 poin)',
    '3) Indikator Risiko (bullet, sebutkan level: rendah/sedang/tinggi)',
    '4) Rekomendasi Tindak Lanjut (3-5 poin praktis untuk analis kredit)',
    '5) Kesimpulan Singkat (1 paragraf)',
    'Jika data tidak cukup, nyatakan asumsi dengan jelas dan jangan mengarang angka.',
    '',
    `RAW_TEXT_SLIK:\n${truncatedRawText}`,
    '',
    `TABLES_SLIK_SAMPLE:\n${JSON.stringify(compactTables)}`,
  ].join('\n')
}

async function callChatGpt(
  prompt: string,
): Promise<
  | { ok: true; result: SlikAiSummaryResult }
  | { ok: false; attempt: SlikAiSummaryAttempt }
> {
  if (!env.CHATGPT_API_KEY) {
    return {
      ok: false,
      attempt: {
        provider: 'chatgpt',
        ok: false,
        model: OPENAI_MODEL,
        error: 'CHATGPT_API_KEY tidak tersedia di runtime server.',
      },
    }
  }

  const client = new OpenAI({
    apiKey: env.CHATGPT_API_KEY,
  })

  try {
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      input: [
        {
          role: 'system',
          content:
            'Anda adalah analis kredit SLIK yang objektif. Hindari klaim tanpa data.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const summary = response.output_text.trim()
    if (!summary) {
      return {
        ok: false,
        attempt: {
          provider: 'chatgpt',
          ok: false,
          model: OPENAI_MODEL,
          error: 'OpenAI tidak mengembalikan konten summary.',
        },
      }
    }

    return {
      ok: true,
      result: {
        summary,
        provider: 'chatgpt',
        model: OPENAI_MODEL,
      },
    }
  } catch (error) {
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof error.status === 'number'
        ? error.status
        : undefined

    const errorMessage =
      error instanceof Error ? error.message : 'OpenAI request gagal.'

    return {
      ok: false,
      attempt: {
        provider: 'chatgpt',
        ok: false,
        model: OPENAI_MODEL,
        statusCode,
        error: errorMessage.slice(0, 500),
      },
    }
  }
}

async function callGemini(
  prompt: string,
): Promise<
  | { ok: true; result: SlikAiSummaryResult }
  | { ok: false; attempt: SlikAiSummaryAttempt }
> {
  if (!env.GEMINI_API_KEY) {
    return {
      ok: false,
      attempt: {
        provider: 'gemini',
        ok: false,
        model: GEMINI_MODEL,
        error: 'GEMINI_API_KEY tidak tersedia di runtime server.',
      },
    }
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      ok: false,
      attempt: {
        provider: 'gemini',
        ok: false,
        model: GEMINI_MODEL,
        statusCode: response.status,
        error: errorText.slice(0, 500) || 'Gemini request gagal.',
      },
    }
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }

  const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!summary) {
    return {
      ok: false,
      attempt: {
        provider: 'gemini',
        ok: false,
        model: GEMINI_MODEL,
        error: 'Gemini tidak mengembalikan konten summary.',
      },
    }
  }

  return {
    ok: true,
    result: {
      summary,
      provider: 'gemini',
      model: GEMINI_MODEL,
    },
  }
}

export async function generateSlikAiSummary(
  rawText: string,
  tables: SlikTable[],
): Promise<SlikAiSummaryExecution> {
  const prompt = buildSlikPrompt(rawText, tables)
  const attempts: SlikAiSummaryAttempt[] = []

  try {
    const chatGptResult = await callChatGpt(prompt)
    if (chatGptResult.ok) {
      attempts.push({
        provider: chatGptResult.result.provider,
        ok: true,
        model: chatGptResult.result.model,
      })
      return { result: chatGptResult.result, attempts }
    }
    attempts.push(chatGptResult.attempt)
  } catch (error) {
    attempts.push({
      provider: 'chatgpt',
      ok: false,
      model: OPENAI_MODEL,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const geminiResult = await callGemini(prompt)
    if (geminiResult.ok) {
      attempts.push({
        provider: geminiResult.result.provider,
        ok: true,
        model: geminiResult.result.model,
      })
      return { result: geminiResult.result, attempts }
    }
    attempts.push(geminiResult.attempt)
  } catch (error) {
    attempts.push({
      provider: 'gemini',
      ok: false,
      model: GEMINI_MODEL,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return { result: null, attempts }
}
