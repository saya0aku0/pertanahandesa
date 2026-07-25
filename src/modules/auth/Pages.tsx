import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/firebase/auth';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export function LoginPage() {
  const [email, setEmail] = useState('');
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
      await login(email, password);
      navigate('/master-tanah');
    } catch (err) {
      setError('Email atau password salah.');
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

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
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
