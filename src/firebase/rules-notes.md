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

    // Koleksi PUBLIK khusus untuk lookup ringan {username, email} yang
    // dibutuhkan SEBELUM user login: (1) login pakai username, dan
    // (2) cek "email sudah terdaftar atau belum" di form Lupa Password.
    // Sengaja dipisah dari /users supaya field sensitif (PIN, role, dll)
    // tidak ikut kebuka ke publik. Field yang tersimpan di sini HANYA
    // username & email, tidak lebih.
    match /directory/{docId} {
      allow read: if true;
      allow write: if isLoggedIn();
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
