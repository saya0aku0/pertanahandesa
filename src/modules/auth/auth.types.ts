export type UserRole = 'superadmin' | 'owner' | 'staff';

export interface AppUser {
  id: string;
  nama: string;
  email: string;
  username: string; // dipakai untuk mode login "Username" (dipetakan ke email saat login)
  noHp?: string;
  role: UserRole;
  // PIN keamanan (4-6 digit) — wajib diisi saat user baru ditambahkan, dipakai untuk
  // verifikasi sebelum aksi Edit/Hapus pada data yang sudah tersimpan (Master Tanah & Transaksi).
  pin?: string;
  createdAt?: unknown;
}
