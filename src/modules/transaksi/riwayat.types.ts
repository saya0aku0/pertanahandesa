import { Pemilik } from '@/types/pemilik.types';

export type JenisPeristiwa =
  | 'jual-beli'
  | 'waris'
  | 'pecah-lahan'
  | 'penyatuan-lahan'
  | 'pembaruan-data'
  | 'belum-ada-transaksi';

/** 1 bagian hasil Pecah Lahan — dipakai saat pemilik sebelumnya menjual sebagian
 * atau punya lebih dari satu ahli waris, sehingga 1 bidang dipecah jadi beberapa. */
export interface PecahLahanBagian {
  luas: number;
  nomorSuratUkur: string;
  nomorSertifikatBaru: string;
  pemilikBaru: Pemilik;
  // Diisi setelah bidang anak berhasil dibuat di Master Tanah (finalisasi Pecah Lahan)
  tanahBaruId?: string;
}

export interface Riwayat {
  id: string;
  tanahId: string;
  jenisPeristiwa: JenisPeristiwa;
  tanggalKejadian: string; // ISO date string
  pemilikSebelumnya?: Pemilik;
  pemilikBaru: Pemilik;
  // Apakah luas bidang tetap (tidak dipecah) saat perubahan data ini terjadi
  luasTetap?: boolean;
  // Alasan asal perubahan data (dipakai terutama untuk jenisPeristiwa 'pecah-lahan',
  // supaya draft yang di-Pending bisa dilanjutkan dengan konteks yang tepat)
  alasanPerubahan?: 'jual-beli' | 'waris' | 'pembaruan-data';
  pembeli?: string;
  keterangan?: string;
  dokumenUrls: string[];
  // Status penyimpanan: 'draft' = ditekan tombol Pending (menunggu proses ukur/terbit
  // sertifikat baru dari pemerintah), 'final' = data sudah lengkap & final.
  status: 'draft' | 'final';
  // Khusus jenisPeristiwa = 'pecah-lahan': rincian tiap bagian hasil pemecahan.
  pecahBagian?: PecahLahanBagian[];
  // Khusus jenisPeristiwa = 'penyatuan-lahan': merujuk bidang gabungan hasil akhir,
  // diisi belakangan setelah bidang baru berhasil dibuat (lihat riwayat.service.ts)
  tanahGabunganId?: string;
  createdAt?: unknown;
}

export interface RiwayatFormInput {
  tanahId: string;
  jenisPeristiwa: JenisPeristiwa;
  tanggalKejadian: string;
  pemilikSebelumnya?: Pemilik;
  pemilikBaru: Pemilik;
  luasTetap?: boolean;
  alasanPerubahan?: 'jual-beli' | 'waris' | 'pembaruan-data';
  pembeli?: string;
  keterangan?: string;
  dokumenUrls: string[];
  status: 'draft' | 'final';
  pecahBagian?: PecahLahanBagian[];
}
