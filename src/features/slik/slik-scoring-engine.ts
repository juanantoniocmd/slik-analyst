import type {
  Layer1Result,
  ParameterScore,
  SlikAnalysisResult,
  SlikInputData,
} from './slik-analysis.types'

// ─── LOOKUP TABLES ───────────────────────────────────────────────────────────

/** P1 — Kol Aktif Terburuk (Bobot: 20%) */
function scoreP1(kol: number): number {
  switch (kol) {
    case 1:
      return 100
    case 2:
      return 70
    case 3:
      return 40
    case 4:
      return 10
    case 5:
      return 0
    default:
      return 0
  }
}

/** P2 — Kol Historis Terburuk (Bobot: 15%) */
function scoreP2(kol: number): number {
  switch (kol) {
    case 1:
      return 100
    case 2:
      return 80
    case 3:
      return 50
    case 4:
      return 20
    case 5:
      return 5
    default:
      return 0
  }
}

/** P3 — Hari Tunggakan Aktif Max (Bobot: 20%) */
function scoreP3(hari: number): number {
  if (hari === 0) return 100
  if (hari <= 30) return 85
  if (hari <= 60) return 65
  if (hari <= 90) return 40
  return 0 // >90 caught by Layer 1
}

/** P4 — Hari Tunggakan Historis Max (Bobot: 10%) */
function scoreP4(hari: number): number {
  if (hari === 0) return 100
  if (hari <= 30) return 85
  if (hari <= 90) return 65
  if (hari <= 180) return 40
  if (hari <= 365) return 20
  return 5
}

/** P5 — Frekuensi Tunggakan Total (Bobot: 10%) */
function scoreP5(frekuensi: number): number {
  if (frekuensi === 0) return 100
  if (frekuensi <= 2) return 85
  if (frekuensi <= 5) return 65
  if (frekuensi <= 10) return 40
  if (frekuensi <= 20) return 20
  return 5
}

/** P6 — % Fasilitas Bermasalah (Bobot: 10%) */
function scoreP6(persen: number): number {
  if (persen === 0) return 100
  if (persen <= 10) return 80
  if (persen <= 25) return 60
  if (persen <= 50) return 35
  if (persen <= 75) return 15
  return 5
}

/** P7 — Total Frekuensi Restrukturisasi (Bobot: 5%) */
function scoreP7(jumlah: number): number {
  if (jumlah === 0) return 100
  if (jumlah === 1) return 70
  if (jumlah === 2) return 45
  if (jumlah === 3) return 25
  return 10 // >= 4
}

/** P8 — Tren 6 Bulan Terakhir (Bobot: 10%) */
function scoreP8(tren: number): number {
  switch (tren) {
    case 1:
      return 100
    case 2:
      return 75
    case 3:
      return 50
    case 4:
      return 20
    case 5:
      return 0
    default:
      return 0
  }
}

// ─── SCORE BAND ──────────────────────────────────────────────────────────────

function getScoreBand(skor: number): {
  keputusan: SlikAnalysisResult['keputusan']
  scoreBand: string
  riskTier: string
  rekomendasiTindakan: string
} {
  if (skor >= 85) {
    return {
      keputusan: 'APPROVE',
      scoreBand: '85-100: LOW RISK',
      riskTier: 'Low Risk',
      rekomendasiTindakan: 'Lanjutkan ke analisis income & capacity',
    }
  }
  if (skor >= 70) {
    return {
      keputusan: 'APPROVE DENGAN SYARAT',
      scoreBand: '70-84: MODERATE-LOW RISK',
      riskTier: 'Moderate-Low Risk',
      rekomendasiTindakan:
        'Minta dokumen pendukung tambahan, pertimbangkan syarat tertentu',
    }
  }
  if (skor >= 55) {
    return {
      keputusan: 'MANUAL REVIEW',
      scoreBand: '55-69: MODERATE RISK',
      riskTier: 'Moderate Risk',
      rekomendasiTindakan: 'Review manual oleh analis kredit senior',
    }
  }
  if (skor >= 40) {
    return {
      keputusan: 'LIKELY REJECT',
      scoreBand: '40-54: HIGH RISK',
      riskTier: 'High Risk',
      rekomendasiTindakan:
        'Rekomendasi tolak, bisa override dengan justifikasi kuat',
    }
  }
  return {
    keputusan: 'REJECT',
    scoreBand: '0-39: VERY HIGH RISK',
    riskTier: 'Very High Risk',
    rekomendasiTindakan: 'Tolak. Data SLIK terlalu buruk.',
  }
}

// ─── MAIN ANALYSIS FUNCTION ─────────────────────────────────────────────────

export function analyzeSlik(input: SlikInputData): SlikAnalysisResult {
  // Layer 0: Credit Virgin Detection
  if (input.totalFasilitas === 0) {
    return {
      isCreditVirgin: true,
      layer1: {
        l1a_kol5Aktif: false,
        l1b_writeOff3Tahun: false,
        l1c_kol4Aktif: false,
        l1d_tunggakanAktif90Hari: false,
        triggered: false,
      },
      parameters: [],
      totalSkor: 0,
      scoreBand: 'N/A',
      riskTier: 'Unassessable',
      keputusan: 'CREDIT VIRGIN',
      rekomendasiTindakan: 'Tidak ada data SLIK. Verifikasi alternatif wajib.',
      input,
    }
  }

  // Layer 1: Hard Disqualifiers
  const layer1: Layer1Result = {
    l1a_kol5Aktif: input.adaKol5Aktif,
    l1b_writeOff3Tahun: input.adaWriteOff3Tahun,
    l1c_kol4Aktif: input.adaKol4Aktif,
    l1d_tunggakanAktif90Hari: input.hariTunggakanAktifMax > 90,
    triggered: false,
  }
  layer1.triggered =
    layer1.l1a_kol5Aktif ||
    layer1.l1b_writeOff3Tahun ||
    layer1.l1c_kol4Aktif ||
    layer1.l1d_tunggakanAktif90Hari

  // Layer 2: Scored Parameters
  const jumlahFasilitasBermasalah = Math.min(
    Math.max(input.jumlahFasilitasPernahKol2Plus, 0),
    input.totalFasilitas,
  )

  const persenBermasalah =
    input.totalFasilitas > 0
      ? Math.min(
          100,
          Math.max(0, (jumlahFasilitasBermasalah / input.totalFasilitas) * 100),
        )
      : 0

  const parameters: ParameterScore[] = [
    {
      parameter: 'P1',
      label: 'Kol Aktif Terburuk',
      nilaiInput: `Kol ${input.kolTerburukAktif}`,
      skorRaw: scoreP1(input.kolTerburukAktif),
      bobot: 20,
      skorBerbobot: 0,
    },
    {
      parameter: 'P2',
      label: 'Kol Historis Terburuk',
      nilaiInput: `Kol ${input.kolTerburukHistoris}`,
      skorRaw: scoreP2(input.kolTerburukHistoris),
      bobot: 15,
      skorBerbobot: 0,
    },
    {
      parameter: 'P3',
      label: 'Hari Tunggakan Aktif Max',
      nilaiInput: `${input.hariTunggakanAktifMax} hari`,
      skorRaw: scoreP3(input.hariTunggakanAktifMax),
      bobot: 20,
      skorBerbobot: 0,
    },
    {
      parameter: 'P4',
      label: 'Hari Tunggakan Historis Max',
      nilaiInput: `${input.hariTunggakanHistorisMax} hari`,
      skorRaw: scoreP4(input.hariTunggakanHistorisMax),
      bobot: 10,
      skorBerbobot: 0,
    },
    {
      parameter: 'P5',
      label: 'Frekuensi Tunggakan Total',
      nilaiInput: `${input.totalFrekuensiTunggakan} kali`,
      skorRaw: scoreP5(input.totalFrekuensiTunggakan),
      bobot: 10,
      skorBerbobot: 0,
    },
    {
      parameter: 'P6',
      label: '% Fasilitas Bermasalah',
      nilaiInput: `${persenBermasalah.toFixed(1)}%`,
      skorRaw: scoreP6(persenBermasalah),
      bobot: 10,
      skorBerbobot: 0,
    },
    {
      parameter: 'P7',
      label: 'Total Frekuensi Restrukturisasi',
      nilaiInput: `${input.totalFrekuensiRestrukturisasi} kali`,
      skorRaw: scoreP7(input.totalFrekuensiRestrukturisasi),
      bobot: 5,
      skorBerbobot: 0,
    },
    {
      parameter: 'P8',
      label: 'Tren 6 Bulan Terakhir',
      nilaiInput: getTrenLabel(input.trenKolektibilitas6Bulan),
      skorRaw: scoreP8(input.trenKolektibilitas6Bulan),
      bobot: 10,
      skorBerbobot: 0,
    },
  ]

  // Calculate weighted scores
  for (const p of parameters) {
    p.skorBerbobot = Math.round(((p.skorRaw * p.bobot) / 100) * 100) / 100
  }

  const totalSkor =
    Math.round(parameters.reduce((sum, p) => sum + p.skorBerbobot, 0) * 10) / 10
  const band = getScoreBand(totalSkor)

  const isAutoReject = layer1.triggered

  return {
    isCreditVirgin: false,
    layer1,
    parameters,
    totalSkor,
    scoreBand: isAutoReject ? `AUTO REJECT (Layer 1) | ${band.scoreBand}` : band.scoreBand,
    riskTier: isAutoReject ? 'Disqualified' : band.riskTier,
    keputusan: isAutoReject ? 'AUTO REJECT' : band.keputusan,
    rekomendasiTindakan: isAutoReject
      ? 'Auto reject karena trigger Layer 1. Skor Layer 2 ditampilkan sebagai referensi internal.'
      : band.rekomendasiTindakan,
    input,
  }
}

function getTrenLabel(tren: number): string {
  switch (tren) {
    case 1:
      return 'Konsisten Lancar'
    case 2:
      return 'Membaik'
    case 3:
      return 'Stabil DPK'
    case 4:
      return 'Memburuk'
    case 5:
      return 'Kol 5 Aktif'
    default:
      return '-'
  }
}
