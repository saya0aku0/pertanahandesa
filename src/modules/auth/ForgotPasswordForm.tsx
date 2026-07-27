import { useState } from 'react';
import { Button } from '@/components/Button';
import { sendResetEmail } from '@/firebase/auth';
import { checkEmailRegistered } from '@/modules/kelola-user/user.service';

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
      // Cek dulu ke koleksi "directory" apakah email ini memang terdaftar
      // sebagai akun di aplikasi. Kalau tidak ada, langsung kasih tahu jelas
      // (permintaan eksplisit user — trade-off: ini membuka celah kecil
      // account enumeration, tapi dianggap acceptable untuk app internal ini).
      const terdaftar = await checkEmailRegistered(email.trim());
      if (!terdaftar) {
        setError('Akun tidak ditemukan. Periksa kembali alamat email Anda.');
        setLoading(false);
        return;
      }

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
      setError('Gagal mengirim email reset. Coba lagi beberapa saat.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <p role="status" className="text-sm text-green-700 bg-green-50 p-3 rounded-lg break-words">
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
      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 p-3 rounded-lg break-words">
          {error}
        </p>
      )}

      <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700">
        Email terdaftar
      </label>
      <input
        id="forgot-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded-lg p-3 min-h-[44px] text-base"
        placeholder="nama@email.com"
        autoComplete="email"
      />
      <Button onClick={handleKirim} disabled={loading} className="w-full">
        {loading ? 'Mengirim...' : 'Kirim Link Reset Password'}
      </Button>
    </div>
  );
}
