export interface Tanah {
  id: string;
  nomorSertifikat: string;
  tanggalTerbitSertifikat?: string; // format YYYY-MM-DD
  nomorSuratUkur?: string;
  tanggalUkur?: string; // format YYYY-MM-DD
  petugasUkur?: string;
  panjang?: number; // meter, opsional — dipakai untuk hitung otomatis luas
  lebar?: number; // meter, opsional
  luas: number; // dalam m2 (otomatis dari panjang x lebar, atau isi manual)
  lokasi: string;
  googleMapsLink?: string; // link/koordinat yang dipakai untuk isi lat/long
  lat?: number;
  long?: number;
  pemilikSaatIni: string;

  // --- Relasi silsilah: PECAH LAHAN (1 induk -> banyak anak) ---
  parentTanahId?: string | null; // merujuk bidang induk jika hasil pecah lahan
  sourceRiwayatId?: string | null; // merujuk riwayat "pecah-lahan" yang membuat bidang ini (guard §11.1)

  // --- Relasi silsilah: PENYATUAN LAHAN (banyak sumber -> 1 bidang gabungan) ---
  parentTanahIds?: string[]; // daftar bidang SUMBER jika bidang ini hasil penyatuan
  sourceRiwayatIds?: string[]; // daftar riwayat "penyatuan-lahan" yang membuat bidang ini

  // Status arsip: bidang yang sudah dijadikan sumber penyatuan TIDAK DIHAPUS,
  // hanya ditandai non-aktif supaya penelusuran silsilah pemilik tetap utuh selamanya.
  statusGabung?: 'aktif' | 'sudah-digabung';
  mergedIntoTanahId?: string; // merujuk bidang gabungan hasil akhir, jika statusGabung = 'sudah-digabung'

  createdAt?: unknown;
}

export interface TanahFormInput {
  nomorSertifikat: string;
  tanggalTerbitSertifikat?: string;
  nomorSuratUkur?: string;
  tanggalUkur?: string;
  petugasUkur?: string;
  panjang?: number;
  lebar?: number;
  luas: number;
  lokasi: string;
  googleMapsLink?: string;
  lat?: number;
  long?: number;
  pemilikSaatIni: string;
  parentTanahId?: string | null;
  sourceRiwayatId?: string | null;
  parentTanahIds?: string[];
  sourceRiwayatIds?: string[];
  statusGabung?: 'aktif' | 'sudah-digabung';
  mergedIntoTanahId?: string;
}
