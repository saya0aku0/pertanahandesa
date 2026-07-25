import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// =====================================================================
// ⚠️ PLACEHOLDER API KEY — Ganti nilai di file .env (lihat .env.example)
//    Jangan hardcode kredensial asli di file ini.
// =====================================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY, // <<PLACEHOLDER_FIREBASE_API_KEY>>
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, // <<PLACEHOLDER_FIREBASE_AUTH_DOMAIN>>
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, // <<PLACEHOLDER_FIREBASE_PROJECT_ID>>
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, // <<PLACEHOLDER_FIREBASE_STORAGE_BUCKET>>
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, // <<PLACEHOLDER_FIREBASE_MESSAGING_SENDER_ID>>
  appId: import.meta.env.VITE_FIREBASE_APP_ID, // <<PLACEHOLDER_FIREBASE_APP_ID>>
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // opsional, untuk Firebase Analytics
};

if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '⚠️ Firebase belum dikonfigurasi. Salin .env.example ke .env dan isi kredensial asli.'
  );
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Analytics hanya berjalan di browser yang mendukung (tidak di SSR/server) — dibungkus aman
export let analytics: ReturnType<typeof getAnalytics> | undefined;
if (firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  });
}
