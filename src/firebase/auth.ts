import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  confirmPasswordReset,
  sendPasswordResetEmail,
  sendEmailVerification,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
  User
} from 'firebase/auth';
import { auth } from './config';

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Login pakai akun Google. Catatan: ini HANYA melakukan autentikasi Google,
// bukan mendaftarkan user baru — pemetaan role/akses tetap harus sudah ada
// di Firestore /users (dibuat lebih dulu oleh Superadmin), lihat Pages.tsx.
export function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export function logout() {
  return signOut(auth);
}

export function createAccount(email: string, password: string) {
  // Dipakai Owner/Superadmin saat menambah akun Staff/Owner baru (§10.4)
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Kirim email verifikasi RESMI dari Firebase ke akun tertentu. Catatan penting:
 * Firebase Auth di sisi client HANYA mengizinkan ini untuk akun yang SEDANG
 * login (`auth.currentUser`) — tidak bisa dipakai admin untuk memicu verifikasi
 * ke akun user lain tanpa Admin SDK (server). Makanya fungsi ini dipanggil di
 * 2 tempat: (1) sesaat setelah createAccount saat admin menambah user baru
 * (saat itu sesi login otomatis pindah ke akun baru tsb), dan (2) tombol
 * "Kirim Ulang" yang HANYA muncul untuk akun milik sendiri yang sedang login.
 */
export function sendVerificationEmail(user: User) {
  return sendEmailVerification(user, {
    url: `${window.location.origin}/login`
  });
}

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Kirim email reset password RESMI dari Firebase (100% gratis, jalan di Spark plan,
 * tidak butuh Cloud Functions/server). Link di email akan mengarah ke halaman
 * /reset-password di app ini sendiri (lihat actionCodeSettings), bukan halaman
 * default Firebase — supaya tampilannya konsisten dengan branding aplikasi.
 */
export function sendResetEmail(email: string) {
  return sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/reset-password`,
    handleCodeInApp: true
  });
}

// Reset password native Firebase — dipakai di halaman /reset-password setelah
// user klik link dari email (oobCode diambil dari query string URL).
export function resetPasswordWithCode(oobCode: string, newPassword: string) {
  return confirmPasswordReset(auth, oobCode, newPassword);
}

/**
 * Ganti password TANPA OTP/email — dipakai di halaman Setting Profil Akun saat
 * user sudah login. Firebase mewajibkan reauthenticate dengan password LAMA
 * dulu sebelum boleh updatePassword (kalau sesi login sudah agak lama), jadi
 * form-nya tetap minta Kata Sandi Lama walau tidak mengirim email/OTP apapun.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
