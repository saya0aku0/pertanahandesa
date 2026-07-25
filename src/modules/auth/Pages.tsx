import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/firebase/auth';
import { getEmailByUsername } from '@/modules/kelola-user/user.service';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type LoginMode = 'email' | 'username';

export function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('email');
  const [identifier, setIdentifier] = useState(''); // isi email atau username, tergantung mode aktif
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();

  function switchMode(next: LoginMode) {
    setMode(next);
    setIdentifier('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let emailToUse = identifier.trim();

      // Mode "Username": cari dulu email pasangannya di Firestore (Firebase Auth
      // hanya bisa login pakai email), baru lanjut login seperti biasa.
      if (mode === 'username') {
        const foundEmail = await getEmailByUsername(emailToUse);
        if (!foundEmail) {
          setError('Username tidak ditemukan.');
          setLoading(false);
          return;
        }
        emailToUse = foundEmail;
      }

      await login(emailToUse, password);
      navigate('/master-tanah');
    } catch (err) {
      setError(mode === 'username' ? 'Username atau password salah.' : 'Email atau password salah.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-primary-800">Riwayat Tanah Desa</h1>
          <p className="text-sm text-gray-500">Masuk untuk melanjutkan</p>
        </div>

        {/* Tab pemilih metode login */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => switchMode('email')}
            className={`flex-1 py-2 min-h-[44px] font-medium transition-colors ${
              mode === 'email' ? 'bg-primary-700 text-white' : 'bg-white text-gray-600'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => switchMode('username')}
            className={`flex-1 py-2 min-h-[44px] font-medium transition-colors ${
              mode === 'username' ? 'bg-primary-700 text-white' : 'bg-white text-gray-600'
            }`}
          >
            Username
          </button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mode === 'email' ? 'Email' : 'Username'}
            </label>
            <input
              type={mode === 'email' ? 'email' : 'text'}
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
              autoComplete={mode === 'email' ? 'email' : 'username'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>

        <button
          onClick={() => setShowForgot(true)}
          className="text-sm text-primary-700 hover:underline w-full text-center min-h-[44px]"
        >
          Lupa Password?
        </button>
      </div>

      <Modal open={showForgot} onClose={() => setShowForgot(false)} title="Lupa Password">
        <ForgotPasswordForm />
      </Modal>
    </div>
  );
}
