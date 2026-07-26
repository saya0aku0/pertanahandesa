import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormActionBar } from '@/components/FormActionBar';
import { PemilikFields } from '@/components/PemilikFields';
import { LampiranField } from '@/components/LampiranField';
import { useDebounce } from '@/hooks/useDebounce';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { searchTanah, getTanah } from '@/modules/master-tanah/tanah.service';
import { Tanah } from '@/modules/master-tanah/tanah.types';
import { createRiwayat } from './riwayat.service';
import { JenisPeristiwa } from './riwayat.types';
import { PEMILIK_KOSONG } from '@/types/pemilik.types';
import { gabungkanLampiran } from '@/utils/lampiran';

const JENIS_OPTIONS: { value: JenisPeristiwa; label: string }[] = [
  { value: 'jual-beli', label: 'Jual-Beli' },
  { value: 'waris', label: 'Waris' },
  { value: 'pembaruan-data', label: 'Pembaruan Data Saja' },
  { value: 'pecah-lahan', label: 'Pecah Lahan' },
  { value: 'belum-ada-transaksi', label: 'Belum Ada Transaksi' }
];

/**
 * Form Transaksi — field pertama WAJIB dropdown pencarian (searchable), bukan input teks bebas.
 * Mengikuti alur wajib §10.3: cari di /tanah → jika tidak ada, arahkan buat data tanah baru dulu.
 * Untuk alur "Perubahan Data" yang lebih lengkap (alasan → luas tetap? → pemilik baru / pecah
 * lahan), lihat PerubahanDataForm.tsx yang dipicu dari tombol di Master Tanah.
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
  const [pemilikBaru, setPemilikBaru] = useState({ ...PEMILIK_KOSONG });
  const [pembeli, setPembeli] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [driveLinks, setDriveLinks] = useState<string[]>([]);
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

  function validasi(status: 'draft' | 'final'): boolean {
    if (!selectedTanah) {
      setError('Pilih bidang tanah terlebih dahulu dari dropdown pencarian.');
      return false;
    }
    if (!tanggalKejadian) {
      setError('Tanggal kejadian wajib diisi.');
      return false;
    }
    if (
      status === 'final' &&
      (!pemilikBaru.nama || !pemilikBaru.nik || !pemilikBaru.alamatLengkap)
    ) {
      setError('Data pemilik baru (Nama, NIK, Alamat Lengkap) wajib diisi lengkap.');
      return false;
    }
    return true;
  }

  async function doSubmit(status: 'draft' | 'final') {
    if (!validasi(status) || !selectedTanah) return;

    setSaving(true);
    setError(null);
    try {
      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        uploadedUrls = await uploadFiles(files);
      }
      const dokumenUrls = gabungkanLampiran(undefined, driveLinks, uploadedUrls);

      const riwayatId = await createRiwayat({
        tanahId: selectedTanah.id,
        jenisPeristiwa,
        tanggalKejadian,
        pemilikSebelumnya: selectedTanah.pemilikSaatIni,
        pemilikBaru,
        pembeli,
        keterangan,
        dokumenUrls,
        status
      });

      if (status === 'final' && jenisPeristiwa === 'pecah-lahan') {
        // Untuk pecah lahan, arahkan sekdes membuat bidang anak lewat Master Tanah,
        // dengan parentTanahId & sourceRiwayatId sudah terhubung otomatis.
        // (Alur pecah lahan yang lebih lengkap — banyak bagian sekaligus — ada di
        // tombol "Perubahan Data" pada Master Tanah / PerubahanDataForm.tsx.)
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

  function handleBatal() {
    navigate('/transaksi');
  }

  return (
    <div className="space-y-4 max-w-lg">
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
                <span className="text-gray-500"> — {t.pemilikSaatIni?.nama}</span>
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
            <button
              type="button"
              onClick={handleBuatDataBaru}
              className="min-h-[44px] px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
            >
              Buat Data Tanah Baru
            </button>
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

      <PemilikFields label="Data Pemilik Baru" value={pemilikBaru} onChange={setPemilikBaru} />

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

      <LampiranField
        driveLinks={driveLinks}
        onDriveLinksChange={setDriveLinks}
        files={files}
        onFilesChange={setFiles}
        uploading={uploading}
        progressLabel={progressLabel}
      />

      <FormActionBar
        saving={saving || uploading}
        onSimpan={() => doSubmit('final')}
        onPending={() => doSubmit('draft')}
        onBatal={handleBatal}
        simpanLabel="Simpan Transaksi"
      />
    </div>
  );
}
