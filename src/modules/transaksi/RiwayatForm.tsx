import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { searchTanah, getTanah } from '@/modules/master-tanah/tanah.service';
import { Tanah } from '@/modules/master-tanah/tanah.types';
import { createRiwayat } from './riwayat.service';
import { JenisPeristiwa } from './riwayat.types';

const JENIS_OPTIONS: { value: JenisPeristiwa; label: string }[] = [
  { value: 'jual-beli', label: 'Jual-Beli' },
  { value: 'waris', label: 'Waris' },
  { value: 'pecah-lahan', label: 'Pecah Lahan' },
  { value: 'belum-ada-transaksi', label: 'Belum Ada Transaksi' }
];

/**
 * Form Transaksi — field pertama WAJIB dropdown pencarian (searchable), bukan input teks bebas.
 * Mengikuti alur wajib §10.3: cari di /tanah → jika tidak ada, arahkan buat data tanah baru dulu.
 */
export function RiwayatForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [hasilCari, setHasilCari] = useState<Tanah[]>([]);
  const [selectedTanah, setSelectedTanah] = useState<Tanah | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);

  const [jenisPeristiwa, setJenisPeristiwa] = useState<JenisPeristiwa>('jual-beli');
  const [tanggalKejadian, setTanggalKejadian] = useState('');
  const [namaPemilikBaru, setNamaPemilikBaru] = useState('');
  const [pembeli, setPembeli] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { uploadFiles, uploading, progressLabel } = useCloudinaryUpload();

  // Auto-select bidang tanah baru jika kembali dari alur "Buat Data Tanah Baru" (§10.3 step 5)
  useEffect(() => {
    const bidangBaruId = searchParams.get('bidangBaruId');
    if (bidangBaruId) {
      getTanah(bidangBaruId).then((t) => {
        if (t) {
          setSelectedTanah(t);
          setKeyword(t.nomorSertifikat);
        }
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!debouncedKeyword || selectedTanah) {
      setHasilCari([]);
      setNotFound(false);
      return;
    }
    setSearching(true);
    searchTanah(debouncedKeyword)
      .then((results) => {
        setHasilCari(results);
        setNotFound(results.length === 0);
      })
      .finally(() => setSearching(false));
  }, [debouncedKeyword, selectedTanah]);

  function handlePilihTanah(t: Tanah) {
    setSelectedTanah(t);
    setKeyword(t.nomorSertifikat);
    setHasilCari([]);
    setNotFound(false);
  }

  function handleBuatDataBaru() {
    navigate(
      `/master-tanah/tambah?nomorSertifikat=${encodeURIComponent(keyword)}&returnTo=/transaksi/tambah`
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTanah) {
      setError('Pilih bidang tanah terlebih dahulu dari dropdown pencarian.');
      return;
    }
    if (!tanggalKejadian || !namaPemilikBaru) {
      setError('Tanggal kejadian dan nama pemilik baru wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let dokumenUrls: string[] = [];
      if (files.length > 0) {
        dokumenUrls = await uploadFiles(files);
      }

      const riwayatId = await createRiwayat({
        tanahId: selectedTanah.id,
        jenisPeristiwa,
        tanggalKejadian,
        namaPemilikSebelumnya: selectedTanah.pemilikSaatIni,
        namaPemilikBaru,
        pembeli,
        keterangan,
        dokumenUrls
      });

      if (jenisPeristiwa === 'pecah-lahan') {
        // Untuk pecah lahan, arahkan sekdes membuat bidang anak lewat Master Tanah,
        // dengan parentTanahId & sourceRiwayatId sudah terhubung otomatis.
        navigate(
          `/master-tanah/tambah?returnTo=/transaksi&parentTanahId=${selectedTanah.id}&sourceRiwayatId=${riwayatId}`
        );
        return;
      }

      navigate('/transaksi');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      {/* Field pertama: dropdown pencarian searchable (§10.3 step 1-2) */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cari Nomor Sertifikat / Surat Ukur / Nama Pemilik *
        </label>
        <input
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setSelectedTanah(null);
          }}
          placeholder="Ketik untuk mencari bidang tanah..."
          className="w-full border rounded-lg p-3 min-h-[44px]"
        />
        {searching && <p className="text-xs text-gray-400 mt-1">Mencari...</p>}

        {hasilCari.length > 0 && (
          <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
            {hasilCari.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handlePilihTanah(t)}
                className="w-full text-left p-3 min-h-[44px] hover:bg-primary-50 text-sm border-b last:border-0"
              >
                <span className="font-medium">{t.nomorSertifikat}</span>
                <span className="text-gray-500"> — {t.pemilikSaatIni}</span>
              </button>
            ))}
          </div>
        )}

        {notFound && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm space-y-2">
            <p>
              Nomor sertifikat/surat ini belum terdaftar di Master Tanah. Data bidang tanah harus
              dibuat dulu sebelum bisa dicatat transaksinya.
            </p>
            <Button type="button" variant="secondary" onClick={handleBuatDataBaru}>
              Buat Data Tanah Baru
            </Button>
          </div>
        )}

        {selectedTanah && (
          <p className="text-xs text-green-700 mt-1">
            ✓ Bidang terpilih: {selectedTanah.nomorSertifikat} ({selectedTanah.lokasi})
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Peristiwa *</label>
        <select
          value={jenisPeristiwa}
          onChange={(e) => setJenisPeristiwa(e.target.value as JenisPeristiwa)}
          className="w-full border rounded-lg p-3 min-h-[44px]"
        >
          {JENIS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik Baru *</label>
        <input
          value={namaPemilikBaru}
          onChange={(e) => setNamaPemilikBaru(e.target.value)}
          className="w-full border rounded-lg p-3 min-h-[44px]"
          required
        />
      </div>

      {jenisPeristiwa === 'jual-beli' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pembeli</label>
          <input
            value={pembeli}
            onChange={(e) => setPembeli(e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
          />
        </div>
      )}

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
        {/* capture="environment" agar bisa langsung akses kamera HP, sesuai §13 Mobile UX */}
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

      <Button type="submit" disabled={saving || uploading} className="w-full">
        {saving || uploading ? 'Menyimpan...' : 'Simpan Transaksi'}
      </Button>
    </form>
  );
}
