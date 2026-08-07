import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { FormActionBar } from '@/components/FormActionBar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PemilikFields } from '@/components/PemilikFields';
import { LampiranField } from '@/components/LampiranField';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { PEMILIK_KOSONG } from '@/types/pemilik.types';
import { getTanah } from '@/modules/master-tanah/tanah.service';
import { Tanah } from '@/modules/master-tanah/tanah.types';
import { createRiwayat, getRiwayat } from './riwayat.service';
import { Riwayat } from './riwayat.types';
import { PecahLahanForm } from './PecahLahanForm';
import { gabungkanLampiran } from '@/utils/lampiran';

type Alasan = 'jual-beli' | 'waris' | 'pembaruan-data';
type Step = 'alasan' | 'luas-tetap' | 'pemilik-baru' | 'pecah-lahan';

const ALASAN_OPTIONS: { value: Alasan; label: string }[] = [
  { value: 'jual-beli', label: 'Jual-Beli' },
  { value: 'waris', label: 'Waris' },
  { value: 'pembaruan-data', label: 'Pembaruan Data Saja' }
];

/**
 * Alur wajib "Perubahan Data" (dipicu dari tombol di halaman detail Master Tanah):
 *
 *   Master Tanah > tombol "Perubahan Data"
 *   > pilih alasan (Jual-Beli / Waris / Pembaruan Data Saja)
 *   > pertanyaan "Apakah Luas Bidang Tetap?"
 *       - Ya   -> isi data pemilik baru (lengkap), simpan sebagai riwayat baru
 *       - Tidak (dipecah) -> Form Pemecahan Luas Lahan
 *
 * Setiap proses saling terhubung dan tersimpan record-nya (tanahId, sourceRiwayatId, dst).
 */
export function PerubahanDataForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tanahId = searchParams.get('tanahId');
  const draftId = searchParams.get('draftId');

  const [tanah, setTanah] = useState<Tanah | null>(null);
  const [draftRiwayat, setDraftRiwayat] = useState<Riwayat | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('alasan');
  const [alasan, setAlasan] = useState<Alasan>('jual-beli');

  useEffect(() => {
    if (!tanahId) {
      setLoadError('Bidang tanah tidak ditemukan. Buka dari halaman detail Master Tanah.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [t, draft] = await Promise.all([
          getTanah(tanahId),
          draftId ? getRiwayat(draftId) : Promise.resolve(null)
        ]);
        if (!t) {
          setLoadError('Bidang tanah tidak ditemukan.');
          return;
        }
        setTanah(t);
        if (draft) {
          setDraftRiwayat(draft);
          setAlasan(draft.alasanPerubahan ?? 'pembaruan-data');
          setStep('pecah-lahan'); // draft pecah lahan langsung lanjut ke form pecah
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [tanahId, draftId]);

  if (loading) return <LoadingSpinner />;
  if (loadError || !tanah) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{loadError}</p>
        <Button variant="secondary" onClick={() => navigate('/master-tanah')}>
          Kembali ke Master Tanah
        </Button>
      </div>
    );
  }

  function handleBatalKeSemula() {
    navigate(`/master-tanah/${tanah!.id}`);
  }

  if (step === 'alasan') {
    return (
      <div className="space-y-4 max-w-lg">
        <p className="text-sm bg-gray-50 p-3 rounded-lg">
          Bidang: <strong>{tanah.nomorSertifikat}</strong> — {tanah.lokasi} — pemilik saat ini:{' '}
          {tanah.pemilikSaatIni?.nama}
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alasan Perubahan Data *
          </label>
          <div className="space-y-2">
            {ALASAN_OPTIONS.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-3 border rounded-lg p-3 min-h-[44px] cursor-pointer"
              >
                <input
                  type="radio"
                  name="alasan"
                  checked={alasan === o.value}
                  onChange={() => setAlasan(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col-reverse md:flex-row gap-2 md:justify-end">
          <Button variant="secondary" onClick={handleBatalKeSemula}>
            Batal
          </Button>
          <Button onClick={() => setStep('luas-tetap')}>Lanjut →</Button>
        </div>
      </div>
    );
  }

  if (step === 'luas-tetap') {
    return (
      <div className="space-y-4 max-w-lg">
        <p className="text-sm bg-gray-50 p-3 rounded-lg">
          Bidang: <strong>{tanah.nomorSertifikat}</strong> — alasan:{' '}
          {ALASAN_OPTIONS.find((o) => o.value === alasan)?.label}
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Apakah Luas Bidang Tetap? *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStep('pemilik-baru')}
              className="border-2 rounded-lg p-4 min-h-[44px] font-medium hover:bg-primary-50 hover:border-primary-500"
            >
              Ya, Tetap
            </button>
            <button
              type="button"
              onClick={() => setStep('pecah-lahan')}
              className="border-2 rounded-lg p-4 min-h-[44px] font-medium hover:bg-primary-50 hover:border-primary-500"
            >
              Tidak (Dipecah)
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Pilih "Tidak (Dipecah)" kalau pemilik sebelumnya hanya menjual sebagian, atau punya
            ahli waris lebih dari satu.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setStep('alasan')}>
          ← Kembali
        </Button>
      </div>
    );
  }

  if (step === 'pecah-lahan') {
    return (
      <PecahLahanForm
        tanah={tanah}
        alasan={alasan}
        draftRiwayat={draftRiwayat}
        onBatal={handleBatalKeSemula}
        onSelesai={() => navigate(`/master-tanah/${tanah.id}`)}
      />
    );
  }

  // step === 'pemilik-baru'
  return (
    <PemilikBaruStep
      tanah={tanah}
      alasan={alasan}
      onBatal={handleBatalKeSemula}
      onKembali={() => setStep('luas-tetap')}
      onSelesai={() => navigate(`/master-tanah/${tanah.id}`)}
    />
  );
}

function PemilikBaruStep({
  tanah,
  alasan,
  onBatal,
  onKembali,
  onSelesai
}: {
  tanah: Tanah;
  alasan: Alasan;
  onBatal: () => void;
  onKembali: () => void;
  onSelesai: () => void;
}) {
  const [tanggalKejadian, setTanggalKejadian] = useState('');
  const [pemilikBaru, setPemilikBaru] = useState({ ...PEMILIK_KOSONG });
  const [keterangan, setKeterangan] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [driveLinks, setDriveLinks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { uploadFiles, uploading, progressLabel } = useCloudinaryUpload();

  function validasi(status: 'draft' | 'final'): boolean {
    if (!tanggalKejadian) {
      setError('Tanggal kejadian wajib diisi.');
      return false;
    }
    if (status === 'final' && (!pemilikBaru.nama || !pemilikBaru.nik || !pemilikBaru.alamatLengkap)) {
      setError('Data pemilik baru (Nama, NIK, Alamat Lengkap) wajib diisi lengkap.');
      return false;
    }
    return true;
  }

  async function doSubmit(status: 'draft' | 'final') {
    if (!validasi(status)) return;
    setSaving(true);
    setError(null);
    try {
      let uploadedUrls: string[] = [];
      if (files.length > 0) uploadedUrls = await uploadFiles(files);
      const dokumenUrls = gabungkanLampiran(undefined, driveLinks, uploadedUrls);
      await createRiwayat({
        tanahId: tanah.id,
        jenisPeristiwa: alasan,
        tanggalKejadian,
        pemilikSebelumnya: tanah.pemilikSaatIni,
        pemilikBaru,
        luasTetap: true,
        alasanPerubahan: alasan,
        keterangan,
        dokumenUrls,
        status
      });
      onSelesai();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan data.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm bg-gray-50 p-3 rounded-lg">
        Bidang: <strong>{tanah.nomorSertifikat}</strong> — luas tetap {tanah.luas.toLocaleString('id-ID')} m²
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

      <PemilikFields label="Data Pemilik Baru" value={pemilikBaru} onChange={setPemilikBaru} />

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

      <div className="flex justify-start">
        <button type="button" onClick={onKembali} className="text-sm text-gray-500 hover:underline">
          ← Kembali
        </button>
      </div>

      <FormActionBar
        saving={saving || uploading}
        onSimpan={() => doSubmit('final')}
        onPending={() => doSubmit('draft')}
        onBatal={onBatal}
      />
    </div>
  );
}
