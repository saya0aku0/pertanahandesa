import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { setDocById, subscribeDoc } from '@/firebase/firestore';
import { kirimOtp, EmailJsError } from '@/services/emailjs';

const COLLECTION = 'otp';
const EXPIRY_MINUTES = 10;

export interface OtpDoc {
  code: string;
  verified: boolean;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digit, 100000-999999
}

function docId(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Mulai proses verifikasi: bikin kode OTP baru, simpan ke Firestore /otp/{email}
 * (status awal verified=false), lalu kirim kodenya lewat EmailJS ke pemilik email.
 * Dipanggil oleh SUPERADMIN saat menekan "Kirim Kode Verifikasi" di form Tambah User.
 */
export async function startEmailVerification(email: string): Promise<void> {
  const code = generateCode();
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + EXPIRY_MINUTES * 60 * 1000);

  await setDocById<OtpDoc>(COLLECTION, docId(email), {
    code,
    verified: false,
    expiresAt,
    createdAt: now
  });

  try {
    await kirimOtp({
      email: email.trim(),
      passcode: code,
      time: expiresAt.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      link: `${window.location.origin}/verifikasi-email?email=${encodeURIComponent(email.trim())}`
    });
  } catch (err) {
    if (err instanceof EmailJsError) {
      throw new Error(
        'EmailJS belum dikonfigurasi di .env (VITE_EMAILJS_SERVICE_ID / PUBLIC_KEY / TEMPLATE_OTP). Hubungi developer.'
      );
    }
    throw new Error('Gagal mengirim kode verifikasi. Periksa koneksi lalu coba lagi.');
  }
}

/**
 * Pantau realtime status verifikasi sebuah email — dipakai di layar SUPERADMIN
 * supaya tanda "Terverifikasi" muncul otomatis begitu pemilik email submit kode
 * yang benar, tanpa perlu refresh halaman.
 */
export function subscribeVerificationStatus(
  email: string,
  callback: (status: { verified: boolean; expired: boolean } | null) => void
) {
  return subscribeDoc<OtpDoc>(COLLECTION, docId(email), (data) => {
    if (!data) {
      callback(null);
      return;
    }
    const expired = data.expiresAt.toMillis() < Date.now();
    callback({ verified: data.verified, expired });
  });
}

/**
 * Submit kode OTP oleh PEMILIK EMAIL (belum login/tanpa akun sama sekali).
 * Dipakai di halaman publik /verifikasi-email. Kalau kode salah, Firestore
 * Security Rules akan menolak (permission-denied) — di sini kita tangkap dan
 * ubah jadi pesan yang jelas untuk user awam.
 *
 * Rule Firestore yang wajib dipasang untuk ini ada di rules-notes.md —
 * intinya: update HANYA diizinkan kalau field "code" yang dikirim cocok
 * persis dengan yang tersimpan, dan dokumen belum pernah verified=true
 * sebelumnya (sekali pakai). Kode aslinya sendiri TIDAK PERNAH bisa dibaca
 * langsung oleh pemilik email lewat Firestore (read tetap wajib login).
 */
export async function submitOtpCode(email: string, code: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, COLLECTION, docId(email)), {
      code: code.trim(),
      verified: true
    });
    return true;
  } catch {
    // permission-denied (kode salah/kadaluarsa/sudah pernah verified) ATAU error jaringan lain
    return false;
  }
}
