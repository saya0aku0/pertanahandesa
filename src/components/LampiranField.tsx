/**
 * Sub-form Lampiran — dipakai di SEMUA form (Master Tanah & Transaksi) supaya
 * setiap data bisa dilengkapi bukti pendukung dengan 2 cara:
 *   1) Tempel Link Google Drive (boleh lebih dari satu)
 *   2) Upload Foto/Dokumen langsung ke Cloudinary (dikompres dulu, §13)
 *
 * Komponen ini "controlled" — parent yang menyimpan state driveLinks & files,
 * lalu saat submit, parent memanggil uploadFiles(files) dan menggabungkan hasilnya
 * dengan driveLinks + existingUrls jadi 1 array `dokumenUrls`/`lampiranUrls`.
 */
export function isGoogleDriveLink(url: string): boolean {
  return /drive\.google\.com|docs\.google\.com/i.test(url);
}

interface LampiranFieldProps {
  label?: string;
  driveLinks: string[];
  onDriveLinksChange: (links: string[]) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  /** Lampiran yang sudah tersimpan sebelumnya (mis. saat edit data / lanjutkan draft) */
  existingUrls?: string[];
  uploading?: boolean;
  progressLabel?: string;
}

export function LampiranField({
  label = 'Lampiran',
  driveLinks,
  onDriveLinksChange,
  files,
  onFilesChange,
  existingUrls = [],
  uploading = false,
  progressLabel = ''
}: LampiranFieldProps) {
  function updateLink(idx: number, value: string) {
    const next = [...driveLinks];
    next[idx] = value;
    onDriveLinksChange(next);
  }

  function tambahLink() {
    onDriveLinksChange([...driveLinks, '']);
  }

  function hapusLink(idx: number) {
    onDriveLinksChange(driveLinks.filter((_, i) => i !== idx));
  }

  function hapusFile(idx: number) {
    onFilesChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-xs text-gray-500">
        Lampirkan bukti pendukung berupa link Google Drive dan/atau foto/dokumen (upload langsung).
      </p>

      {/* Existing/tersimpan sebelumnya */}
      {existingUrls.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Lampiran tersimpan:</p>
          {existingUrls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-primary-700 hover:underline truncate"
            >
              {isGoogleDriveLink(url) ? '📁 Google Drive — ' : '📎 '}
              {url}
            </a>
          ))}
        </div>
      )}

      {/* Link Google Drive */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500">Link Google Drive</p>
        {driveLinks.map((link, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              value={link}
              onChange={(e) => updateLink(idx, e.target.value)}
              placeholder="https://drive.google.com/..."
              className="flex-1 border rounded-lg p-3 min-h-[44px] bg-white text-sm"
            />
            <button
              type="button"
              onClick={() => hapusLink(idx)}
              className="shrink-0 text-red-600 text-xs hover:underline px-2"
            >
              Hapus
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={tambahLink}
          className="text-xs text-primary-700 hover:underline"
        >
          + Tambah Link Google Drive
        </button>
      </div>

      {/* Upload foto/dokumen ke Cloudinary */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Upload Foto/Dokumen (Cloudinary)</p>
        {/* capture="environment" agar bisa langsung akses kamera HP, sesuai §13 Mobile UX */}
        <input
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          multiple
          onChange={(e) => onFilesChange(Array.from(e.target.files ?? []))}
          className="w-full border rounded-lg p-3 bg-white text-sm"
        />
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, idx) => (
              <li key={idx} className="flex items-center justify-between text-xs text-gray-600">
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => hapusFile(idx)}
                  className="text-red-600 hover:underline px-2"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
        {uploading && <p className="text-xs text-gray-500 mt-1">{progressLabel}</p>}
      </div>
    </div>
  );
}
