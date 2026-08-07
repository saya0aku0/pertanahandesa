import { getDocById, setDocById } from '@/firebase/firestore';

const COLLECTION = 'settings';
const DOC_ID = 'kopSurat';

export interface KopSurat {
  namaDesa: string;
  namaKecamatan?: string;
  namaKabupaten?: string;
  namaProvinsi?: string;
  kodePos?: string;
  alamat?: string;
  kontak?: string; // telepon/email/website, bebas format
  logoKabupatenUrl?: string; // tampil di KIRI kop surat
  logoDesaUrl?: string; // tampil di KANAN kop surat
}

export const KOP_SURAT_KOSONG: KopSurat = {
  namaDesa: '',
  namaKecamatan: '',
  namaKabupaten: '',
  namaProvinsi: '',
  kodePos: '',
  alamat: '',
  kontak: '',
  logoKabupatenUrl: '',
  logoDesaUrl: ''
};

/**
 * Nilai bawaan (default) saat setting KOP Surat BELUM PERNAH disimpan sama sekali —
 * diisi sesuai data yang diberikan, supaya form tidak perlu diketik dari kosong.
 * Begitu sudah pernah disimpan sekali (walau tanpa perubahan), nilai yang dipakai
 * selanjutnya adalah yang tersimpan di Firestore, bukan default ini lagi.
 */
const KOP_SURAT_SARAN_AWAL: KopSurat = {
  ...KOP_SURAT_KOSONG,
  namaDesa: 'Putukrejo',
  namaKecamatan: 'Loceret',
  namaKabupaten: 'Nganjuk',
  namaProvinsi: 'Jawa Timur',
  kodePos: '64471',
  // Logo Kabupaten Nganjuk di KIRI, tampil sebelum diganti manual lewat form.
  logoKabupatenUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/NganjukLogoNew.png'
  // Logo Desa (KANAN) sengaja dibiarkan kosong — menunggu diupload sendiri oleh user.
};

/**
 * Setting KOP Surat — dipakai bersama di semua export PDF (bukan per-user), makanya
 * disimpan sebagai 1 dokumen tunggal `settings/kopSurat`, bukan per akun.
 */
export async function getKopSurat(): Promise<KopSurat> {
  const data = await getDocById<KopSurat>(COLLECTION, DOC_ID);
  if (data) return { ...KOP_SURAT_KOSONG, ...data };
  // Belum pernah disimpan sama sekali -> tawarkan data default sebagai titik awal
  return KOP_SURAT_SARAN_AWAL;
}

export async function saveKopSurat(data: KopSurat) {
  return setDocById(COLLECTION, DOC_ID, data);
}
