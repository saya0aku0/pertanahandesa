import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  confirmPasswordReset,
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

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Reset password native Firebase — dipakai di tahap akhir alur OTP hybrid (§9.4 / §10.6)
export function resetPasswordWithCode(oobCode: string, newPassword: string) {
  return confirmPasswordReset(auth, oobCode, newPassword);
}
