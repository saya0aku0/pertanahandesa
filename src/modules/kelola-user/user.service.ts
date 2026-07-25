import { createDoc, deleteDocById, updateDocById, getPaginated, getDocByField } from '@/firebase/firestore';
import { createAccount } from '@/firebase/auth';
import { AppUser, UserRole } from '@/modules/auth/auth.types';

const COLLECTION = 'users';

export interface UserFormInput {
  nama: string;
  email: string;
  username: string;
  noHp?: string;
  role: UserRole;
  password?: string; // hanya dipakai saat membuat akun baru
}

/**
 * Buat user baru: sekaligus daftarkan akun login (Firebase Auth) dan
 * simpan profil di Firestore /users (§10.4).
 */
export async function createUser(input: UserFormInput) {
  if (!input.password) {
    throw new Error('Password wajib diisi saat membuat akun baru.');
  }
  const credential = await createAccount(input.email, input.password);
  await createDoc(COLLECTION, {
    nama: input.nama,
    email: input.email,
    username: input.username,
    noHp: input.noHp ?? '',
    role: input.role,
    uid: credential.user.uid
  });
  return credential.user.uid;
}

export async function updateUser(id: string, input: Partial<Omit<UserFormInput, 'password'>>) {
  return updateDocById(COLLECTION, id, input);
}

export async function deleteUser(id: string) {
  // Catatan: ini hanya menghapus dokumen profil di Firestore. Menghapus akun Firebase Auth
  // memerlukan Admin SDK (server-side) — di luar cakupan arsitektur 100% frontend (§5, §12).
  // Untuk MVP, nonaktifkan login lewat pengubahan role atau proses manual di Firebase Console.
  return deleteDocById(COLLECTION, id);
}

export async function getUserPage(pageSize = 25, cursor?: unknown) {
  return getPaginated<AppUser>(COLLECTION, [], pageSize, cursor);
}

/**
 * Cari email berdasarkan username — dipakai untuk fitur login dua-cara (Email/Username).
 * Firebase Authentication hanya mendukung email+password secara native, jadi
 * saat user login pakai username, kita cari dulu email pasangannya di Firestore,
 * lalu login seperti biasa memakai email tersebut.
 */
export async function getEmailByUsername(username: string): Promise<string | null> {
  const user = await getDocByField<AppUser>(COLLECTION, 'username', username);
  return user?.email ?? null;
}
