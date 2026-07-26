import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthUser } from '@/modules/auth/useAuthUser';
import { changePassword } from '@/firebase/auth';
import { getProfil, updateProfil } from './profil.service';

export function ProfilPage() {
  const { user } = useAuthUser();
  const [docId, setDocId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getProfil(user.uid)
      .then((profil) => {
        if (profil) {
          setDocId(profil.id);
          setNama(profil.nama ?? '');
          setNoHp(profil.noHp ?? '');
          setEmail(profil.email ?? user.email ?? '');
        } else {
          // Profil belum terdaftar di /users (mis. akun dibuat manual di luar Kelola User)
          setLoadError(
            'Profil belum terdaftar di data user. Hubungi Superadmin untuk memastikan akun ini terdaftar di menu Kelola User.'
          );
          setEmail(user.email ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSave() {
    if (!docId) {
      setMessage('Tidak bisa menyimpan: data profil belum ditemukan.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateProfil(docId, { nama, noHp });
      setMessage('Profil berhasil disimpan.');
    } catch {
      setMessage('Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-md space-y-8">
      <div className="space-y-4">
        <h1 className="text-lg font-bold">Setting Profil Akun</h1>
        {loadError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{loadError}</p>}
        {message && <p className="text-sm bg-primary-50 text-primary-800 p-3 rounded-lg">{message}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px] disabled:bg-gray-100"
            disabled={!docId}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
          <input
            value={noHp}
            onChange={(e) => setNoHp(e.target.value)}
            inputMode="numeric"
            className="w-full border rounded-lg p-3 min-h-[44px] disabled:bg-gray-100"
            disabled={!docId}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            value={email}
            className="w-full border rounded-lg p-3 min-h-[44px] bg-gray-100 text-gray-500"
            disabled
            readOnly
          />
          <p className="text-xs text-gray-400 mt-1">
            Email tidak bisa diubah dari sini karena dipakai untuk login. Hubungi Superadmin kalau
            perlu ganti email.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !docId}>
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </div>

      <UbahPasswordForm />
    </div>
  );
}

function UbahPasswordForm() {
  const [sandiLama, setSandiLama] = useState('');
  const [sandiBaru, setSandiBaru] = useState('');
  const [konfirmasiSandiBaru, setKonfirmasiSandiBaru] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function validasi(): boolean {
    if (!sandiLama || !sandiBaru || !konfirmasiSandiBaru) {
      setError('Semua field wajib diisi.');
      return false;
    }
    if (sandiBaru.length < 6) {
      setError('Kata sandi baru minimal 6 karakter.');
      return false;
    }
    if (sandiBaru !== konfirmasiSandiBaru) {
      setError('Konfirmasi kata sandi baru tidak sama dengan kata sandi baru.');
      return false;
    }
    if (sandiBaru === sandiLama) {
      setError('Kata sandi baru tidak boleh sama dengan kata sandi lama.');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    setError(null);
    setSukses(null);
    if (!validasi()) return;

    setSaving(true);
    try {
      await changePassword(sandiLama, sandiBaru);
      setSukses('Kata sandi berhasil diganti.');
      setSandiLama('');
      setSandiBaru('');
      setKonfirmasiSandiBaru('');
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Kata sandi lama salah.');
      } else if (code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan. Coba lagi beberapa saat lagi.');
      } else {
        setError('Gagal mengganti kata sandi. Coba lagi.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 border-t pt-6">
      <h2 className="text-lg font-bold">Ganti Kata Sandi</h2>
      <p className="text-xs text-gray-400">
        Langsung berlaku tanpa perlu kode OTP/verifikasi email, cukup masukkan kata sandi lama Anda.
      </p>
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      {sukses && <p className="text-sm bg-primary-50 text-primary-800 p-3 rounded-lg">{sukses}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Lama</label>
        <input
          type="password"
          value={sandiLama}
          onChange={(e) => setSandiLama(e.target.value)}
          className="w-full border rounded-lg p-3 min-h-[44px]"
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Kata Sandi Baru</label>
        <input
          type="password"
          value={sandiBaru}
          onChange={(e) => setSandiBaru(e.target.value)}
          className="w-full border rounded-lg p-3 min-h-[44px]"
          autoComplete="new-password"
          minLength={6}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Konfirmasi Kata Sandi Baru
        </label>
        <input
          type="password"
          value={konfirmasiSandiBaru}
          onChange={(e) => setKonfirmasiSandiBaru(e.target.value)}
          className="w-full border rounded-lg p-3 min-h-[44px]"
          autoComplete="new-password"
          minLength={6}
        />
      </div>
      <Button onClick={handleSubmit} disabled={saving}>
        {saving ? 'Menyimpan...' : 'Ganti Kata Sandi'}
      </Button>
    </div>
  );
}
