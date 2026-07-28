import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, loginWithGoogle, logout } from '@/firebase/auth';
import { getEmailByUsername, getUserProfileByEmail } from '@/modules/kelola-user/user.service';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LOGIN_BACKGROUND_URL } from '@/config/loginBackground';
import { catatLoginLog } from './loginLog.service';

export function LoginPage() {
  const [identifier, setIdentifier] = useState(''); // boleh diisi email ATAU username
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const navigate = useNavigate();

  // Animasi "reveal" singkat sebelum pindah ke dashboard, biar transisi setelah
  // berhasil login terasa lebih halus (bukan langsung loncat halaman).
  function tampilkanSuksesLaluPindah() {
    setLoginSuccess(true);
    setTimeout(() => navigate('/master-tanah'), 700);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const input = identifier.trim();
      let emailToUse = input;

      // Auto-deteksi: kalau tidak mengandung '@', anggap ini username,
      // cari dulu email pasangannya di Firestore sebelum login ke Firebase Auth.
      if (!input.includes('@')) {
        const foundEmail = await getEmailByUsername(input);
        if (!foundEmail) {
          setError('Username tidak ditemukan.');
          setLoading(false);
          return;
        }
        emailToUse = foundEmail;
      }

      await login(emailToUse, password);
      catatLoginLog(emailToUse, input.includes('@') ? 'email' : 'username');
      tampilkanSuksesLaluPindah();
    } catch (err) {
      setError('Email/Username atau password salah.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError(null);
    try {
      const credential = await loginWithGoogle();
      const email = credential.user.email;

      // Login Google TIDAK otomatis daftar user baru — email harus sudah
      // terdaftar di Firestore /users (dibuat lebih dulu oleh Superadmin).
      const profile = email ? await getUserProfileByEmail(email) : null;
      if (!profile) {
        await logout();
        setError('Akun Google ini belum terdaftar. Hubungi Superadmin untuk didaftarkan.');
        setGoogleLoading(false);
        return;
      }

      catatLoginLog(email ?? '(tidak ada email)', 'google');
      tampilkanSuksesLaluPindah();
    } catch (err) {
      setError('Gagal masuk dengan Google. Coba lagi.');
      setGoogleLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative bg-gray-900 bg-cover bg-center"
      style={{ backgroundImage: `linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.65)), url(${LOGIN_BACKGROUND_URL})` }}
    >
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg bg-white rounded-xl shadow-2xl shadow-black/40 border p-5 sm:p-8 space-y-4 animate-login-card">
        <div className="text-center">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-primary-800 leading-snug break-words">
            Pencatatan Surat Tanah &amp; Kepemilikan
          </h1>
          <p className="text-base font-bold text-primary-800 mt-1">DESA PUTUKREJO</p>
          <p className="text-sm text-gray-500 mt-1">Masuk untuk melanjutkan</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-lg break-words">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="login-identifier" className="block text-sm font-medium text-gray-700 mb-1">
              Email / Username
            </label>
            <input
              id="login-identifier"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px] text-base"
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px] text-base"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">atau</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full border rounded-lg p-3 min-h-[44px] flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          <span className="break-words">{googleLoading ? 'Memproses...' : 'Masuk dengan Google'}</span>
        </button>

        <button
          onClick={() => setShowForgot(true)}
          className="text-sm text-primary-700 hover:underline w-full text-center min-h-[44px]"
        >
          Lupa Password?
        </button>

        <p className="text-xs text-gray-400 text-center pt-2 border-t break-words">
          {'</> Application By : Hikimori-Project @2026'}
        </p>
      </div>

      <Modal open={showForgot} onClose={() => setShowForgot(false)} title="Lupa Password">
        <ForgotPasswordForm />
      </Modal>

      {/* Animasi "reveal" singkat setelah berhasil login, sebelum pindah ke dashboard */}
      {loginSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-800/90 animate-overlay-fade">
          <div className="text-center animate-success-reveal">
            <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl">
              ✓
            </div>
            <p className="text-white font-semibold">Berhasil masuk...</p>
          </div>
        </div>
      )}
    </div>
  );
}
