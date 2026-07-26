import { useEffect, useState } from 'react';
import { FormActionBar } from '@/components/FormActionBar';
import { PemilikFields } from '@/components/PemilikFields';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { PEMILIK_KOSONG } from '@/types/pemilik.types';
import { Tanah } from '@/modules/master-tanah/tanah.types';
import { simpanPecahLahan } from './riwayat.service';
import { PecahLahanBagian, Riwayat } from './riwayat.types';

interface PecahLahanFormProps {
  tanah: Tanah;
  alasan: 'jual-beli' | 'waris' | 'pembaruan-data';
  /** Kalau melanjutkan draft yang sebelumnya ditekan Pending */
  draftRiwayat?: Riwayat | null;
  onBatal: () => void;
  onSelesai: () => void;
}

function bagianKosong(): PecahLahanBagian {
  return { luas: 0, nomorSuratUkur: '', nomorSertifikatBaru: '', pemilikBaru: { ...PEMILIK_KOSONG } };
}

/**
 * Form Pecah Lahan — dipakai ketika pemilik sebelumnya hanya menjual sebagian,
 * atau punya ahli waris lebih dari satu, sehingga 1 bidang dipecah jadi beberapa
 * bagian dengan nomor surat ukur, nomor sertifikat baru, dan pemilik baru masing-masing.
 */
export function PecahLahanForm({ tanah, alasan, draftRiwayat, onBatal, onSelesai }: PecahLahanFormProps) {
  const [tanggalKejadian, setTanggalKejadian] = useState(draftRiwayat?.tanggalKejadian ?? '');
  const [keterangan, setKeterangan] = useState(draftRiwayat?.keterangan ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [jumlahBagian, setJumlahBagian] = useState(draftRiwayat?.pecahBagian?.length || 2);
  const [bagian, setBagian] = useState<PecahLahanBagian[]>(
    draftRiwayat?.pecahBagian && draftRiwayat.pecahBagian.length > 0
      ? draftRiwayat.pecahBagian
      : [bagianKosong(), bagianKosong()]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { uploadFiles, uploading, progressLabel } = useCloudinaryUpload();

  // Sesuaikan panjang array bagian saat jumlah bagian diubah, tanpa menghapus data yang sudah diisi
  useEffect(() => {
    setBagian((prev) => {
      const n = Math.max(2, jumlahBagian || 0);
      if (n === prev.length) return prev;
      if (n > prev.length) {
        return [...prev, ...Array.from({ length: n - prev.length }, bagianKosong)];
      }
      return prev.slice(0, n);
    });
  }, [jumlahBagian]);

  function updateBagian(idx: number, patch: Partial<PecahLahanBagian>) {
    setBagian((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }

  const totalLuasBagian = bagian.reduce((sum, b) => sum + (Number(b.luas) || 0), 0);
  const selisihLuas = Math.round((totalLuasBagian - tanah.luas) * 100) / 100;

  function validasi(status: 'draft' | 'final'): boolean {
    if (!tanggalKejadian) {
      setError('Tanggal kejadian wajib diisi.');
      return false;
    }
    if (status === 'final') {
      for (const [i, b] of bagian.entries()) {
        if (!b.luas || !b.nomorSuratUkur || !b.nomorSertifikatBaru) {
          setError(`Bagian ${i + 1}: luas, nomor surat ukur, dan nomor sertifikat baru wajib diisi.`);
          return false;
        }
        if (!b.pemilikBaru.nama || !b.pemilikBaru.nik || !b.pemilikBaru.alamatLengkap) {
          setError(`Bagian ${i + 1}: data pemilik baru (Nama, NIK, Alamat Lengkap) wajib diisi lengkap.`);
          return false;
        }
      }
    }
    return true;
  }

  async function doSubmit(status: 'draft' | 'final') {
    if (!validasi(status)) return;
    setSaving(true);
    setError(null);
    try {
      let dokumenUrls = draftRiwayat?.dokumenUrls ?? [];
      if (files.length > 0) {
        dokumenUrls = [...dokumenUrls, ...(await uploadFiles(files))];
      }
      await simpanPecahLahan({
        tanahId: tanah.id,
        jenisPeristiwa: alasan,
        tanggalKejadian,
        keterangan,
        dokumenUrls,
        pecahBagian: bagian,
        status,
        existingRiwayatId: draftRiwayat?.id
      });
      onSelesai();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan Pecah Lahan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm bg-primary-50 text-primary-800 p-3 rounded-lg">
        Bidang induk <strong>{tanah.nomorSertifikat}</strong> (luas {tanah.luas.toLocaleString('id-ID')} m²)
        akan dipecah menjadi beberapa bagian. Setiap bagian akan menjadi bidang tanah baru yang
        tertaut ke bidang induk ini, dan bidang induk akan diarsipkan (tidak dihapus).
      </p>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kejadian *</label>
        <input
          type="date"
          value={tanggalKejadian}
          onChange={(e) => setTanggalKejadian(e.target.value)}
          className="w-full border rounded-lg p-3 min-h-[44px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dipecah Berapa Bagian? *</label>
        <input
          type="number"
          inputMode="numeric"
          min={2}
          value={jumlahBagian}
          onChange={(e) => setJumlahBagian(Math.max(2, Number(e.target.value)))}
          className="w-full border rounded-lg p-3 min-h-[44px]"
        />
      </div>

      {bagian.map((b, idx) => (
        <div key={idx} className="border-2 rounded-lg p-3 space-y-3">
          <p className="text-sm font-semibold">Bagian {idx + 1}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Luas Lahan (m²) *</label>
            <input
              type="number"
              inputMode="numeric"
              value={b.luas || ''}
              onChange={(e) => updateBagian(idx, { luas: Number(e.target.value) })}
              className="w-full border rounded-lg p-3 min-h-[44px]"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Surat Ukur *</label>
            <input
              value={b.nomorSuratUkur}
              onChange={(e) => updateBagian(idx, { nomorSuratUkur: e.target.value })}
              className="w-full border rounded-lg p-3 min-h-[44px]"
              placeholder="Isi setelah proses ukur ulang selesai"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Sertifikat Baru *</label>
            <input
              value={b.nomorSertifikatBaru}
              onChange={(e) => updateBagian(idx, { nomorSertifikatBaru: e.target.value })}
              className="w-full border rounded-lg p-3 min-h-[44px]"
              placeholder="Isi setelah sertifikat baru terbit"
            />
          </div>
          <PemilikFields
            label={`Data Pemilik Baru Bagian ${idx + 1}`}
            value={b.pemilikBaru}
            onChange={(v) => updateBagian(idx, { pemilikBaru: v })}
          />
        </div>
      ))}

      <p className={`text-xs ${selisihLuas === 0 ? 'text-gray-400' : 'text-amber-600'}`}>
        Total luas semua bagian: {totalLuasBagian.toLocaleString('id-ID')} m²
        {selisihLuas !== 0 &&
          ` — selisih ${selisihLuas > 0 ? '+' : ''}${selisihLuas.toLocaleString('id-ID')} m² dari luas bidang induk (${tanah.luas.toLocaleString('id-ID')} m²), cek kembali sebelum Simpan.`}
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
        <textarea
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          className="w-full border rounded-lg p-3"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dokumen/Foto Pendukung</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="w-full border rounded-lg p-3"
        />
        {uploading && <p className="text-xs text-gray-500 mt-1">{progressLabel}</p>}
        {draftRiwayat?.dokumenUrls && draftRiwayat.dokumenUrls.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {draftRiwayat.dokumenUrls.length} dokumen dari draft sebelumnya akan tetap disimpan.
          </p>
        )}
      </div>

      <FormActionBar
        saving={saving || uploading}
        onSimpan={() => doSubmit('final')}
        onPending={() => doSubmit('draft')}
        onBatal={onBatal}
        simpanLabel="Simpan & Buat Bidang Baru"
      />
    </div>
  );
}
