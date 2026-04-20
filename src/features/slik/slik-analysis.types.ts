/** Input data yang diambil dari PDF SLIK OJK */
export interface SlikInputData {
  // A. Identitas Debitur
  namaDebitur: string
  nik: string
  tanggalDataSlik: string
  nomorLaporanSlik: string

  // B. Ringkasan Fasilitas
  totalFasilitas: number
  jumlahFasilitasAktif: number
  jumlahFasilitasDibatalkan: number
  jumlahFasilitasLunas: number
  jumlahFasilitasDihapusbukukan: number
  jumlahFasilitasHapusTagih: number
  jumlahFasilitasLunasAgunan: number
  jumlahFasilitasLunasPengadilan: number
  jumlahFasilitasDialihkanPelapor: number
  jumlahFasilitasDialihkanFasilitas: number
  jumlahFasilitasDialihkanPihakLain: number
  jumlahFasilitasSekuritisasiServicer: number
  jumlahFasilitasSekuritisasiNonServicer: number
  jumlahFasilitasLunasDiskon: number
  jumlahFasilitasDiblokir: number
  jumlahFasilitasRestrukturisasi: number
  totalFrekuensiRestrukturisasi: number

  // C. Kolektibilitas
  kolTerburukAktif: number // 1-5
  kolTerburukHistoris: number // 1-5
  adaKol5Aktif: boolean
  adaKol4Aktif: boolean

  // D. Hari Tunggakan
  hariTunggakanAktifMax: number
  hariTunggakanHistorisMax: number

  // E. Frekuensi Tunggakan
  totalFrekuensiTunggakan: number
  jumlahFasilitasPernahKol2Plus: number

  // F. Tren 6 Bulan Terakhir
  trenKolektibilitas6Bulan: 1 | 2 | 3 | 4 | 5

  // G. Write-Off Timing
  adaWriteOff3Tahun: boolean
}

/** Hasil Layer 1 Hard Disqualifier */
export interface Layer1Result {
  l1a_kol5Aktif: boolean
  l1b_writeOff3Tahun: boolean
  l1c_kol4Aktif: boolean
  l1d_tunggakanAktif90Hari: boolean
  triggered: boolean
}

/** Skor per parameter di Layer 2 */
export interface ParameterScore {
  parameter: string
  label: string
  nilaiInput: string
  skorRaw: number
  bobot: number
  skorBerbobot: number
}

/** Hasil akhir analisis SLIK */
export interface SlikAnalysisResult {
  // Layer 0
  isCreditVirgin: boolean

  // Layer 1
  layer1: Layer1Result

  // Layer 2
  parameters: ParameterScore[]
  totalSkor: number
  scoreBand: string
  riskTier: string
  keputusan:
    | 'APPROVE'
    | 'APPROVE DENGAN SYARAT'
    | 'MANUAL REVIEW'
    | 'LIKELY REJECT'
    | 'REJECT'
    | 'CREDIT VIRGIN'
    | 'AUTO REJECT'
  rekomendasiTindakan: string

  // Input reference
  input: SlikInputData
}
