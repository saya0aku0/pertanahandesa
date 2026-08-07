import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormActionBar } from '@/components/FormActionBar';
import { PemilikFields } from '@/components/PemilikFields';
import { LampiranField } from '@/components/LampiranField';
import { PinDialog } from '@/components/PinDialog';
import { usePinGuard } from '@/hooks/usePinGuard';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { createTanah, updateTanah, deleteTanah } from './tanah.service';
import { jalankanGuardEditHapusTanah, GuardResult } from '@/modules/transaksi/relasiGuard';
import { finalisasiPenyatuanLahan } from '@/modules/transaksi/riwayat.service';
import { Tanah, TanahFormInput } from './tanah.types';
import { PEMILIK_KOSONG } from '@/types/pemilik.types';
import { gabungkanLampiran } from '@/utils/lampiran';

interface TanahFormProps {
  existing?: Tanah;
  onSaved?: (id: string) => void;
}

export function TanahForm({ existing, onSaved }: TanahFormProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { requestPin, pinDialogProps } = usePinGuard();

  // Nomor sertifikat bisa di-prefill dari alur "Buat Data Tanah Baru" di form Transaksi (§10.3)
  const prefillNomor = searchParams.get('nomorSertifikat') ?? '';
  // Jika datang dari alur Transaksi "Pecah Lahan", tautkan otomatis ke bidang induk & riwayat asal (§11.1)
  const prefillParentId = searchParams.get('parentTanahId');
  const prefillSourceRiwayatId = searchParams.get('sourceRiwayatId');
  // Kalau datang dari alur Transaksi "Penyatuan Lahan" (§ PenyatuanLahanForm),
  // bidang sumber & riwayatnya dikirim sebagai daftar dipisah koma.
  const prefillParentIds = searchParams.get('parentTanahIds')?.split(',').filter(Boolean) ?? [];
  const prefillSourceRiwayatIds =
    searchParams.get('sourceRiwayatIds')?.split(',').filter(Boolean) ?? [];

  const [form, setForm] = useState<TanahFormInput>({
    nomorSertifikat: existing?.nomorSertifikat ?? prefillNomor,
    tanggalTerbitSertifikat: existing?.tanggalTerbitSertifikat ?? '',
    nomorSuratUkur: existing?.nomorSuratUkur ?? '',
    tanggalUkur: existing?.tanggalUkur ?? '',
    petugasUkur: existing?.petugasUkur ?? '',
    panjang: existing?.panjang,
    lebar: existing?.lebar,
    luas: existing?.luas ?? 0,
    lokasi: existing?.lokasi ?? '',
    googleMapsLink: existing?.googleMapsLink ?? '',
    pemilikSaatIni: existing?.pemilikSaatIni ?? { ...PEMILIK_KOSONG },
    status: existing?.status ?? 'aktif',
    parentTanahId: existing?.parentTanahId ?? prefillParentId ?? null,
    sourceRiwayatId: existing?.sourceRiwayatId ?? prefillSourceRiwayatId ?? null,
    parentTanahIds: existing?.parentTanahIds ?? (prefillParentIds.length > 0 ? prefillParentIds : undefined),
    sourceRiwayatIds:
      existing?.sourceRiwayatIds ?? (prefillSourceRiwayatIds.length > 0 ? prefillSourceRiwayatIds : undefined)
  });
  const [driveLinks, setDriveLinks] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const { uploadFiles, uploading, progressLabel } = useCloudinaryUpload();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardWarnings, setGuardWarnings] = useState<GuardResult[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'aktif' | 'draft'>('aktif');
  const [guardIntent, setGuardIntent] = useState<'save' | 'hapus'>('save');
  const [confirmHapus, setConfirmHapus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function update<K extends keyof TanahFormInput>(key: K, value: TanahFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Panjang x Lebar -> Luas otomatis. Kalau salah satu dikosongkan, Luas kembali
  // bisa diisi manual (opsi kedua sesuai permintaan: langsung isi Luas m² saja).
  function updateUkuran(key: 'panjang' | 'lebar', value: number | undefined) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (next.panjang && next.lebar) {
        next.luas = Math.round(next.panjang * next.lebar * 100) / 100;
      }
      return next;
    });
  }
  const luasOtomatis = !!(form.panjang && form.lebar);

  async function doSave(statusSimpan: 'aktif' | 'draft') {
    setSaving(true);
    setError(null);
    try {
      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        uploadedUrls = await uploadFiles(files);
      }
      const lampiranUrls = gabungkanLampiran(existing?.lampiranUrls, driveLinks, uploadedUrls);
      const dataToSave: TanahFormInput = { ...form, lampiranUrls, status: statusSimpan };
      if (existing) {
        await updateTanah(existing.id, dataToSave);
        onSaved?.(existing.id);
      } else {
        const id = await createTanah(dataToSave);
        onSaved?.(id);

        // Kalau ini bidang hasil PENYATUAN LAHAN, finalisasi: tautkan riwayat sumber
        // ke bidang baru ini, lalu arsipkan bidang sumber (tidak dihapus).
        // Hanya dijalankan kalau statusnya aktif/final (bukan draft).
        if (
          statusSimpan === 'aktif' &&
          form.parentTanahIds &&
          form.parentTanahIds.length > 0 &&
          form.sourceRiwayatIds
        ) {
          await finalisasiPenyatuanLahan(id, form.parentTanahIds, form.sourceRiwayatIds);
        }

        // Redirect otomatis kembali ke form Transaksi jika datang dari alur "Buat Data Tanah Baru" (§10.3 step 5)
        const returnTo = searchParams.get('returnTo');
        if (returnTo) {
          navigate(`${returnTo}?bidangBaruId=${id}`);
          return;
        }
        navigate(`/master-tanah/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  }

  function validasiWajib(): boolean {
    if (!form.nomorSertifikat || !form.lokasi) {
      setError('Nomor sertifikat dan lokasi wajib diisi.');
      return false;
    }
    if (!form.pemilikSaatIni.nama || !form.pemilikSaatIni.nik || !form.pemilikSaatIni.alamatLengkap) {
      setError('Data pemilik (Nama, NIK, Alamat Lengkap) wajib diisi lengkap.');
      return false;
    }
    if (form.luas < 0) {
      setError('Luas tidak boleh negatif.');
      return false;
    }
    return true;
  }

  async function jalankanGuardLaluSimpan(statusSimpan: 'aktif' | 'draft') {
    // Guard relasi §11.2 hanya relevan saat EDIT bidang yang sudah punya bidang anak
    if (existing) {
      const warnings = await jalankanGuardEditHapusTanah(existing.id);
      if (warnings.length > 0) {
        setGuardWarnings(warnings);
        setPendingStatus(statusSimpan);
        setGuardIntent('save');
        setPendingSubmit(true);
        return;
      }
    }
    await doSave(statusSimpan);
  }

  // Simpan (final) — validasi wajib penuh. PIN TIDAK diminta di sini lagi (§ solo-user):
  // untuk pemakaian 1 petugas/1 perangkat, konfirmasi PIN berulang di Edit cuma jadi
  // gesekan tanpa manfaat keamanan tambahan. PIN tetap wajib khusus untuk Hapus.
  async function handleSimpan() {
    setError(null);
    if (!validasiWajib()) return;
    await jalankanGuardLaluSimpan('aktif');
  }

  // Pending (Drafted) — dipakai kalau proses ukur/terbit sertifikat baru masih berjalan,
  // jadi TIDAK memvalidasi field wajib secara ketat, cukup nomor sertifikat/lokasi sebagai
  // penanda minimal supaya draft mudah dicari lagi nanti.
  async function handlePending() {
    setError(null);
    if (!form.nomorSertifikat) {
      setError('Nomor sertifikat wajib diisi walau statusnya masih Pending.');
      return;
    }
    await doSave('draft');
  }

  function handleBatal() {
    navigate(existing ? `/master-tanah/${existing.id}` : '/master-tanah');
  }

  async function eksekusiHapus() {
    if (!existing) return;
    setDeleting(true);
    try {
      await deleteTanah(existing.id);
      navigate('/master-tanah');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data.');
    } finally {
      setDeleting(false);
      setConfirmHapus(false);
    }
  }

  async function handleHapus() {
    if (!existing) return;
    const warnings = await jalankanGuardEditHapusTanah(existing.id);
    if (warnings.length > 0) {
      setGuardWarnings(warnings);
      setGuardIntent('hapus');
      setPendingSubmit(true);
      return;
    }
    requestPin(() => setConfirmHapus(true));
  }

  return (
    <>
      <form className="space-y-4 max-w-lg" onSubmit={(e) => e.preventDefault()}>
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        {existing?.status === 'draft' && (
          <p className="text-sm bg-amber-50 text-amber-800 p-3 rounded-lg">
            ⏳ Data ini berstatus <strong>Pending (Draft)</strong> — menunggu proses ukur/terbit
            sertifikat selesai. Tekan "Simpan" setelah data lengkap untuk menjadikannya aktif.
          </p>
        )}
        {form.parentTanahId && (
          <p className="text-sm bg-primary-50 text-primary-800 p-3 rounded-lg">
            Bidang ini akan otomatis tertaut sebagai hasil pemecahan dari bidang induk.
          </p>
        )}
        {form.parentTanahIds && form.parentTanahIds.length > 0 && (
          <p className="text-sm bg-primary-50 text-primary-800 p-3 rounded-lg">
            Bidang ini akan otomatis tertaut sebagai hasil PENYATUAN dari {form.parentTanahIds.length}{' '}
            bidang sumber. Bidang sumber akan diarsipkan (bukan dihapus) setelah disimpan.
          </p>
        )}

        {/* Sertifikat */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Sertifikat *</label>
          <input
            value={form.nomorSertifikat}
            onChange={(e) => update('nomorSertifikat', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tanggal Terbit / Disahkan
          </label>
          <input
            type="date"
            value={form.tanggalTerbitSertifikat}
            onChange={(e) => update('tanggalTerbitSertifikat', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
          />
        </div>

        {/* Surat Ukur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Surat Ukur</label>
          <input
            value={form.nomorSuratUkur}
            onChange={(e) => update('nomorSuratUkur', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Ukur</label>
            <input
              type="date"
              value={form.tanggalUkur}
              onChange={(e) => update('tanggalUkur', e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Petugas Ukur</label>
            <input
              value={form.petugasUkur}
              onChange={(e) => update('petugasUkur', e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
              placeholder="Nama petugas"
            />
          </div>
        </div>

        {/* Panjang x Lebar -> Luas otomatis, atau isi Luas manual */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Panjang (m)</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.panjang ?? ''}
              onChange={(e) =>
                updateUkuran('panjang', e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full border rounded-lg p-3 min-h-[44px]"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lebar (m)</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.lebar ?? ''}
              onChange={(e) =>
                updateUkuran('lebar', e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full border rounded-lg p-3 min-h-[44px]"
              min={0}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Luas (m²) * {luasOtomatis && <span className="text-gray-400 font-normal">— otomatis dari Panjang × Lebar</span>}
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={form.luas}
            onChange={(e) => update('luas', Number(e.target.value))}
            className="w-full border rounded-lg p-3 min-h-[44px] disabled:bg-gray-100 disabled:text-gray-500"
            min={0}
            required
            disabled={luasOtomatis}
          />
          <p className="text-xs text-gray-400 mt-1">
            Kosongkan Panjang/Lebar di atas kalau ingin isi Luas manual langsung.
          </p>
        </div>

        {/* Lokasi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi *</label>
          <input
            value={form.lokasi}
            onChange={(e) => update('lokasi', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
            required
          />
        </div>

        {/* Link Google Maps — disimpan apa adanya, tanpa perlu koordinat lat/long */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link Google Maps
          </label>
          <input
            value={form.googleMapsLink}
            onChange={(e) => update('googleMapsLink', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
            placeholder="https://maps.app.goo.gl/... atau link Google Maps lainnya"
          />
          <p className="text-xs text-gray-400 mt-1">
            Cukup tempel link Google Maps-nya (boleh link pendek dari tombol Share di HP) —
            langsung tersimpan apa adanya, tanpa perlu diproses lagi.
          </p>
        </div>

        {/* Pemilik — data diri lengkap: Nama, NIK, Alamat Lengkap */}
        <PemilikFields
          label="Pemilik Saat Ini"
          value={form.pemilikSaatIni}
          onChange={(v) => update('pemilikSaatIni', v)}
        />

        <LampiranField
          driveLinks={driveLinks}
          onDriveLinksChange={setDriveLinks}
          files={files}
          onFilesChange={setFiles}
          existingUrls={existing?.lampiranUrls}
          uploading={uploading}
          progressLabel={progressLabel}
        />

        <FormActionBar
          saving={saving || uploading}
          onSimpan={handleSimpan}
          onPending={handlePending}
          onBatal={handleBatal}
          onHapus={existing ? handleHapus : undefined}
          showHapus={!!existing}
        />
      </form>

      {guardWarnings.map((w, idx) => (
        <ConfirmDialog
          key={idx}
          open={pendingSubmit}
          message={w.pesan}
          onCancel={() => {
            setPendingSubmit(false);
            setGuardWarnings([]);
          }}
          onConfirm={async () => {
            if (w.onConfirmed) await w.onConfirmed();
            setPendingSubmit(false);
            setGuardWarnings([]);
            if (guardIntent === 'hapus') {
              requestPin(() => setConfirmHapus(true));
            } else {
              await doSave(pendingStatus);
            }
          }}
        />
      ))}

      <ConfirmDialog
        open={confirmHapus}
        title="Hapus Bidang Tanah"
        message={`Yakin ingin menghapus bidang "${existing?.nomorSertifikat}"? Aksi ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, hapus"
        loading={deleting}
        onCancel={() => setConfirmHapus(false)}
        onConfirm={eksekusiHapus}
      />

      <PinDialog {...pinDialogProps} />
    </>
  );
}
