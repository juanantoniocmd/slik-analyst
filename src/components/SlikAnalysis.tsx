'use client'

import { useMemo } from 'react'

import { analyzeSlik } from '../features/slik/slik-scoring-engine'
import type {
  SlikAnalysisResult,
  SlikInputData,
} from '../features/slik/slik-analysis.types'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

interface SlikAnalysisProps {
  tables: Array<{
    page: number
    headers: string[]
    rows: Record<string, string>[]
  }>
  rawText: string
}

const DEFAULT_INPUT: SlikInputData = {
  namaDebitur: '',
  nik: '',
  tanggalDataSlik: '',
  nomorLaporanSlik: '',
  totalFasilitas: 0,
  jumlahFasilitasAktif: 0,
  jumlahFasilitasDibatalkan: 0,
  jumlahFasilitasLunas: 0,
  jumlahFasilitasDihapusbukukan: 0,
  jumlahFasilitasHapusTagih: 0,
  jumlahFasilitasLunasAgunan: 0,
  jumlahFasilitasLunasPengadilan: 0,
  jumlahFasilitasDialihkanPelapor: 0,
  jumlahFasilitasDialihkanFasilitas: 0,
  jumlahFasilitasDialihkanPihakLain: 0,
  jumlahFasilitasSekuritisasiServicer: 0,
  jumlahFasilitasSekuritisasiNonServicer: 0,
  jumlahFasilitasLunasDiskon: 0,
  jumlahFasilitasDiblokir: 0,
  jumlahFasilitasRestrukturisasi: 0,
  totalFrekuensiRestrukturisasi: 0,
  kolTerburukAktif: 1,
  kolTerburukHistoris: 1,
  adaKol5Aktif: false,
  adaKol4Aktif: false,
  hariTunggakanAktifMax: 0,
  hariTunggakanHistorisMax: 0,
  totalFrekuensiTunggakan: 0,
  jumlahFasilitasPernahKol2Plus: 0,
  trenKolektibilitas6Bulan: 1,
  adaWriteOff3Tahun: false,
}

export function SlikAnalysis({ tables, rawText }: SlikAnalysisProps) {
  const { input, result } = useMemo(() => {
    const parsedInput = extractInputFromPdf(tables, rawText)
    const analysisResult = analyzeSlik(parsedInput)
    return { input: parsedInput, result: analysisResult }
  }, [tables, rawText])

  return (
    <div className="space-y-4">
      <Tabs defaultValue="result" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input">DATA SLIK</TabsTrigger>
          <TabsTrigger value="result">HASIL ANALISIS</TabsTrigger>
          <TabsTrigger value="reference">REFERENSI</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <ReadOnlyInput input={input} />
        </TabsContent>

        <TabsContent value="result">
          <AnalysisResult result={result} />
        </TabsContent>

        <TabsContent value="reference">
          <ReferenceTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── READ-ONLY INPUT DISPLAY ─────────────────────────────────────────────────

function ReadOnlyInput({ input }: { input: SlikInputData }) {
  const trenLabels: Record<number, string> = {
    1: '1 — Konsisten Lancar (Semua Kol 1)',
    2: '2 — Membaik (Kol 2+ → Kol 1)',
    3: '3 — Stabil Kol 2 (DPK konstan)',
    4: '4 — Memburuk (Kol meningkat)',
    5: '5 — Kol 5 Aktif / Memburuk drastis',
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">A. Identitas Debitur</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <ReadOnlyField
            label="Nama Debitur"
            value={input.namaDebitur || '—'}
          />
          <ReadOnlyField label="NIK" value={input.nik || '—'} />
          <ReadOnlyField
            label="Tanggal Data SLIK"
            value={input.tanggalDataSlik || '—'}
          />
          <ReadOnlyField
            label="Nomor Laporan SLIK"
            value={input.nomorLaporanSlik || '—'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">B. Ringkasan Fasilitas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <ReadOnlyField
            label="Total Fasilitas"
            value={String(input.totalFasilitas)}
          />
          <ReadOnlyField
            label="Total Fasilitas Aktif"
            value={String(input.jumlahFasilitasAktif)}
          />
          <ReadOnlyField
            label="Total Fasilitas Dibatalkan"
            value={String(input.jumlahFasilitasDibatalkan)}
          />
          <ReadOnlyField
            label="Total Fasilitas Lunas"
            value={String(input.jumlahFasilitasLunas)}
          />
          <ReadOnlyField
            label="Total Fasilitas Dihapusbukukan"
            value={String(input.jumlahFasilitasDihapusbukukan)}
          />
          <ReadOnlyField
            label="Total Fasilitas Hapus Tagih"
            value={String(input.jumlahFasilitasHapusTagih)}
          />
          <ReadOnlyField
            label="Total Fasilitas Lunas karena pengambilalihan agunan"
            value={String(input.jumlahFasilitasLunasAgunan)}
          />
          <ReadOnlyField
            label="Total Fasilitas Lunas karena diselesaikan melalui pengadilan"
            value={String(input.jumlahFasilitasLunasPengadilan)}
          />
          <ReadOnlyField
            label="Total Fasilitas Dialihkan ke Pelapor lain"
            value={String(input.jumlahFasilitasDialihkanPelapor)}
          />
          <ReadOnlyField
            label="Total Fasilitas Dialihkan ke Fasilitas lain"
            value={String(input.jumlahFasilitasDialihkanFasilitas)}
          />
          <ReadOnlyField
            label="Total Fasilitas Dialihkan/dijual kepada pihak lain non pelapor"
            value={String(input.jumlahFasilitasDialihkanPihakLain)}
          />
          <ReadOnlyField
            label="Total Fasilitas Disekuritisasi (Kreditur Asal sebagai Servicer)"
            value={String(input.jumlahFasilitasSekuritisasiServicer)}
          />
          <ReadOnlyField
            label="Total Fasilitas Disekuritisasi (Kreditur Asal tidak sebagai Servicer)"
            value={String(input.jumlahFasilitasSekuritisasiNonServicer)}
          />
          <ReadOnlyField
            label="Total Fasilitas Lunas Dengan Diskon"
            value={String(input.jumlahFasilitasLunasDiskon)}
          />
          <ReadOnlyField
            label="Total Fasilitas Diblokir Sementara"
            value={String(input.jumlahFasilitasDiblokir)}
          />
          <ReadOnlyField
            label="Fasilitas Pernah Restrukturisasi"
            value={String(input.jumlahFasilitasRestrukturisasi)}
          />
          <ReadOnlyField
            label="Total Frekuensi Restrukturisasi"
            value={String(input.totalFrekuensiRestrukturisasi)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">C. Kolektibilitas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <ReadOnlyField
            label="Kol Terburuk AKTIF"
            value={`Kol ${input.kolTerburukAktif}`}
          />
          <ReadOnlyField
            label="Kol Terburuk HISTORIS"
            value={`Kol ${input.kolTerburukHistoris}`}
          />
          <ReadOnlyField
            label="Ada Kol 5 AKTIF?"
            value={input.adaKol5Aktif ? 'Ya' : 'Tidak'}
          />
          <ReadOnlyField
            label="Ada Kol 4 AKTIF?"
            value={input.adaKol4Aktif ? 'Ya' : 'Tidak'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">D. Hari Tunggakan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <ReadOnlyField
            label="Hari Tunggakan AKTIF Max"
            value={`${input.hariTunggakanAktifMax} hari`}
          />
          <ReadOnlyField
            label="Hari Tunggakan HISTORIS Max"
            value={`${input.hariTunggakanHistorisMax} hari`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">E. Frekuensi Tunggakan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <ReadOnlyField
            label="Total Frekuensi Tunggakan"
            value={`${input.totalFrekuensiTunggakan} kali`}
          />
          <ReadOnlyField
            label="Fasilitas Pernah Kol 2+"
            value={String(input.jumlahFasilitasPernahKol2Plus)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">F. Tren 6 Bulan Terakhir</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ReadOnlyField
            label="Tren Kolektibilitas"
            value={trenLabels[input.trenKolektibilitas6Bulan]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">G. Write-Off Timing</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <ReadOnlyField
            label="Write-off dalam 3 tahun terakhir?"
            value={input.adaWriteOff3Tahun ? 'Ya' : 'Tidak'}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── ANALYSIS RESULT ─────────────────────────────────────────────────────────

function AnalysisResult({ result }: { result: SlikAnalysisResult }) {
  return (
    <div className="space-y-4">
      {/* Decision Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">
            KEPUTUSAN AKHIR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <DecisionBadge keputusan={result.keputusan} />
            <div>
              <p className="text-lg font-semibold">{result.keputusan}</p>
              <p className="text-sm text-muted-foreground">
                {result.rekomendasiTindakan}
              </p>
            </div>
          </div>
          {!result.isCreditVirgin && !result.layer1.triggered && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Skor Akhir</span>
                <span className="font-mono font-bold">
                  {result.totalSkor}/100
                </span>
              </div>
              <Progress value={result.totalSkor} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {result.scoreBand}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Identitas Debitur</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nama</span>
            <span>{result.input.namaDebitur || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">NIK</span>
            <span>{result.input.nik || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tanggal Data SLIK</span>
            <span>{result.input.tanggalDataSlik || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nomor Laporan</span>
            <span>{result.input.nomorLaporanSlik || '—'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Layer 1 Detail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Layer 1 — Hard Reject Triggers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <Layer1Row
              label="L1-A: Kol 5 Aktif"
              triggered={result.layer1.l1a_kol5Aktif}
            />
            <Layer1Row
              label="L1-B: Write-off < 3 tahun"
              triggered={result.layer1.l1b_writeOff3Tahun}
            />
            <Layer1Row
              label="L1-C: Kol 4 Aktif"
              triggered={result.layer1.l1c_kol4Aktif}
            />
            <Layer1Row
              label="L1-D: Tunggakan Aktif > 90 hari"
              triggered={result.layer1.l1d_tunggakanAktif90Hari}
            />
          </div>
          <Separator className="my-3" />
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>Status:</span>
            {result.layer1.triggered ? (
              <Badge variant="destructive">TRIGGERED — AUTO REJECT</Badge>
            ) : (
              <Badge className="bg-green-600 hover:bg-green-700">
                LOLOS — LANJUT SCORING
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit Virgin Note */}
      {result.isCreditVirgin && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Catatan Credit Virgin</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="mb-3">
              Debitur tidak memiliki rekam jejak kredit di SLIK. Ini TIDAK
              berarti buruk — bisa berarti belum pernah mengambil kredit formal.
            </p>
            <p className="font-medium">Tindakan yang diperlukan:</p>
            <ol className="mt-1 list-inside list-decimal space-y-1 text-muted-foreground">
              <li>Verifikasi pendapatan (slip gaji 3 bulan / SPT tahunan)</li>
              <li>Verifikasi rekening koran 6 bulan</li>
              <li>
                Pertimbangkan limit kredit lebih kecil sebagai langkah awal
              </li>
              <li>Lakukan analisis kualitatif oleh analis senior</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Layer 2 Score Breakdown */}
      {!result.isCreditVirgin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Layer 2 — Breakdown Skor Per Parameter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.layer1.triggered && (
              <p className="mb-3 text-xs text-muted-foreground">
                Layer 1 ter-trigger (AUTO REJECT). Breakdown skor Layer 2 di
                bawah ini ditampilkan sebagai referensi.
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Nilai Input</TableHead>
                  <TableHead className="text-right">Skor Raw</TableHead>
                  <TableHead className="text-right">Bobot</TableHead>
                  <TableHead className="text-right">Skor Berbobot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.parameters.map((p) => (
                  <TableRow key={p.parameter}>
                    <TableCell className="font-medium">
                      {p.parameter} — {p.label}
                    </TableCell>
                    <TableCell>{p.nilaiInput}</TableCell>
                    <TableCell className="text-right font-mono">
                      {p.skorRaw}
                    </TableCell>
                    <TableCell className="text-right">{p.bobot}%</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {p.skorBerbobot.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold">
                  <TableCell colSpan={4}>TOTAL SKOR</TableCell>
                  <TableCell className="text-right font-mono">
                    {result.totalSkor.toFixed(1)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="border-muted">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong>DISCLAIMER:</strong> Model ini menghasilkan rekomendasi
            berdasarkan data SLIK SAJA. Bobot adalah heuristik yang belum
            dikalibrasi secara statistik dengan data historis. Keputusan kredit
            final harus mempertimbangkan faktor lain (income, agunan, tujuan
            kredit) dan ditandatangani oleh pejabat kredit yang berwenang. Model
            ini BUKAN keputusan kredit otomatis yang mengikat.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── REFERENCE TABLE ─────────────────────────────────────────────────────────

function ReferenceTable() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Band Skor Akhir</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Range Skor</TableHead>
                <TableHead>Keputusan</TableHead>
                <TableHead>Risk Tier</TableHead>
                <TableHead>Rekomendasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>85–100</TableCell>
                <TableCell>APPROVE</TableCell>
                <TableCell>Low Risk</TableCell>
                <TableCell>Lanjutkan ke analisis income & capacity</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>70–84</TableCell>
                <TableCell>APPROVE DENGAN SYARAT</TableCell>
                <TableCell>Moderate-Low Risk</TableCell>
                <TableCell>Minta dokumen pendukung tambahan</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>55–69</TableCell>
                <TableCell>MANUAL REVIEW</TableCell>
                <TableCell>Moderate Risk</TableCell>
                <TableCell>Review manual oleh analis senior</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>40–54</TableCell>
                <TableCell>LIKELY REJECT</TableCell>
                <TableCell>High Risk</TableCell>
                <TableCell>Rekomendasi tolak, bisa override</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>0–39</TableCell>
                <TableCell>REJECT</TableCell>
                <TableCell>Very High Risk</TableCell>
                <TableCell>Tolak. Data SLIK terlalu buruk.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Bobot Parameter</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Bobot</TableHead>
                <TableHead>Justifikasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>P1 — Kol Aktif Terburuk</TableCell>
                <TableCell>20%</TableCell>
                <TableCell>Kondisi saat ini paling relevan</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>P2 — Kol Historis Terburuk</TableCell>
                <TableCell>15%</TableCell>
                <TableCell>Track record historis jangka panjang</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>P3 — Hari Tunggakan Aktif</TableCell>
                <TableCell>20%</TableCell>
                <TableCell>Severity tunggakan saat ini</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>P4 — Hari Tunggakan Historis</TableCell>
                <TableCell>10%</TableCell>
                <TableCell>Severity tunggakan historis terburuk</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>P5 — Frekuensi Tunggakan</TableCell>
                <TableCell>10%</TableCell>
                <TableCell>Pola kebiasaan terlambat</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>P6 — % Fasilitas Bermasalah</TableCell>
                <TableCell>10%</TableCell>
                <TableCell>Breadth of default</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>P7 — Restrukturisasi</TableCell>
                <TableCell>5%</TableCell>
                <TableCell>Indikator distress keuangan</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>P8 — Tren 6 Bulan</TableCell>
                <TableCell>10%</TableCell>
                <TableCell>Forward-looking signal</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Limitasi Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>SLIK adalah backward-looking:</strong> Hanya menilai
            perilaku kredit masa lalu.
          </p>
          <p>
            <strong>Tidak ada income verification:</strong> DSR/DBR tidak bisa
            dihitung dari SLIK saja.
          </p>
          <p>
            <strong>Data bisa tidak update:</strong> Pelapor bisa terlambat
            update bulanan.
          </p>
          <p>
            <strong>Fraud & identity:</strong> Model tidak mendeteksi potensi
            fraud identitas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function Layer1Row({
  label,
  triggered,
}: {
  label: string
  triggered: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      {triggered ? (
        <Badge variant="destructive">TRIGGERED</Badge>
      ) : (
        <Badge variant="outline" className="text-green-600">
          OK
        </Badge>
      )}
    </div>
  )
}

function DecisionBadge({
  keputusan,
}: {
  keputusan: SlikAnalysisResult['keputusan']
}) {
  const styles: Record<string, string> = {
    APPROVE: 'bg-green-600 hover:bg-green-700',
    'APPROVE DENGAN SYARAT': 'bg-blue-600 hover:bg-blue-700',
    'MANUAL REVIEW': 'bg-amber-600 hover:bg-amber-700',
    'LIKELY REJECT': 'bg-orange-600 hover:bg-orange-700',
    REJECT: 'bg-red-600 hover:bg-red-700',
    'AUTO REJECT': 'bg-red-800 hover:bg-red-900',
    'CREDIT VIRGIN': 'bg-gray-500 hover:bg-gray-600',
  }
  return <Badge className={styles[keputusan] ?? ''}>{keputusan}</Badge>
}

// ─── PDF DATA EXTRACTION HELPER ──────────────────────────────────────────────

/** Extract a number from text like "Kol 1", "Kol 5", "1", "5" */
function parseKol(text: string): number {
  const match = text.match(/(\d)/)
  if (match) {
    const n = parseInt(match[1])
    if (n >= 1 && n <= 5) return n
  }
  return 1
}

/** Parse an integer from text, defaulting to 0 */
function parseIntSafe(text: string): number {
  const match = text.match(/(\d+)/)
  return match ? parseInt(match[1]) : 0
}

function parseKualitasHariPairs(values: string[]): {
  maxKol: number
  maxHari: number
} {
  const numbers = values
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .map((v) => Number.parseInt(v, 10))
    .filter((n) => !Number.isNaN(n))

  let maxKol = 1
  let maxHari = 0

  for (let i = 0; i < numbers.length; i += 2) {
    const kol = numbers[i]
    const hari = numbers[i + 1]

    if (kol >= 1 && kol <= 5 && kol > maxKol) {
      maxKol = kol
    }

    if (typeof hari === 'number' && hari >= 0 && hari > maxHari) {
      maxHari = hari
    }
  }

  return { maxKol, maxHari }
}

type FacilityStatus =
  | 'aktif'
  | 'dibatalkan'
  | 'lunas'
  | 'dihapusbukukan'
  | 'hapus_tagih'
  | 'lunas_agunan'
  | 'lunas_pengadilan'
  | 'dialihkan_pelapor'
  | 'dialihkan_fasilitas'
  | 'dialihkan_pihak_lain'
  | 'sekuritisasi_servicer'
  | 'sekuritisasi_non_servicer'
  | 'lunas_diskon'
  | 'diblokir'
  | 'other'

interface FacilityAccumulator {
  status: FacilityStatus
  worstKol: number
  maxHari: number
  frekTunggakan: number
  frekRestrukturisasi: number
  hasCaraRestrukturisasi: boolean
}

function getFacilityStatusFromKondisi(
  kondisiValueLower: string,
): FacilityStatus {
  if (
    kondisiValueLower.includes('fasilitas aktif') ||
    kondisiValueLower === 'aktif'
  )
    return 'aktif'
  if (kondisiValueLower.includes('dibatalkan')) return 'dibatalkan'
  if (kondisiValueLower.includes('hapus tagih')) return 'hapus_tagih'
  if (
    kondisiValueLower.includes('dihapusbukukan') ||
    kondisiValueLower.includes('dihapusbuku') ||
    kondisiValueLower.includes('hapus buku')
  )
    return 'dihapusbukukan'
  if (
    kondisiValueLower.includes('lunas karena pengambilalihan') ||
    kondisiValueLower.includes('lunas pengambilalihan agunan')
  )
    return 'lunas_agunan'
  if (
    kondisiValueLower.includes('lunas karena diselesaikan') ||
    kondisiValueLower.includes('melalui pengadilan')
  )
    return 'lunas_pengadilan'
  if (kondisiValueLower.includes('lunas dengan diskon')) return 'lunas_diskon'
  if (kondisiValueLower.includes('lunas')) return 'lunas'
  if (
    kondisiValueLower.includes('dialihkan ke pelapor') ||
    kondisiValueLower.includes('dialihkan ke pelapor lain') ||
    kondisiValueLower.includes('ke pelapor lain') ||
    kondisiValueLower.includes('dijual ke pelapor')
  )
    return 'dialihkan_pelapor'
  if (
    kondisiValueLower.includes('dialihkan ke fasilitas') ||
    kondisiValueLower.includes('dialihkan ke fasilitas lain')
  )
    return 'dialihkan_fasilitas'
  if (
    kondisiValueLower.includes('dialihkan/dijual') ||
    kondisiValueLower.includes('dijual kepada pihak lain') ||
    kondisiValueLower.includes('non pelapor')
  )
    return 'dialihkan_pihak_lain'
  if (kondisiValueLower.includes('dialihkan')) return 'dialihkan_pihak_lain'
  if (
    kondisiValueLower.includes('disekuritisasi') &&
    kondisiValueLower.includes('tidak sebagai servicer')
  )
    return 'sekuritisasi_non_servicer'
  if (
    kondisiValueLower.includes('disekuritisasi') &&
    kondisiValueLower.includes('sebagai servicer')
  )
    return 'sekuritisasi_servicer'
  if (kondisiValueLower.includes('disekuritisasi'))
    return 'sekuritisasi_servicer'
  if (kondisiValueLower.includes('diblokir')) return 'diblokir'
  return 'other'
}

function extractInputFromPdf(
  tables: SlikAnalysisProps['tables'],
  rawText: string,
): SlikInputData {
  const input = { ...DEFAULT_INPUT }

  // Known field labels that should NOT be captured as identity values
  const FIELD_LABELS = [
    'jenis kelamin',
    'no. identitas',
    'npwp',
    'tempat lahir',
    'tanggal lahir',
    'alamat',
    'kode pos',
    'telepon',
    'status perkawinan',
    'kode ref',
  ]

  function isFieldLabel(text: string): boolean {
    const lower = text.toLowerCase()
    return FIELD_LABELS.some((label) => lower.includes(label))
  }

  function isValidNama(value: string): boolean {
    const cleaned = value.trim()
    if (!cleaned || cleaned.length < 3) return false
    if (isFieldLabel(cleaned)) return false
    if (/\d/.test(cleaned)) return false
    if (cleaned.includes('/')) return false
    if (/^(nama|identitas)$/i.test(cleaned)) return false
    return /^[A-Za-z .'-]+$/.test(cleaned)
  }

  // ─── EXTRACT IDENTITY FROM TABLES FIRST (most reliable) ───
  for (const table of tables) {
    for (const row of table.rows) {
      const entries = Object.entries(row)
      if (entries.length < 2) continue

      const fieldKey = entries[0][1].trim().toLowerCase()
      const fieldValue = entries[1][1].trim()
      const allValues = entries
        .map(([, value]) => value.trim())
        .filter((value) => value.length > 0)

      // Pattern row: [IRMA WATI, NIK /, PEREMPUAN /, ...]
      if (!input.namaDebitur && allValues.length >= 2) {
        const first = allValues[0]
        const second = allValues[1].toLowerCase()
        if (isValidNama(first) && second.startsWith('nik')) {
          input.namaDebitur = first
        }
      }

      // Pattern row: "Nomor Laporan ... /IDEB/... | ..."
      if (!input.nomorLaporanSlik && allValues.length > 0) {
        const joined = allValues.join(' ')
        const laporanFromRow = joined.match(/(\d+\/IDEB\/[^\s|]+)/i)
        if (laporanFromRow) {
          input.nomorLaporanSlik = laporanFromRow[1]
        }
      }

      if (!fieldValue || fieldValue === '-' || fieldValue === '—') continue

      // Name
      if (
        (fieldKey === 'nama' ||
          fieldKey.includes('nama debitur') ||
          fieldKey.includes('nama lengkap')) &&
        !fieldKey.includes('npwp') &&
        isValidNama(fieldValue) &&
        !input.namaDebitur
      ) {
        input.namaDebitur = fieldValue
      }

      // NIK
      if (
        (fieldKey.includes('nik') ||
          fieldKey.includes('no. identitas') ||
          fieldKey.includes('identitas')) &&
        /\d{10,16}/.test(fieldValue) &&
        !input.nik
      ) {
        const nikDigits = fieldValue.match(/(\d{10,16})/)
        if (nikDigits) input.nik = nikDigits[1]
      }

      // Nomor Laporan
      if (
        fieldKey.includes('laporan') ||
        fieldKey.includes('nomor permintaan')
      ) {
        const laporanFromValue = fieldValue.match(/(\d+\/IDEB\/[^\s|]+)/i)
        if (!input.nomorLaporanSlik && laporanFromValue) {
          input.nomorLaporanSlik = laporanFromValue[1]
        }

        if (!input.nomorLaporanSlik) {
          const laporanFromKey = fieldKey.match(/(\d+\/ideb\/[^\s|]+)/i)
          if (laporanFromKey) {
            input.nomorLaporanSlik = laporanFromKey[1].toUpperCase()
          }
        }
      }
    }
  }

  // ─── EXTRACT IDENTITY FROM RAW TEXT (fallback) ───

  if (!input.namaDebitur) {
    const namaDariDataPokok = rawText.match(
      /Nama\s+Sesuai\s+Identitas[\s\S]{0,180}?\n\s*([A-Z][A-Z\s.'-]{2,})\s+NIK\s*\//i,
    )
    if (namaDariDataPokok && isValidNama(namaDariDataPokok[1])) {
      input.namaDebitur = namaDariDataPokok[1].trim()
    }
  }

  // Name: try multi-line pattern first (label on one line, value on next)
  if (!input.namaDebitur) {
    const namaMultiline = rawText.match(
      /Nama\s*(?:Debitur|Lengkap)?\s*\n+\s*([^\n]+)/i,
    )
    if (namaMultiline && !isFieldLabel(namaMultiline[1])) {
      const cleaned = namaMultiline[1].replace(/\d+\/IDEB\/[^\s]*/gi, '').trim()
      if (isValidNama(cleaned)) input.namaDebitur = cleaned
    }
  }

  // Name: same-line but strip known field labels
  if (!input.namaDebitur) {
    const namaSameLine = rawText.match(
      /Nama\s*(?:Debitur|Lengkap)?\s*[:-]?\s*([^\n]+)/i,
    )
    if (namaSameLine) {
      let captured = namaSameLine[1].trim()
      for (const label of FIELD_LABELS) {
        const idx = captured.toLowerCase().indexOf(label)
        if (idx > 0) captured = captured.substring(0, idx).trim()
        else if (idx === 0) captured = ''
      }
      captured = captured.replace(/\d+\/IDEB\/[^\s]*/gi, '').trim()
      if (isValidNama(captured)) input.namaDebitur = captured
    }
  }

  // NIK
  if (!input.nik) {
    const nikMatch = rawText.match(
      /(?:NIK|No\.?\s*(?:Identitas|KTP))\s*[:-]?\s*(\d{10,16})/i,
    )
    if (nikMatch) input.nik = nikMatch[1]

    // Fallback: standalone 16-digit number
    if (!input.nik) {
      const nik16 = rawText.match(/\b(\d{16})\b/)
      if (nik16) input.nik = nik16[1]
    }
  }

  // SLIK report number — format like 42472/IDEB/...
  if (!input.nomorLaporanSlik) {
    const laporanMatch = rawText.match(/(\d+\/IDEB\/[^\s\n]+)/i)
    if (laporanMatch) input.nomorLaporanSlik = laporanMatch[1]
  }

  // Date — look for common SLIK date patterns
  if (!input.tanggalDataSlik) {
    const tanggalMatch = rawText.match(
      /(?:Posisi|Tanggal)\s*(?:Data)?\s*(?:Terakhir|SLIK)?\s*[:-]?\s*(\d{1,2}[\s/-]\w+[\s/-]\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i,
    )
    if (tanggalMatch) {
      input.tanggalDataSlik = tanggalMatch[1].trim()
    } else {
      const dateMatch = rawText.match(
        /(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4})/i,
      )
      if (dateMatch) input.tanggalDataSlik = dateMatch[1]
    }
  }

  // ─── FACILITY COUNTS from raw text ───
  // Look for patterns like "Jumlah Fasilitas: 4" or count occurrences

  // Count facility statuses from text
  const fasilitasAktifMatches = rawText.match(
    /(?:status|kondisi)\s*[:-]?\s*aktif/gi,
  )
  const fasilitasLunasMatches = rawText.match(
    /(?:status|kondisi)\s*[:-]?\s*lunas/gi,
  )
  const fasilitasHapusMatches = rawText.match(
    /(?:status|kondisi)\s*[:-]?\s*(?:dihapus|hapus\s*buku)/gi,
  )

  // ─── EXTRACT FROM TABLES ───
  let totalFasilitas = 0
  let fasilitasAktif = 0
  let fasilitasDibatalkan = 0
  let fasilitasLunas = 0
  let fasilitasDihapusbukukan = 0
  let fasilitasHapusTagih = 0
  let fasilitasLunasAgunan = 0
  let fasilitasLunasPengadilan = 0
  let fasilitasDialihkanPelapor = 0
  let fasilitasDialihkanFasilitas = 0
  let fasilitasDialihkanPihakLain = 0
  let fasilitasSekuritisasiServicer = 0
  let fasilitasSekuritisasiNonServicer = 0
  let fasilitasLunasDiskon = 0
  let fasilitasDiblokir = 0
  let kolTerburukAktif = 1
  let kolTerburukHistoris = 1
  let hariTunggakanAktifMax = 0
  let hariTunggakanHistorisMax = 0
  let totalFrekuensiTunggakan = 0
  let totalRestrukturisasi = 0
  let jumlahFasilitasPernahKol2Plus = 0
  let jumlahFasilitasRestrukturisasi = 0
  const facilities: FacilityAccumulator[] = []

  // Institution code pattern: "014 - PT Bank...", "252897 - PT BCA..."
  const institutionPattern = /^\d{2,6}\s*[-–]\s+/

  for (const table of tables) {
    let inKualitasHariSection = false
    let currentFacility: FacilityAccumulator | null = null

    for (const row of table.rows) {
      const rawValues = Object.values(row).map((v) => v.trim())
      const allValues = Object.values(row).map((v) => v.toLowerCase().trim())
      const firstCell = allValues[0] ?? ''

      // ─── DETECT FACILITY START: institution name row ───
      // Pattern: "014 - PT Bank Central Asia Tbk" with "Rp X" in same row
      const isInstitutionRow =
        institutionPattern.test(rawValues[0]) &&
        rawValues.some((v) => /^Rp\s/i.test(v.trim()))

      if (isInstitutionRow) {
        // Start a new facility (status will be updated when Kondisi is found)
        currentFacility = {
          status: 'other',
          worstKol: 1,
          maxHari: 0,
          frekTunggakan: 0,
          frekRestrukturisasi: 0,
          hasCaraRestrukturisasi: false,
        }
        facilities.push(currentFacility)
      }

      // ─── DETECT KONDISI: update current facility status ───
      const kondisiLabelIndex = allValues.findIndex(
        (v) => v === 'kondisi' || v.startsWith('kondisi'),
      )
      if (kondisiLabelIndex >= 0) {
        const kondisiValue = rawValues
          .slice(kondisiLabelIndex + 1)
          .find((v) => v.trim().length > 0)
        const kondisiValueLower = kondisiValue?.toLowerCase().trim() ?? ''

        if (kondisiValueLower.length > 0 && currentFacility) {
          currentFacility.status =
            getFacilityStatusFromKondisi(kondisiValueLower)
        }
      }

      // ─── TRACK KUALITAS/HARI SECTION ───
      if (firstCell.includes('kualitas / jumlah hari')) {
        inKualitasHariSection = true
      }

      if (
        firstCell.includes('no rekening') ||
        firstCell.includes('sifat kredit') ||
        firstCell.includes('jenis kredit')
      ) {
        inKualitasHariSection = false
      }

      // ─── EXTRACT FIELDS BY SCANNING CELL VALUES ───
      // (Column headers are generic "Kolom N", so we scan values)
      for (let i = 0; i < rawValues.length; i++) {
        const cellLower = rawValues[i].toLowerCase().trim()
        const nextValue = rawValues
          .slice(i + 1)
          .find((v) => v.trim().length > 0)

        // "Frekuensi Tunggakan" | "0"
        if (cellLower === 'frekuensi tunggakan' && nextValue) {
          const freq = parseIntSafe(nextValue)
          if (currentFacility) {
            currentFacility.frekTunggakan += freq
          }
        }

        // "Frekuensi Restrukturisasi" | "0"
        if (cellLower === 'frekuensi restrukturisasi' && nextValue) {
          const restruk = parseIntSafe(nextValue)
          if (restruk > 0 && currentFacility) {
            currentFacility.frekRestrukturisasi += restruk
          }
        }

        // "Jumlah Hari Tunggakan" | "0"
        if (cellLower === 'jumlah hari tunggakan' && nextValue) {
          const hari = parseIntSafe(nextValue)
          if (currentFacility && hari > currentFacility.maxHari) {
            currentFacility.maxHari = hari
          }
        }
      }

      // ─── PARSE TIMELINE ROW: "Tunggakan 2 64 2 63 ..." ───
      if (firstCell === 'tunggakan') {
        const timelineValues = allValues.slice(1)
        // Only parse if there are actual numeric values
        const hasData = timelineValues.some(
          (v) => v.length > 0 && /^\d+$/.test(v),
        )
        if (hasData) {
          const { maxKol, maxHari } = parseKualitasHariPairs(timelineValues)

          if (currentFacility) {
            if (maxKol > currentFacility.worstKol) {
              currentFacility.worstKol = maxKol
            }
            if (maxHari > currentFacility.maxHari) {
              currentFacility.maxHari = maxHari
            }
          }
        }
      }

      // ─── PARSE CONTINUATION NUMERIC ROW ───
      // e.g. "1 0 1 0 1 0 ..." where kol/day pairs continue without label
      const continuationCells = allValues.filter((v) => v.length > 0)
      const isNumericContinuationRow =
        inKualitasHariSection &&
        continuationCells.length >= 4 &&
        continuationCells.every((v) => /^\d+$/.test(v))

      if (isNumericContinuationRow) {
        const { maxKol, maxHari } = parseKualitasHariPairs(continuationCells)

        if (currentFacility) {
          if (maxKol > currentFacility.worstKol) {
            currentFacility.worstKol = maxKol
          }
          if (maxHari > currentFacility.maxHari) {
            currentFacility.maxHari = maxHari
          }
        }
      }

      // ─── PARSE RESTRUKTURISASI METHOD ROW ───
      const caraRestrukIndex = allValues.findIndex((value) =>
        value.includes('cara restrukturisasi'),
      )

      if (caraRestrukIndex >= 0) {
        const caraRestrukValue = rawValues
          .slice(caraRestrukIndex + 1)
          .find((value) => {
            const normalized = value.trim().toLowerCase()
            return (
              normalized.length > 0 &&
              normalized !== '-' &&
              normalized !== 'null'
            )
          })

        if (caraRestrukValue && currentFacility) {
          currentFacility.hasCaraRestrukturisasi = true
        }
      }
    }
  }

  // Recompute main aggregates from per-facility parsing if available.
  if (facilities.length > 0) {
    totalFasilitas = facilities.length
    fasilitasAktif = facilities.filter((f) => f.status === 'aktif').length
    fasilitasDibatalkan = facilities.filter(
      (f) => f.status === 'dibatalkan',
    ).length
    fasilitasLunas = facilities.filter((f) => f.status === 'lunas').length
    fasilitasDihapusbukukan = facilities.filter(
      (f) => f.status === 'dihapusbukukan',
    ).length
    fasilitasHapusTagih = facilities.filter(
      (f) => f.status === 'hapus_tagih',
    ).length
    fasilitasLunasAgunan = facilities.filter(
      (f) => f.status === 'lunas_agunan',
    ).length
    fasilitasLunasPengadilan = facilities.filter(
      (f) => f.status === 'lunas_pengadilan',
    ).length
    fasilitasDialihkanPelapor = facilities.filter(
      (f) => f.status === 'dialihkan_pelapor',
    ).length
    fasilitasDialihkanFasilitas = facilities.filter(
      (f) => f.status === 'dialihkan_fasilitas',
    ).length
    fasilitasDialihkanPihakLain = facilities.filter(
      (f) => f.status === 'dialihkan_pihak_lain',
    ).length
    fasilitasSekuritisasiServicer = facilities.filter(
      (f) => f.status === 'sekuritisasi_servicer',
    ).length
    fasilitasSekuritisasiNonServicer = facilities.filter(
      (f) => f.status === 'sekuritisasi_non_servicer',
    ).length
    fasilitasLunasDiskon = facilities.filter(
      (f) => f.status === 'lunas_diskon',
    ).length
    fasilitasDiblokir = facilities.filter((f) => f.status === 'diblokir').length

    kolTerburukHistoris = Math.max(1, ...facilities.map((f) => f.worstKol))
    kolTerburukAktif = Math.max(
      1,
      ...facilities.filter((f) => f.status === 'aktif').map((f) => f.worstKol),
    )

    hariTunggakanHistorisMax = Math.max(0, ...facilities.map((f) => f.maxHari))
    hariTunggakanAktifMax = Math.max(
      0,
      ...facilities.filter((f) => f.status === 'aktif').map((f) => f.maxHari),
    )

    totalFrekuensiTunggakan = facilities.reduce(
      (sum, f) => sum + f.frekTunggakan,
      0,
    )

    const restrukPerFacility = facilities.map((f) => {
      const byFrekuensi = Math.max(0, f.frekRestrukturisasi)
      const byCara = f.hasCaraRestrukturisasi ? 1 : 0
      return Math.max(byFrekuensi, byCara)
    })

    totalRestrukturisasi = restrukPerFacility.reduce((sum, n) => sum + n, 0)
    jumlahFasilitasRestrukturisasi = restrukPerFacility.filter(
      (n) => n > 0,
    ).length
    jumlahFasilitasPernahKol2Plus = facilities.filter(
      (f) => f.worstKol >= 2,
    ).length
  }

  // If tables didn't yield facility counts, try from text match counts
  if (totalFasilitas === 0) {
    fasilitasAktif = fasilitasAktifMatches?.length ?? 0
    fasilitasLunas = fasilitasLunasMatches?.length ?? 0
    fasilitasDihapusbukukan = fasilitasHapusMatches?.length ?? 0
    totalFasilitas = fasilitasAktif + fasilitasLunas + fasilitasDihapusbukukan

    // Also try raw text parsing for facility count
    const totalFasMatch = rawText.match(
      /(?:total|jumlah)\s*fasilitas\s*[:-]?\s*(\d+)/i,
    )
    if (totalFasMatch) totalFasilitas = parseInt(totalFasMatch[1])
  }

  // Parse kolektibilitas from raw text if not found in tables
  if (kolTerburukHistoris === 1) {
    // Look for patterns like "Kualitas: 5" or "Kolektibilitas: Kol 5"
    const kolMatches = rawText.match(
      /(?:kualitas|kolektibilitas)\s*[:-]?\s*(?:kol\s*)?(\d)/gi,
    )
    if (kolMatches) {
      for (const m of kolMatches) {
        const num = parseKol(m)
        if (num > kolTerburukHistoris) kolTerburukHistoris = num
      }
    }
  }

  // Determine ada Kol 5 / Kol 4 aktif based on parsed data
  const adaKol5Aktif = kolTerburukAktif >= 5
  const adaKol4Aktif = kolTerburukAktif >= 4

  // Write-off: if there are hapus buku or hapus tagih facilities, assume within 3 years unless we can parse dates
  const adaWriteOff3Tahun =
    fasilitasDihapusbukukan > 0 || fasilitasHapusTagih > 0

  // Determine trend based on kolektibilitas aktif
  let trenKolektibilitas6Bulan: 1 | 2 | 3 | 4 | 5 = 1
  if (kolTerburukAktif >= 5) trenKolektibilitas6Bulan = 5
  else if (kolTerburukAktif >= 3) trenKolektibilitas6Bulan = 4
  else if (kolTerburukAktif === 2) trenKolektibilitas6Bulan = 3
  else if (kolTerburukHistoris >= 2 && kolTerburukAktif === 1)
    trenKolektibilitas6Bulan = 2
  else trenKolektibilitas6Bulan = 1

  // Apply all parsed values
  input.totalFasilitas = totalFasilitas
  input.jumlahFasilitasAktif = fasilitasAktif
  input.jumlahFasilitasDibatalkan = fasilitasDibatalkan
  input.jumlahFasilitasLunas = fasilitasLunas
  input.jumlahFasilitasDihapusbukukan = fasilitasDihapusbukukan
  input.jumlahFasilitasHapusTagih = fasilitasHapusTagih
  input.jumlahFasilitasLunasAgunan = fasilitasLunasAgunan
  input.jumlahFasilitasLunasPengadilan = fasilitasLunasPengadilan
  input.jumlahFasilitasDialihkanPelapor = fasilitasDialihkanPelapor
  input.jumlahFasilitasDialihkanFasilitas = fasilitasDialihkanFasilitas
  input.jumlahFasilitasDialihkanPihakLain = fasilitasDialihkanPihakLain
  input.jumlahFasilitasSekuritisasiServicer = fasilitasSekuritisasiServicer
  input.jumlahFasilitasSekuritisasiNonServicer =
    fasilitasSekuritisasiNonServicer
  input.jumlahFasilitasLunasDiskon = fasilitasLunasDiskon
  input.jumlahFasilitasDiblokir = fasilitasDiblokir
  input.jumlahFasilitasRestrukturisasi = jumlahFasilitasRestrukturisasi
  input.totalFrekuensiRestrukturisasi = totalRestrukturisasi
  input.kolTerburukAktif = (kolTerburukAktif <= 5 ? kolTerburukAktif : 5) as
    | 1
    | 2
    | 3
    | 4
    | 5
  input.kolTerburukHistoris = (
    kolTerburukHistoris <= 5 ? kolTerburukHistoris : 5
  ) as 1 | 2 | 3 | 4 | 5
  input.adaKol5Aktif = adaKol5Aktif
  input.adaKol4Aktif = adaKol4Aktif
  input.hariTunggakanAktifMax = hariTunggakanAktifMax
  input.hariTunggakanHistorisMax = hariTunggakanHistorisMax
  input.totalFrekuensiTunggakan = totalFrekuensiTunggakan
  input.jumlahFasilitasPernahKol2Plus = Math.min(
    jumlahFasilitasPernahKol2Plus,
    input.totalFasilitas,
  )
  input.trenKolektibilitas6Bulan = trenKolektibilitas6Bulan
  input.adaWriteOff3Tahun = adaWriteOff3Tahun

  return input
}
