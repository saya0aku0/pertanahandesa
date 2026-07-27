import { useState } from 'react';
import { User } from 'firebase/auth';
import { sendVerificationEmail } from '@/firebase/auth';

interface EmailVerificationBannerProps {
  user: User;
}

/**
 * Banner pengingat non-blocking untuk akun yang emailnya belum diverifikasi.
 * Sengaja TIDAK memblokir akses ke aplikasi — hanya pengingat + tombol kirim
 * ulang. Firebase Auth di client hanya izinkan resend untuk akun yang sedang
 * login sendiri, jadi banner ini otomatis hanya relevan untuk diri sendiri.
 */
export function EmailVerificationBanner({ user }: EmailVerificationBannerProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  if (user.emailVerified) return null;

  async function handleKirimUlang() {
    setSending(true);
    setError(null);
    try {
      await sendVerificationEmail(user);
      setSent(true);
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) clearInterval(timer);
          return c - 1;
        });
      }, 1000);
    } catch {
      setError('Gagal mengirim email verifikasi. Coba lagi beberapa saat.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="status"
      className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex flex-wrap items-center gap-2 justify-between"
    >
      <p className="text-sm text-amber-800 break-words">
        {sent
          ? `Email verifikasi sudah dikirim ulang ke ${user.email}. Cek juga folder Spam.`
          : `Email Anda (${user.email}) belum diverifikasi.`}
      </p>
      <div className="flex items-center gap-3">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <button
          onClick={handleKirimUlang}
          disabled={sending || cooldown > 0}
          className="text-sm font-medium text-amber-800 hover:underline min-h-[32px] disabled:opacity-50 disabled:no-underline whitespace-nowrap"
        >
          {sending ? 'Mengirim...' : cooldown > 0 ? `Kirim ulang (${cooldown}s)` : 'Kirim Ulang Email Verifikasi'}
        </button>
      </div>
    </div>
  );
}
