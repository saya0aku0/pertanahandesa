import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { submitOtpCode } from '@/modules/kelola-user/otpVerification.service';

/**
 * Halaman PUBLIK (tanpa login) — tujuan link/kode OTP yang dikirim ke calon
 * pemilik akun saat Superadmin menambah user baru. Emailnya diambil dari
 * query string (?email=...) yang disisipkan di email undangan.
 */
export function VerifyEmailOtpPage() {
  const [params] = useSearchParams();
  const emailFromLink = params.get('email') ?? '';

  const [email, setEmail] = useState(emailFromLink);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !code) return;
    setStatus('loading');
    const ok = await submitOtpCode(email, code);
    setStatus(ok ? 'success' : 'error');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-xl shadow-sm border p-5 sm:p-8 space-y-4">
        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-bold text-primary-800">Verifikasi Email</h1>
          <p className="text-sm text-gray-500 mt-1">
            Masukkan kode 6 digit yang dikirim ke email Anda untuk mengonfirmasi bahwa akun
            ini boleh dibuatkan oleh admin desa.
          </p>
        </div>

        {status === 'success' ? (
          <p role="status" className="text-sm text-green-700 bg-green-50 p-3 rounded-lg break-words text-center">
            Email berhasil diverifikasi. Anda boleh menutup halaman ini — admin akan
            melanjutkan proses pembuatan akun Anda.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {status === 'error' && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-lg break-words">
                Kode salah, sudah kedaluwarsa, atau sudah pernah dipakai. Minta admin kirim
                ulang kode baru.
              </p>
            )}
            <div>
              <label htmlFor="verify-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="verify-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg p-3 min-h-[44px] text-base"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="verify-code" className="block text-sm font-medium text-gray-700 mb-1">
                Kode Verifikasi (6 digit)
              </label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full border rounded-lg p-3 min-h-[44px] text-base tracking-[0.5em] text-center"
                placeholder="123456"
                maxLength={6}
              />
            </div>
            <Button type="submit" disabled={status === 'loading'} className="w-full">
              {status === 'loading' ? 'Memverifikasi...' : 'Verifikasi'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
