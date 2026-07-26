import { useState } from 'react';
import { Button } from '@/components/Button';
import { sendResetEmail } from '@/firebase/auth';

/**
 * Alur "Lupa Password" — versi sederhana native Firebase (Spark plan friendly).
 * Cukup 1 langkah: kirim link reset resmi dari Firebase ke email terdaftar.
 * Tidak butuh Cloud Functions/server, dan tidak tergantung kuota layanan pihak ketiga.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function handleKirim() {
    if (!email) {
      setError('Email wajib diisi.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendResetEmail(email.trim());
      setSent(true);
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) clearInterval(timer);
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      // Firebase sengaja tidak membedakan "email tidak terdaftar" vs error lain
      // demi mencegah enumerasi akun — tampilkan pesan generik yang aman.
      setError('Gagal mengirim email reset. Periksa kembali alamat email Anda.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
          Link reset password sudah dikirim ke <strong>{email}</strong>. Buka email Anda dan
          klik tautannya untuk membuat password baru. Cek juga folder Spam kalau tidak
          muncul dalam beberapa menit.
        </p>
        <Button
          variant="ghost"
          onClick={handleKirim}
          disabled={cooldown > 0 || loading}
          className="w-full"
        >
          {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : 'Kirim ulang link'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <label className="block text-sm font-medium text-gray-700">Email terdaftar</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded-lg p-3 min-h-[44px]"
        placeholder="nama@email.com"
      />
      <Button onClick={handleKirim} disabled={loading} className="w-full">
        {loading ? 'Mengirim...' : 'Kirim Link Reset Password'}
      </Button>
    </div>
  );
}
