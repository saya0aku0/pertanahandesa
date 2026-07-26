/**
 * Gabungkan lampiran dari 3 sumber jadi 1 array URL bersih, dipakai di semua form
 * (Master Tanah & Transaksi) sebelum disimpan sebagai `dokumenUrls` / `lampiranUrls`.
 */
export function gabungkanLampiran(
  existingUrls: string[] | undefined,
  driveLinks: string[],
  uploadedUrls: string[]
): string[] {
  const linkBersih = driveLinks.map((l) => l.trim()).filter(Boolean);
  return [...(existingUrls ?? []), ...linkBersih, ...uploadedUrls];
}
