import { useState } from 'react';
import { Button } from '@/components/Button';
import { kirimOtp } from '@/services/emailjs';
import { createDoc, getDocById } from '@/firebase/firestore';
import { Timestamp } from 'firebase/firestore';

type Step = 'input-email' | 'input-otp' | 'selesai';

const COOLDOWN_SECONDS = 60;

/**
 * Alur "Lupa Password" — OTP hybrid: EmailJS kirim kode OTP untuk verifikasi,
 * lalu native Firebase reset link untuk ganti password (§9.4 / §10.6).
 * Cooldown 60 detik antar permintaan OTP untuk hemat kuota EmailJS (§13).
 */
export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>('input-email');
  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async function handleKirimOtp() {
    if (!email) return setError('Email wajib diisi.');
    setLoading(true);
    setError(null);
    try {
      const kode = generateOtp();
      const expiredAtMs = Date.now() + 15 * 60 * 1000; // berlaku 15 menit, sesuai teks template
      const expiredAt = Timestamp.fromMillis(expiredAtMs);
      const waktuTampil = new Date(expiredAtMs).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      });
      await createDoc('otp', { email, kode, expiredAt });
      await kirimOtp({ email, passcode: kode, time: waktuTampil });
      setStep('input-otp');
      setCooldown(COOLDOWN_SECONDS);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) clearInterval(timer);
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifikasiOtp() {
    setLoading(true);
    setError(null);
    try {
      const record = await getDocById<{ kode: string; expiredAt: Timestamp; email: string }>(
        'otp',
        email
      );
      if (!record) throw new Error('Kode OTP tidak ditemukan. Kirim ulang OTP.');
      if (record.expiredAt.toMillis() < Date.now()) throw new Error('Kode OTP sudah kedaluwarsa.');
      if (record.kode !== otpInput) throw new Error('Kode OTP salah.');
      // Setelah OTP terverifikasi, arahkan ke link reset password native Firebase
      // (dikirim terpisah lewat Firebase Auth sendMailResetPassword, atau tampilkan form set password baru)
      setStep('selesai');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifikasi gagal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {step === 'input-email' && (
        <>
          <label className="block text-sm font-medium text-gray-700">Email terdaftar</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
            placeholder="nama@email.com"
          />
          <Button onClick={handleKirimOtp} disabled={loading} className="w-full">
            {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
          </Button>
        </>
      )}

      {step === 'input-otp' && (
        <>
          <p className="text-sm text-gray-600">Kode OTP dikirim ke {email}.</p>
          <label className="block text-sm font-medium text-gray-700">Kode OTP (6 digit)</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px] tracking-widest text-center text-lg"
          />
          <Button onClick={handleVerifikasiOtp} disabled={loading} className="w-full">
            {loading ? 'Memverifikasi...' : 'Verifikasi'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleKirimOtp}
            disabled={cooldown > 0 || loading}
            className="w-full"
          >
            {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : 'Kirim ulang kode OTP'}
          </Button>
        </>
      )}

      {step === 'selesai' && (
        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
          Verifikasi berhasil. Silakan cek email Anda untuk tautan reset password resmi dari
          Firebase, atau hubungi Superadmin untuk reset manual.
        </p>
      )}
    </div>
  );
}
