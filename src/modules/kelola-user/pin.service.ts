import { updateDocById } from '@/firebase/firestore';
import { getUserProfileByEmail } from './user.service';

/**
 * Cek apakah user (berdasarkan email login) sudah pernah mengisi PIN.
 * User lama (dibuat sebelum fitur PIN ada) belum punya field `pin` di /users,
 * jadi dipakai untuk mengarahkan ke alur "buat PIN baru" alih-alih "verifikasi".
 */
export async function pinSudahDiset(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const profile = await getUserProfileByEmail(email);
  return !!profile?.pin;
}

/**
 * Verifikasi PIN milik user yang sedang login (dicocokkan dengan PIN yang diisi
 * saat penambahan user di Kelola User, atau lewat setPinAwal untuk user lama).
 * Dipakai sebelum aksi Edit/Hapus pada data yang sudah tersimpan (Master Tanah & Transaksi).
 */
export async function verifyPin(email: string | null | undefined, pin: string): Promise<boolean> {
  if (!email) return false;
  const profile = await getUserProfileByEmail(email);
  if (!profile?.pin) return false;
  return profile.pin === pin;
}

/**
 * Set PIN pertama kali untuk user yang belum punya PIN (mis. user lama dari
 * sebelum fitur PIN ditambahkan). Hanya berhasil kalau user tsb memang belum
 * punya PIN — supaya fungsi ini tidak dipakai untuk mengganti PIN orang lain
 * tanpa verifikasi.
 */
export async function setPinAwal(email: string | null | undefined, pinBaru: string): Promise<void> {
  if (!email) throw new Error('Sesi login tidak ditemukan.');
  if (!/^\d{4,6}$/.test(pinBaru)) throw new Error('PIN harus 4-6 digit angka.');
  const profile = await getUserProfileByEmail(email);
  if (!profile) throw new Error('Profil user tidak ditemukan.');
  if (profile.pin) throw new Error('PIN sudah pernah diset sebelumnya.');
  await updateDocById('users', profile.id, { pin: pinBaru });
}
