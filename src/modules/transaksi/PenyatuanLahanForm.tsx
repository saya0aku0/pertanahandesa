import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { PemilikFields } from '@/components/PemilikFields';
import { useDebounce } from '@/hooks/useDebounce';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { searchTanah } from '@/modules/master-tanah/tanah.service';
import { Tanah } from '@/modules/master-tanah/tanah.types';
import { buatRiwayatPenyatuanLahan } from './riwayat.service';
import { PEMILIK_KOSONG } from '@/types/pemilik.types';
import { useEffect } from 'react';

/**
 * Form Transaksi khusus "Penyatuan Lahan" — kebalikan dari Pecah Lahan:
 * pilih 2+ bidang SUMBER, lalu diarahkan ke Master Tanah untuk mengisi data
 * bidang GABUNGAN baru. Bidang sumber tidak pernah dihapus, hanya diarsipkan
 * (lihat riwayat.service.ts § buatRiwayatPenyatuanLahan / finalisasiPenyatuanLahan).
 */
export function PenyatuanLahanForm() {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [hasilCari, setHasilCari] = useState<Tanah[]>([]);
  const [searching, setSearching] = useState(false);
  const [dipilih, setDipilih] = useState<Tanah[]>([]);

  const [tanggalKejadian, setTanggalKejadian] = useState('');
  const [pemilikBaru, setPemilikBaru] = useState({ ...PEMILIK_KOSONG });
  const [keterangan, setKeterangan] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { uploadFiles, uploading, progressLabel } = useCloudinaryUpload();

  useEffect(() => {
    if (!debouncedKeyword) {
      setHasilCari([]);
      return;
    }
    setSearching(true);
    searchTanah(debouncedKeyword)
      .then((results) => {
        // Sembunyikan bidang yang sudah dipilih & yang sudah berstatus "sudah-digabung"
        const idsTerpilih = new Set(dipilih.map((t) => t.id));
        setHasilCari(
          results.filter((t) => !idsTerpilih.has(t.id) && t.statusGabung !== 'sudah-digabung')
        );
      })
      .finally(() => setSearching(false));
  }, [debouncedKeyword, dipilih]);

  function tambahBidang(t: Tanah) {
    setDipilih((d) => [...d, t]);
    setKeyword('');
    setHasilCari([]);
  }

  function hapusBidang(id: string) {
    setDipilih((d) => d.filter((t) => t.id !== id));
  }

  const totalLuasSumber = dipilih.reduce((sum, t) => sum + t.luas, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (dipilih.length < 2) {
      setError('Pilih minimal 2 bidang tanah yang akan digabung.');
      return;
    }
    if (!tanggalKejadian || !pemilikBaru.nama || !pemilikBaru.nik || !pemilikBaru.alamatLengkap) {
      setError('Tanggal kejadian dan data pemilik baru (Nama, NIK, Alamat) wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let dokumenUrls: string[] = [];
      if (files.length > 0) {
        dokumenUrls = await uploadFiles(files);
      }

      const riwayatIds = await buatRiwayatPenyatuanLahan({
        sourceTanahIds: dipilih.map((t) => t.id),
        tanggalKejadian,
        pemilikBaru,
        keterangan,
        dokumenUrls
      });

      // Lanjut ke Master Tanah untuk isi data bidang GABUNGAN baru (nomor sertifikat
      // baru, luas gabungan, lokasi, dll) — parentTanahIds & sourceRiwayatIds dibawa
      // lewat query string supaya TanahForm tahu ini bagian dari alur penyatuan.
      const parentTanahIds = dipilih.map((t) => t.id).join(',');
      const sourceRiwayatIds = riwayatIds.join(',');
      navigate(
        `/master-tanah/tambah?returnTo=/transaksi&parentTanahIds=${parentTanahIds}&sourceRiwayatIds=${sourceRiwayatIds}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi penyatuan lahan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <p className="text-sm bg-primary-50 text-primary-800 p-3 rounded-lg">
        Data bidang sumber TIDAK akan dihapus — hanya diarsipkan sebagai "sudah digabung",
        sehingga riwayat kepemilikan tetap bisa ditelusuri selamanya.
      </p>

      {/* Multi-pilih bidang sumber */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cari & Pilih Bidang yang Akan Digabung (minimal 2) *
        </label>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Ketik nomor sertifikat..."
          className="w-full border rounded-lg p-3 min-h-[44px]"
        />
        {searching && <p className="text-xs text-gray-400 mt-1">Mencari...</p>}

        {hasilCari.length > 0 && (
          <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
            {hasilCari.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => tambahBidang(t)}
                className="w-full text-left p-3 min-h-[44px] hover:bg-primary-50 text-sm border-b last:border-0"
              >
                <span className="font-medium">{t.nomorSertifikat}</span>
                <span className="text-gray-500"> — {t.pemilikSaatIni?.nama} ({t.luas.toLocaleString('id-ID')} m²)</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Daftar bidang terpilih (chips) */}
      {dipilih.length > 0 && (
        <div className="space-y-2">
          {dipilih.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-white border rounded-lg p-3 text-sm"
            >
              <div>
                <span className="font-medium">{t.nomorSertifikat}</span>
                <span className="text-gray-500"> — {t.luas.toLocaleString('id-ID')} m² — {t.pemilikSaatIni?.nama}</span>
              </div>
              <button
                type="button"
                onClick={() => hapusBidang(t.id)}
                className="text-red-600 text-xs hover:underline min-h-[44px] px-2"
              >
                Hapus
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-500">
            Total luas gabungan (referensi): {totalLuasSumber.toLocaleString('id-ID')} m² —
            luas final bidang baru tetap diisi manual di langkah berikutnya.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kejadian *</label>
        <input
          type="date"
          value={tanggalKejadian}
          onChange={(e) => setTanggalKejadian(e.target.value)}
          className="w-full border rounded-lg p-3 min-h-[44px]"
          required
        />
      </div>

      <PemilikFields label="Data Pemilik Bidang Gabungan" value={pemilikBaru} onChange={setPemilikBaru} />

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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dokumen/Foto Pendukung
        </label>
        <input
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="w-full border rounded-lg p-3"
        />
        {uploading && <p className="text-xs text-gray-500 mt-1">{progressLabel}</p>}
      </div>

      <div className="flex flex-col-reverse md:flex-row gap-2 md:justify-end">
        <Button type="button" variant="secondary" onClick={() => navigate('/transaksi')} disabled={saving || uploading}>
          Batal
        </Button>
        <Button type="submit" disabled={saving || uploading}>
          {saving || uploading ? 'Memproses...' : 'Lanjut: Isi Data Bidang Gabungan →'}
        </Button>
      </div>
    </form>
  );
}
