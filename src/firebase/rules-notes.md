# Catatan Firestore Security Rules

Rules ini **wajib** dipasang manual di Firebase Console > Firestore > Rules.
Validasi tidak boleh hanya di frontend (§12 PRD).

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isLoggedIn() {
      return request.auth != null;
    }

    match /tanah/{tanahId} {
      allow read: if isLoggedIn();
      allow create: if isLoggedIn()
        && request.resource.data.luas is number
        && request.resource.data.luas >= 0
        && request.resource.data.nomorSertifikat is string
        && request.resource.data.nomorSertifikat.size() > 0;
      allow update, delete: if isLoggedIn();
    }

    match /riwayat/{riwayatId} {
      allow read: if isLoggedIn();
      allow create: if isLoggedIn()
        && request.resource.data.tanahId is string
        && request.resource.data.jenisPeristiwa is string;
      allow update, delete: if isLoggedIn();
    }

    match /users/{userId} {
      allow read: if isLoggedIn();
      allow write: if isLoggedIn(); // tanpa RBAC kompleks, sesuai §4
    }

    match /otp/{email} {
      allow read, write: if isLoggedIn();
    }

    match /logs/{logId} {
      allow create: if isLoggedIn();
      allow read: if isLoggedIn();
    }
  }
}
```

Catatan: karena tidak ada RBAC (§4), rules ini hanya memastikan user sudah login
dan field wajib tidak kosong / luas tidak negatif — bukan pembatasan hak akses antar role.

## Catatan tambahan: collection `/logs`

Dipakai untuk mencatat riwayat login (lihat `src/modules/auth/loginLog.service.ts`,
ditampilkan di halaman Pusat Bantuan). Query-nya memfilter `tipe == 'login'` sekaligus
mengurutkan `createdAt` menurun, jadi Firestore akan minta **composite index** saat
pertama kali dijalankan. Kalau muncul error "The query requires an index" di console
browser, klik saja link yang diberikan Firestore di pesan error tersebut (otomatis
membuatkan index yang tepat, gratis di Spark Plan, prosesnya cuma beberapa menit).
