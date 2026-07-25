export interface Tanah {
  id: string;
  nomorSertifikat: string;
  nomorSuratUkur?: string;
  luas: number; // dalam m2
  lokasi: string;
  lat?: number;
  long?: number;
  pemilikSaatIni: string;
  parentTanahId?: string | null; // merujuk bidang induk jika hasil pecah lahan
  sourceRiwayatId?: string | null; // merujuk riwayat "pecah-lahan" yang membuat bidang ini (guard §11.1)
  createdAt?: unknown;
}

export interface TanahFormInput {
  nomorSertifikat: string;
  nomorSuratUkur?: string;
  luas: number;
  lokasi: string;
  lat?: number;
  long?: number;
  pemilikSaatIni: string;
  parentTanahId?: string | null;
  sourceRiwayatId?: string | null;
}
