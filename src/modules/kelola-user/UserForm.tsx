import { useState } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { createUser, updateUser, UserFormInput } from './user.service';
import { AppUser, UserRole } from '@/modules/auth/auth.types';

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existing?: AppUser;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'staff', label: 'Staff' },
  { value: 'superadmin', label: 'Superadmin' }
];

/** Form Tambah/Edit User — dipakai Owner/Superadmin untuk kelola akses staf desa (§10.4) */
export function UserForm({ open, onClose, onSaved, existing }: UserFormProps) {
  const [form, setForm] = useState<UserFormInput>({
    nama: existing?.nama ?? '',
    email: existing?.email ?? '',
    username: existing?.username ?? '',
    noHp: existing?.noHp ?? '',
    role: existing?.role ?? 'staff',
    password: '',
    pin: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof UserFormInput>(key: K, value: UserFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nama || !form.email || !form.username) {
      setError('Nama, email, dan username wajib diisi.');
      return;
    }
    if (!existing && (!form.password || form.password.length < 6)) {
      setError('Password minimal 6 karakter untuk akun baru.');
      return;
    }
    if (!existing && !/^\d{4,6}$/.test(form.pin)) {
      setError('PIN wajib diisi, 4-6 digit angka, untuk akun baru.');
      return;
    }
    if (existing && form.pin && !/^\d{4,6}$/.test(form.pin)) {
      setError('PIN harus 4-6 digit angka.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await updateUser(existing.id, {
          nama: form.nama,
          email: form.email,
          username: form.username,
          noHp: form.noHp,
          role: form.role,
          // PIN existing hanya diikutkan kalau diisi ulang (mengganti PIN lama)
          ...(form.pin ? { pin: form.pin } : {})
        });
      } else {
        await createUser(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit User' : 'Tambah User Baru'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
          <input
            value={form.nama}
            onChange={(e) => update('nama', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
          <input
            value={form.username}
            onChange={(e) => update('username', e.target.value.trim())}
            className="w-full border rounded-lg p-3 min-h-[44px]"
            placeholder="mis. superadmin1"
            autoCapitalize="none"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Dipakai untuk login tanpa email. Pastikan unik antar user.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
            required
            disabled={!!existing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
          <input
            value={form.noHp}
            onChange={(e) => update('noHp', e.target.value)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value as UserRole)}
            className="w-full border rounded-lg p-3 min-h-[44px]"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {!existing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Awal *
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full border rounded-lg p-3 min-h-[44px]"
              required
              minLength={6}
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PIN Keamanan {!existing && '*'}
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={form.pin}
            onChange={(e) => update('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full border rounded-lg p-3 min-h-[44px] tracking-widest"
            placeholder={existing ? 'Kosongkan jika tidak ganti PIN' : '4-6 digit angka'}
            maxLength={6}
            required={!existing}
          />
          <p className="text-xs text-gray-400 mt-1">
            PIN ini akan diminta setiap kali user ini menekan tombol Edit atau Hapus pada
            data yang sudah tersimpan di Master Tanah/Transaksi.
          </p>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </form>
    </Modal>
  );
}
