import { createDoc, getPaginated, where } from '@/firebase/firestore';

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

function keWaktu(value: unknown): number {
  const v = value as { toMillis?: () => number };
  return typeof v?.toMillis === 'function' ? v.toMillis() : 0;
}

export async function getLoginLogTerbaru(jumlah = 10) {
  // Sengaja HANYA filter 1 field (tipe) tanpa orderBy — where + orderBy field beda
  // butuh composite index yang harus dibuat manual di Firebase Console. Ambil batch
  // lebih besar lalu urutkan & potong di sisi klien (collection ini kecil, aman).
  const { docs } = await getPaginated<LoginLogEntry>(
    COLLECTION,
    [where('tipe', '==', 'login')],
    Math.max(jumlah * 5, 50)
  );
  return docs.sort((a, b) => keWaktu(b.createdAt) - keWaktu(a.createdAt)).slice(0, jumlah);
}
