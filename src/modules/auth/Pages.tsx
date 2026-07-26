import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/firebase/auth';
import { getEmailByUsername } from '@/modules/kelola-user/user.service';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export function LoginPage() {
  const [identifier, setIdentifier] = useState(''); // boleh diisi email ATAU username
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();

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
      navigate('/master-tanah');
    } catch (err) {
      setError('Email/Username atau password salah.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-sm border p-8 space-y-4">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold text-primary-800 whitespace-nowrap">
            Pencatatan Surat Tanah &amp; Kepemilikan
          </h1>
          <p className="text-base font-bold text-primary-800 mt-1">DESA PUTUKREJO</p>
          <p className="text-sm text-gray-500 mt-1">Masuk untuk melanjutkan</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email / Username
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
              autoComplete="username"
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

        <p className="text-xs text-gray-400 text-center pt-2 border-t">
          {'</> Application By : Hikimori-Project @2026'}
        </p>
      </div>

      <Modal open={showForgot} onClose={() => setShowForgot(false)} title="Lupa Password">
        <ForgotPasswordForm />
      </Modal>
    </div>
  );
}
