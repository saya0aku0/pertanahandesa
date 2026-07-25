// =====================================================================
// ⚠️ PLACEHOLDER API KEY — Isi via .env (VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET)
//    Cloudinary Free Plan: 25 credit/bulan, maks file 10MB (§5.2 PRD)
// =====================================================================
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string; // <<PLACEHOLDER_CLOUDINARY_CLOUD_NAME>>
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string; // <<PLACEHOLDER_CLOUDINARY_UPLOAD_PRESET>>

const MAX_FILE_SIZE_MB = 10;

export class CloudinaryError extends Error {}

/**
 * Kompresi gambar di browser sebelum upload (±1600px, kualitas ~75%) — wajib sesuai §13
 * supaya hemat kuota Cloudinary (25 credit/bulan).
 */
export async function compressImage(file: File, maxWidth = 1600, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new CloudinaryError('Canvas tidak didukung browser ini.'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new CloudinaryError('Gagal kompres gambar.'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new CloudinaryError('File bukan gambar valid.'));
    reader.onerror = () => reject(new CloudinaryError('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload file/gambar ke Cloudinary (unsigned upload preset, aman untuk client-side).
 * Mengembalikan secure_url yang disimpan di field `dokumenUrls` pada dokumen riwayat.
 */
export async function uploadToCloudinary(file: File | Blob, filename = 'dokumen'): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new CloudinaryError(
      'Cloudinary belum dikonfigurasi. Isi VITE_CLOUDINARY_CLOUD_NAME & VITE_CLOUDINARY_UPLOAD_PRESET di .env'
    );
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new CloudinaryError(`Ukuran file melebihi batas ${MAX_FILE_SIZE_MB}MB.`);
  }

  const formData = new FormData();
  formData.append('file', file, filename);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new CloudinaryError(`Upload Cloudinary gagal: ${errBody}`);
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
