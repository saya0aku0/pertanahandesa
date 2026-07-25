import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { createTanah, updateTanah } from './tanah.service';
import { jalankanGuardEditHapusTanah } from '@/modules/transaksi/relasiGuard';
import { GuardResult } from '@/modules/transaksi/relasiGuard';
import { Tanah, TanahFormInput } from './tanah.types';

interface TanahFormProps {
  existing?: Tanah;
  onSaved?: (id: string) => void;
}

export function TanahForm({ existing, onSaved }: TanahFormProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Nomor sertifikat bisa di-prefill dari alur "Buat Data Tanah Baru" di form Transaksi (§10.3)
  const prefillNomor = searchParams.get('nomorSertifikat') ?? '';
  // Jika datang dari alur Transaksi "Pecah Lahan", tautkan otomatis ke bidang induk & riwayat asal (§11.1)
  const prefillParentId = searchParams.get('parentTanahId');
  const prefillSourceRiwayatId = searchParams.get('sourceRiwayatId');

  const [form, setForm] = useState<TanahFormInput>({
    nomorSertifikat: existing?.nomorSertifikat ?? prefillNomor,
    nomorSuratUkur: existing?.nomorSuratUkur ?? '',
    luas: existing?.luas ?? 0,
    lokasi: existing?.lokasi ?? '',
    lat: existing?.lat,
    long: existing?.long,
    pemilikSaatIni: existing?.pemilikSaatIni ?? '',
    parentTanahId: existing?.parentTanahId ?? prefillParentId ?? null,
    sourceRiwayatId: existing?.sourceRiwayatId ?? prefillSourceRiwayatId ?? null
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardWarnings, setGuardWarnings] = useState<GuardResult[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  function update<K extends keyof TanahFormInput>(key: K, value: TanahFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function doSave() {
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await updateTanah(existing.id, form);
        onSaved?.(existing.id);
      } else {
        const id = await createTanah(form);
        onSaved?.(id);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nomorSertifikat || !form.lokasi || !form.pemilikSaatIni) {
      setError('Nomor sertifikat, lokasi, dan pemilik wajib diisi.');
      return;
    }
    if (form.luas < 0) {
      setError('Luas tidak boleh negatif.');
      return;
    }

    // Guard relasi §11.2 hanya relevan saat EDIT bidang yang sudah punya bidang anak
    if (existing) {
      const warnings = await jalankanGuardEditHapusTanah(existing.id);
      if (warnings.length > 0) {
        setGuardWarnings(warnings);
        setPendingSubmit(true);
        return;
      }
    }
    await doSave();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        {form.parentTanahId && (
          <p className="text-sm bg-primary-50 text-primary-800 p-3 rounded-lg">
            Bidang ini akan otomatis tertaut sebagai hasil pemecahan dari bidang induk.
          </p>
        )}

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Surat Ukur</label>
          <input
            value={form.nomorSuratUkur}
            onChange={(e) => update('nomorSuratUkur', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Luas (m²) *</label>
          <input
            type="number"
            inputMode="numeric"
            value={form.luas}
            onChange={(e) => update('luas', Number(e.target.value))}
            className="w-full border rounded-lg p-3 min-h-[44px]"
            min={0}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi *</label>
          <input
            value={form.lokasi}
            onChange={(e) => update('lokasi', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.lat ?? ''}
              onChange={(e) => update('lat', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.long ?? ''}
              onChange={(e) => update('long', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pemilik Saat Ini *</label>
          <input
            value={form.pemilikSaatIni}
            onChange={(e) => update('pemilikSaatIni', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
            required
          />
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Menyimpan...' : 'Simpan'}
        </Button>
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
            await doSave();
          }}
        />
      ))}
    </>
  );
}
