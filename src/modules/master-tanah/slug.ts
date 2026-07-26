/**
 * Slug untuk halaman "Lihat Detail Sertifikat" — dibuat otomatis dari Nomor Sertifikat
 * supaya setiap bidang tanah punya link yang mudah dibaca & dibagikan, mis:
 *   Nomor Sertifikat "123/Ds.Sukamaju/2024" -> /master-tanah/sertifikat/123-ds-sukamaju-2024
 *
 * Slug disimpan di field `slug` pada dokumen `tanah` (lihat tanah.service.ts) supaya bisa
 * dicari langsung lewat Firestore query (getDocByField), tanpa harus load seluruh koleksi.
 */
export function buatSlugSertifikat(nomorSertifikat: string): string {
  return nomorSertifikat
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // hilangkan diakritik
    .replace(/[^a-z0-9]+/g, '-') // non alfanumerik -> strip
    .replace(/^-+|-+$/g, '') // rapikan strip di awal/akhir
    .slice(0, 120);
}
