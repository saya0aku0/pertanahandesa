import { useState } from 'react';
import { compressImage, uploadToCloudinary } from '@/services/cloudinary';

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function uploadFiles(files: File[]): Promise<string[]> {
    setUploading(true);
    setError(null);
    const urls: string[] = [];
    try {
      for (const file of files) {
        setProgressLabel(`Mengompresi ${file.name}...`);
        const isImage = file.type.startsWith('image/');
        const payload = isImage ? await compressImage(file) : file;
        setProgressLabel(`Mengunggah ${file.name}...`);
        const url = await uploadToCloudinary(payload, file.name);
        urls.push(url);
      }
      return urls;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah dokumen.');
      throw err;
    } finally {
      setUploading(false);
      setProgressLabel('');
    }
  }

  return { uploadFiles, uploading, progressLabel, error };
}
