import emailjs from '@emailjs/browser';

// =====================================================================
// ⚠️ PLACEHOLDER API KEY — Isi via .env
//    EmailJS Free Plan: 200 request/bulan (§5.3 PRD)
//    Hanya dipakai untuk OTP lupa password — fitur notifikasi tidak dipakai.
// =====================================================================
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string; // <<PLACEHOLDER_EMAILJS_SERVICE_ID>>
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string; // <<PLACEHOLDER_EMAILJS_PUBLIC_KEY>>
const TEMPLATE_OTP = import.meta.env.VITE_EMAILJS_TEMPLATE_OTP as string; // <<PLACEHOLDER_EMAILJS_TEMPLATE_OTP>>

export class EmailJsError extends Error {}

function assertConfigured() {
  if (!SERVICE_ID || !PUBLIC_KEY || !TEMPLATE_OTP) {
    throw new EmailJsError(
      'EmailJS belum dikonfigurasi. Isi VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_PUBLIC_KEY, dan VITE_EMAILJS_TEMPLATE_OTP di .env'
    );
  }
}

/**
 * Kirim kode OTP. Dipakai untuk 2 alur: (1) sisa rancangan lama "Lupa Password"
 * (sudah tidak dipakai, digantikan reset native Firebase), dan (2) alur BARU
 * "Verifikasi Email sebelum Tambah User" (lihat otpVerification.service.ts).
 * Nama variabel HARUS cocok persis dengan template EmailJS:
 *   - {{email}}    → tujuan email (field "To Email" di template)
 *   - {{passcode}} → kode OTP 6 digit
 *   - {{time}}     → waktu kedaluwarsa yang ditampilkan ke pengguna (contoh: "15:32")
 *   - {{link}}     → (opsional) link langsung ke halaman verifikasi dengan
 *                     email sudah terisi, supaya penerima tinggal klik & isi kode
 */
export async function kirimOtp(params: {
  email: string;
  passcode: string;
  time: string;
  link?: string;
}) {
  assertConfigured();
  return emailjs.send(SERVICE_ID, TEMPLATE_OTP, params, { publicKey: PUBLIC_KEY });
}
