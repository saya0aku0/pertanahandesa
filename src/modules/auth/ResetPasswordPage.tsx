import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPasswordWithCode } from '@/firebase/auth';
import { Button } from '@/components/Button';

/**
 * Halaman tujuan link reset password dari email Firebase (§ForgotPasswordForm).
 * oobCode diambil dari query string yang disisipkan otomatis oleh Firebase.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!oobCode) {
      setError('Tautan tidak valid atau sudah kedaluwarsa. Minta link reset baru.');
      return;
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithCode(oobCode, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError('Tautan sudah kedaluwarsa atau tidak valid. Minta link reset baru dari halaman login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-primary-800">Buat Password Baru</h1>
          <p className="text-sm text-gray-500 mt-1">DESA PUTUKREJO</p>
        </div>

        {!oobCode && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            Tautan tidak valid. Silakan minta link reset password baru dari halaman login.
          </p>
        )}

        {success ? (
          <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
            Password berhasil diubah. Mengalihkan ke halaman login...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg p-3 min-h-[44px]"
                disabled={!oobCode}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg p-3 min-h-[44px]"
                disabled={!oobCode}
              />
            </div>
            <Button type="submit" disabled={loading || !oobCode} className="w-full">
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            </Button>
          </form>
        )}

        <Link
          to="/login"
          className="text-sm text-primary-700 hover:underline w-full text-center block min-h-[44px] leading-[44px]"
        >
          Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
