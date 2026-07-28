import { createDoc, getPaginated, orderBy, where } from '@/firebase/firestore';

// Pakai collection /logs yang MEMANG SUDAH ADA rule-nya di rules-notes.md
// (allow create/read: if isLoggedIn()) — supaya fitur ini tidak butuh ubah
// Firestore Security Rules manual lagi di Firebase Console.
const COLLECTION = 'logs';

export type MetodeLogin = 'email' | 'username' | 'google';

export interface LoginLogEntry {
  id: string;
  tipe: 'login';
  email: string;
  metode: MetodeLogin;
  userAgent: string;
  createdAt?: unknown;
}

/**
 * Catat setiap kali berhasil login — BUKAN untuk audit multi-user (aplikasi ini
 * dipakai 1 petugas/1 perangkat), tapi jaga-jaga: kalau suatu hari ada percobaan
 * login dari perangkat lain, ada jejaknya di Pusat Bantuan.
 * Dipanggil "fire-and-forget" (tidak menghalangi proses login walau gagal ditulis).
 */
export async function catatLoginLog(email: string, metode: MetodeLogin) {
  try {
    await createDoc(COLLECTION, {
      tipe: 'login',
      email,
      metode,
      userAgent: navigator.userAgent
    });
  } catch {
    // Gagal mencatat log tidak boleh menggagalkan proses login itu sendiri
  }
}

export async function getLoginLogTerbaru(jumlah = 10) {
  const { docs } = await getPaginated<LoginLogEntry>(
    COLLECTION,
    [where('tipe', '==', 'login'), orderBy('createdAt', 'desc')],
    jumlah
  );
  return docs;
}
