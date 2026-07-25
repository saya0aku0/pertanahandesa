import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthUser } from '@/modules/auth/useAuthUser';
import { getProfil, updateProfil } from './profil.service';

export function ProfilPage() {
  const { user } = useAuthUser();
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getProfil(user.uid).then((profil) => {
      if (profil) {
        setNama(profil.nama ?? '');
        setNoHp(profil.noHp ?? '');
        setEmail(profil.email ?? user.email ?? '');
      } else {
        setEmail(user.email ?? '');
      }
      setLoading(false);
    });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateProfil(user.uid, { nama, noHp, email });
      setMessage('Profil berhasil disimpan.');
    } catch {
      setMessage('Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-lg font-bold">Setting Profil Akun</h1>
      {message && <p className="text-sm bg-primary-50 text-primary-800 p-3 rounded-lg">{message}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className="w-full border rounded-lg p-3 min-h-[44px]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
        <input
          value={noHp}
          onChange={(e) => setNoHp(e.target.value)}
          inputMode="numeric"
          className="w-full border rounded-lg p-3 min-h-[44px]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-3 min-h-[44px]"
        />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </Button>
    </div>
  );
}
