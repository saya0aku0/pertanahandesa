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
 * Kirim kode OTP untuk alur "Lupa Password" (hybrid, §9.4 / §10.6).
 * Nama variabel HARUS cocok persis dengan template EmailJS "One-Time Password":
 *   - {{email}}    → tujuan email (field "To Email" di template)
 *   - {{passcode}} → kode OTP 6 digit
 *   - {{time}}     → waktu kedaluwarsa yang ditampilkan ke pengguna (contoh: "15:32")
 */
export async function kirimOtp(params: { email: string; passcode: string; time: string }) {
  assertConfigured();
  return emailjs.send(SERVICE_ID, TEMPLATE_OTP, params, { publicKey: PUBLIC_KEY });
}
