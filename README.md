# Aplikasi Riwayat Tanah Desa

Aplikasi pencatatan riwayat kepemilikan tanah desa — 100% gratis, dibangun dengan
React + TypeScript + Firebase (Spark Plan) + Cloudinary (Free) + EmailJS (Free).

## ⚠️ Sebelum Menjalankan — Wajib Isi API Key

Semua kredensial masih **placeholder**. Cari tag `<<PLACEHOLDER_...>>` di file-file berikut
dan ganti dengan kredensial asli:

1. **`.env`** (salin dari `.env.example`) — isi semua `VITE_FIREBASE_*`, `VITE_CLOUDINARY_*`, `VITE_EMAILJS_*`
2. **`src/modules/help/developerProfile.ts`** — ganti data kontak developer

Placeholder juga ada sebagai komentar penjelas di:
- `src/firebase/config.ts`
- `src/services/cloudinary.ts`
- `src/services/emailjs.ts`

## ✅ Status Kredensial

Semua kredensial sudah terisi di `.env` — Firebase, Cloudinary, dan EmailJS (OTP saja).
Fitur notifikasi email riwayat baru **tidak digunakan** (disederhanakan agar hemat kuota EmailJS,
200 request/bulan seluruhnya dipakai untuk OTP lupa password).

Sebelum menjalankan, pastikan di **Firebase Console** (project `pertanahandesa`):
1. Aktifkan **Authentication → Sign-in method → Email/Password**
2. Aktifkan **Firestore Database** (mode production)
3. Pasang **Security Rules** dari `src/firebase/rules-notes.md`
4. Buat 1 user pertama secara manual di Authentication (untuk login awal Superadmin)

## Langkah Setup

```bash
# 1. Install dependency
npm install

# 2. Salin file environment
cp .env.example .env
# lalu edit .env, isi semua PLACEHOLDER dengan kredensial asli

# 3. Jalankan mode development
npm run dev
```

### Cara mendapatkan kredensial:

| Layanan | Langkah |
|---|---|
| **Firebase** | Buat project di [console.firebase.google.com](https://console.firebase.google.com) (pilih Spark/Gratis) → Project Settings → General → scroll ke "Your apps" → Web App → copy `firebaseConfig`. Aktifkan **Authentication (Email/Password)** dan **Firestore Database**. |
| **Cloudinary** | Daftar di [cloudinary.com](https://cloudinary.com) (Free Plan) → Dashboard → copy `Cloud Name`. Lalu buat **Upload Preset** baru dengan mode **Unsigned** di Settings > Upload. |
| **EmailJS** | Daftar di [emailjs.com](https://emailjs.com) (Free Plan) → hubungkan Email Service → catat `Service ID` → buat 2 Template (notifikasi & OTP) → catat `Template ID` masing-masing → catat `Public Key` di Account > General. |

### Firestore Security Rules

Pasang manual di Firebase Console > Firestore Database > Rules. Lihat contoh lengkap di
`src/firebase/rules-notes.md`.

## Struktur Folder

```
src/
├── firebase/         # config, firestore helper, auth helper
├── services/         # cloudinary.ts, emailjs.ts
├── hooks/            # useDebounce, useFirestoreCollection, useFirestoreDoc, useCloudinaryUpload
├── components/       # Button, Table, Modal, ConfirmDialog, LoadingSpinner, ProtectedRoute
├── layouts/           # MainLayout (sidebar + bottom nav), AvatarMenu
└── modules/
    ├── auth/          # Login, ForgotPassword (OTP hybrid)
    ├── profil/        # Setting Profil Akun
    ├── master-tanah/  # Dashboard, Tabel, Form, Silsilah, Export Excel/PDF
    ├── transaksi/     # Form Transaksi, relasiGuard.ts (guard relasi §11), Pages
    ├── kelola-user/   # Kelola akun Owner/Staff
    └── help/          # Pusat Bantuan (FAQ + kontak developer)
```

## Deploy Gratis

- **Vercel Hobby**: `npm run build` lalu deploy folder `dist/`, atau hubungkan repo GitHub langsung ke Vercel.
- Set semua environment variable (`VITE_...`) yang sama seperti di `.env` pada dashboard Vercel > Settings > Environment Variables.

## Catatan Penting

- Tidak ada Cloud Functions — semua logic berjalan di frontend (client-side), sesuai desain hemat biaya.
- Guard relasi (3 skenario, lihat `src/modules/transaksi/relasiGuard.ts`) WAJIB dijalankan sebelum hapus/edit data kritikal.
- Master Tanah adalah single source of truth — data tanah baru hanya bisa dibuat lewat menu Master Tanah (termasuk dari alur redirect di form Transaksi).
