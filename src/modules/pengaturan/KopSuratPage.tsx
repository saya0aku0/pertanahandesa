import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { getKopSurat, saveKopSurat, KopSurat, KOP_SURAT_KOSONG } from './kopSurat.service';

/**
 * Setting KOP Surat — dipakai untuk kepala surat di setiap Export PDF (Master Tanah).
 * Berlaku untuk SELURUH aplikasi (bukan per-user), makanya cukup 1 halaman setting
 * yang bisa diubah oleh siapa pun yang login (aplikasi ini dipakai 1 petugas/1 perangkat).
 * Ada 2 slot logo: Kabupaten (tampil di KIRI kop surat) dan Desa (tampil di KANAN).
 */
export function KopSuratPage() {
  const [form, setForm] = useState<KopSurat>(KOP_SURAT_KOSONG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [logoKabupatenFile, setLogoKabupatenFile] = useState<File | null>(null);
  const [logoDesaFile, setLogoDesaFile] = useState<File | null>(null);
  const { uploadFiles, uploading, progressLabel } = useCloudinaryUpload();

  useEffect(() => {
    getKopSurat()
      .then(setForm)
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof KopSurat>(key: K, value: KopSurat[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSimpan() {
    setError(null);
    setSukses(null);
    if (!form.namaDesa.trim()) {
      setError('Nama Desa wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      let logoKabupatenUrl = form.logoKabupatenUrl;
      let logoDesaUrl = form.logoDesaUrl;
      if (logoKabupatenFile) {
        const [urlBaru] = await uploadFiles([logoKabupatenFile]);
        logoKabupatenUrl = urlBaru;
      }
      if (logoDesaFile) {
        const [urlBaru] = await uploadFiles([logoDesaFile]);
        logoDesaUrl = urlBaru;
      }
      const dataBaru = { ...form, logoKabupatenUrl, logoDesaUrl };
      await saveKopSurat(dataBaru);
      setForm(dataBaru);
      setLogoKabupatenFile(null);
      setLogoDesaFile(null);
      setSukses('Pengaturan KOP Surat berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const previewKabupaten = logoKabupatenFile
    ? URL.createObjectURL(logoKabupatenFile)
    : form.logoKabupatenUrl;
  const previewDesa = logoDesaFile ? URL.createObjectURL(logoDesaFile) : form.logoDesaUrl;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold">Setting KOP Surat</h1>
        <p className="text-sm text-gray-500 mt-1">
          Data ini akan muncul sebagai kepala surat setiap kali Export Laporan PDF dibuat dari
          Master Tanah — logo Kabupaten di kiri, logo Desa di kanan.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      {sukses && <p className="text-sm bg-primary-50 text-primary-800 p-3 rounded-lg">{sukses}</p>}

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo Kabupaten (Kiri)
            </label>
            <div className="flex items-center gap-3">
              {previewKabupaten ? (
                <img
                  src={previewKabupaten}
                  alt="Preview logo kabupaten"
                  className="w-20 h-20 object-contain border rounded-lg bg-white"
                />
              ) : (
                <div className="w-20 h-20 border rounded-lg flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                  Belum ada
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoKabupatenFile(e.target.files?.[0] ?? null)}
                className="text-sm w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo Desa (Kanan)
            </label>
            <div className="flex items-center gap-3">
              {previewDesa ? (
                <img
                  src={previewDesa}
                  alt="Preview logo desa"
                  className="w-20 h-20 object-contain border rounded-lg bg-white"
                />
              ) : (
                <div className="w-20 h-20 border rounded-lg flex items-center justify-center text-xs text-gray-400 bg-gray-50">
                  Belum ada
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoDesaFile(e.target.files?.[0] ?? null)}
                className="text-sm w-full"
              />
            </div>
          </div>
        </div>
        {uploading && <p className="text-xs text-gray-500">{progressLabel}</p>}
        <p className="text-xs text-gray-400">
          Disarankan logo persegi/bulat, latar transparan atau putih, supaya rapi di kop surat.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Desa *</label>
          <input
            value={form.namaDesa}
            onChange={(e) => update('namaDesa', e.target.value)}
            placeholder="Contoh: Desa Putukrejo"
            className="w-full border rounded-lg p-3 min-h-[44px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
            <input
              value={form.namaKecamatan}
              onChange={(e) => update('namaKecamatan', e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kabupaten/Kota
            </label>
            <input
              value={form.namaKabupaten}
              onChange={(e) => update('namaKabupaten', e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
            <input
              value={form.namaProvinsi}
              onChange={(e) => update('namaProvinsi', e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kode Pos</label>
            <input
              value={form.kodePos}
              onChange={(e) => update('kodePos', e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Kantor Desa</label>
          <textarea
            value={form.alamat}
            onChange={(e) => update('alamat', e.target.value)}
            rows={2}
            className="w-full border rounded-lg p-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kontak (Telp/Email/Website)
          </label>
          <input
            value={form.kontak}
            onChange={(e) => update('kontak', e.target.value)}
            placeholder="Contoh: Telp. (0341) 123456 — desaputukrejo@gmail.com"
            className="w-full border rounded-lg p-3 min-h-[44px]"
          />
        </div>
      </div>

      <Button onClick={handleSimpan} disabled={saving || uploading}>
        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </Button>
    </div>
  );
}
