import {
  createDoc,
  deleteDocById,
  updateDocById,
  getPaginated,
  getDocByField,
  getDocById,
  setDocById
} from '@/firebase/firestore';
import { createAccount, sendVerificationEmail } from '@/firebase/auth';
import { AppUser, UserRole } from '@/modules/auth/auth.types';

const COLLECTION = 'users';
// Koleksi kecil publik (read: true di rules) — HANYA berisi {username, email}.
// Dipakai untuk 2 hal yang butuh dibaca SEBELUM user login: (1) resolve
// username -> email saat login, (2) cek email sudah terdaftar atau belum
// saat "Lupa Password". Sengaja dipisah dari /users supaya data sensitif
// (PIN, role, dll) tidak ikut kebuka ke publik.
const DIRECTORY_COLLECTION = 'directory';

function directoryId(username: string) {
  return username.trim().toLowerCase();
}

async function syncDirectoryEntry(username: string, email: string) {
  await setDocById(DIRECTORY_COLLECTION, directoryId(username), {
    username,
    email
  });
}

export interface UserFormInput {
  nama: string;
  email: string;
  username: string;
  noHp?: string;
  role: UserRole;
  password?: string; // hanya dipakai saat membuat akun baru
  pin: string; // PIN 4-6 digit, wajib diisi tiap kali user ditambahkan
  // true kalau email sudah lolos alur OTP (lihat otpVerification.service.ts)
  // sebelum tombol Simpan ditekan. Kalau true, createUser TIDAK lagi kirim
  // email verifikasi native Firebase (sudah tidak perlu, ownership sudah
  // dibuktikan lewat OTP) dan langsung set emailVerified=true di Firestore.
  emailPreVerified?: boolean;
}

/**
 * Buat user baru: sekaligus daftarkan akun login (Firebase Auth) dan
 * simpan profil di Firestore /users (§10.4).
 */
export async function createUser(input: UserFormInput) {
  if (!input.password) {
    throw new Error('Password wajib diisi saat membuat akun baru.');
  }
  if (!input.pin || !/^\d{4,6}$/.test(input.pin)) {
    throw new Error('PIN wajib diisi, 4-6 digit angka.');
  }
  const credential = await createAccount(input.email, input.password);
  await createDoc(COLLECTION, {
    nama: input.nama,
    email: input.email,
    username: input.username,
    noHp: input.noHp ?? '',
    role: input.role,
    pin: input.pin,
    uid: credential.user.uid,
    emailVerified: !!input.emailPreVerified
  });
  await syncDirectoryEntry(input.username, input.email);

  if (!input.emailPreVerified) {
    // Fallback lama: kalau form dipakai tanpa melalui alur OTP (mis. dipanggil
    // dari tempat lain), tetap kirim verifikasi native Firebase seperti biasa.
    try {
      await sendVerificationEmail(credential.user);
    } catch {
      // best-effort, diabaikan — lihat catatan di sendVerificationEmail
    }
  }

  return credential.user.uid;
}

export async function updateUser(
  id: string,
  input: Partial<Omit<UserFormInput, 'password'>>
) {
  if (input.pin !== undefined && input.pin !== '' && !/^\d{4,6}$/.test(input.pin)) {
    throw new Error('PIN harus 4-6 digit angka.');
  }
  await updateDocById(COLLECTION, id, input);

  // Sinkronkan koleksi directory kalau username/email ikut diubah, ATAU kalau
  // dokumen ini sebelumnya belum pernah ke-sync (mis. akun lama yang dibuat
  // manual di Firebase Console lalu profilnya ditambahkan manual ke Firestore —
  // buka & Simpan lagi dari form Edit User akan otomatis membuatkan entry directory-nya).
  if (input.username || input.email) {
    const profile = await getDocById<AppUser>(COLLECTION, id);
    if (profile?.username && profile?.email) {
      await syncDirectoryEntry(profile.username, profile.email);
    }
  }
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
  // Baca dari koleksi "directory" (bukan /users), karena rule /users mewajibkan
  // isLoggedIn() sedangkan lookup ini justru terjadi SEBELUM user login.
  const entry = await getDocById<{ email: string }>(DIRECTORY_COLLECTION, directoryId(username));
  return entry?.email ?? null;
}

/**
 * Cek apakah sebuah email sudah terdaftar sebagai akun di aplikasi ini —
 * dipakai di form "Lupa Password" supaya bisa tampilkan "Akun tidak ditemukan"
 * kalau emailnya belum pernah didaftarkan lewat Kelola User.
 *
 * Catatan keamanan: menampilkan status "terdaftar/tidak" secara eksplisit
 * bisa dipakai orang luar untuk menebak-nebak email admin mana yang valid
 * (account enumeration). Untuk aplikasi internal dengan jumlah user terbatas
 * ini biasanya risiko yang bisa diterima, tapi perlu disadari.
 */
export async function checkEmailRegistered(email: string): Promise<boolean> {
  const entry = await getDocByField<{ email: string }>(
    DIRECTORY_COLLECTION,
    'email',
    email.trim()
  );
  return entry !== null;
}

/**
 * Cari profil user berdasarkan email — dipakai untuk validasi login Google.
 * Login Google TIDAK otomatis mendaftarkan user baru; email hasil login Google
 * harus sudah terdaftar di Firestore /users (dibuat lebih dulu oleh Superadmin
 * lewat form Kelola User), kalau tidak ditemukan maka akses ditolak.
 */
export async function getUserProfileByEmail(email: string): Promise<(AppUser & { id: string }) | null> {
  return getDocByField<AppUser>(COLLECTION, 'email', email);
}

/**
 * Sinkronkan status emailVerified dari Firebase Auth ke Firestore /users,
 * supaya bisa ditampilkan di kolom "Status Verifikasi" pada Kelola User.
 *
 * KETERBATASAN: status di Firestore ini hanya snapshot — baru ter-update
 * saat user yang bersangkutan login (dipanggil dari useAuthUser). Karena
 * app ini 100% frontend tanpa Admin SDK, tidak ada cara memeriksa status
 * verifikasi user lain secara real-time tanpa mereka login dulu.
 */
export async function syncEmailVerifiedStatus(uid: string, verified: boolean) {
  const profile = await getDocByField<AppUser>(COLLECTION, 'uid', uid);
  if (!profile) return;
  // Satu arah: hanya naikkan false -> true. Akun yang sudah diverifikasi lewat
  // OTP saat dibuat (emailVerified=true di Firestore) TIDAK boleh ditimpa balik
  // jadi false hanya karena Firebase Auth internal (yang tidak kita pakai untuk
  // akun-akun itu) masih mencatat emailVerified=false secara native.
  if (verified && !profile.emailVerified) {
    await updateDocById(COLLECTION, profile.id, { emailVerified: true });
  }
}
