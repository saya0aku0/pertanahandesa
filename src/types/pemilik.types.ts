/**
 * Data diri pemilik tanah — dipakai di Master Tanah (pemilikSaatIni) maupun
 * di Transaksi (pemilikSebelumnya/pemilikBaru), termasuk tiap bagian hasil
 * Pecah Lahan. Wajib lengkap: NAMA, NIK, ALAMAT LENGKAP.
 */
export interface Pemilik {
  nama: string;
  nik: string;
  alamatLengkap: string;
}

export const PEMILIK_KOSONG: Pemilik = { nama: '', nik: '', alamatLengkap: '' };

export function pemilikValid(p?: Pemilik | null): boolean {
  return !!p && p.nama.trim() !== '' && p.nik.trim() !== '' && p.alamatLengkap.trim() !== '';
}

/** Tampilan ringkas 1 baris untuk tabel/export (mis. "Budi Santoso — NIK 35xxxxx") */
export function formatPemilikSingkat(p?: Pemilik | null): string {
  if (!p || !p.nama) return '-';
  return `${p.nama} — NIK ${p.nik || '-'}`;
}
