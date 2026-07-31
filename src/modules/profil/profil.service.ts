import { getDocByField, updateDocById } from '@/firebase/firestore';
import { AppUser } from '@/modules/auth/auth.types';

/**
 * PENTING: ID dokumen di koleksi /users adalah auto-generated Firestore ID
 * (dibuat lewat addDoc di user.service.ts createUser), BUKAN sama dengan
 * uid Firebase Auth. uid hanya disimpan sebagai FIELD di dalam dokumen.
 * Jadi profil harus dicari lewat query where('uid', '==', ...), bukan getDocById.
 */
export async function getProfil(uid: string) {
  return getDocByField<AppUser>('users', 'uid', uid);
}

export async function updateProfil(
  docId: string,
  data: { nama?: string; noHp?: string }
) {
  return updateDocById('users', docId, data);
}

/** Simpan PIN baru — dipanggil SETELAH password berhasil diverifikasi (lihat
 * verifyPassword di firebase/auth.ts), tidak butuh PIN lama sama sekali. */
export async function updateProfilPin(docId: string, pinBaru: string) {
  return updateDocById('users', docId, { pin: pinBaru });
}
