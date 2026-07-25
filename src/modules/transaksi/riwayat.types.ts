export type JenisPeristiwa = 'jual-beli' | 'waris' | 'pecah-lahan' | 'belum-ada-transaksi';

export interface Riwayat {
  id: string;
  tanahId: string;
  jenisPeristiwa: JenisPeristiwa;
  tanggalKejadian: string; // ISO date string
  namaPemilikSebelumnya?: string;
  namaPemilikBaru: string;
  pembeli?: string;
  keterangan?: string;
  dokumenUrls: string[];
  createdAt?: unknown;
}

export interface RiwayatFormInput {
  tanahId: string;
  jenisPeristiwa: JenisPeristiwa;
  tanggalKejadian: string;
  namaPemilikSebelumnya?: string;
  namaPemilikBaru: string;
  pembeli?: string;
  keterangan?: string;
  dokumenUrls: string[];
}
