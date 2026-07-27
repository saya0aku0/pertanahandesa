import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { createUser, updateUser, UserFormInput } from './user.service';
import { startEmailVerification, subscribeVerificationStatus } from './otpVerification.service';
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

type VerifyState = 'idle' | 'sending' | 'waiting' | 'verified' | 'expired';

/** Form Tambah/Edit User — dipakai Owner/Superadmin untuk kelola akses staf desa (§10.4)
 *
 * Khusus TAMBAH user baru: email harus diverifikasi lewat kode OTP yang dikirim
 * ke pemilik email sebelum tombol "Simpan" aktif (lihat otpVerification.service.ts).
 * Edit user tidak melalui alur ini karena field email dikunci/tidak bisa diubah.
 */
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

  const [verifyState, setVerifyState] = useState<VerifyState>('idle');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Reset semua state form & verifikasi tiap kali modal dibuka/tutup atau ganti target edit
  useEffect(() => {
    setForm({
      nama: existing?.nama ?? '',
      email: existing?.email ?? '',
      username: existing?.username ?? '',
      noHp: existing?.noHp ?? '',
      role: existing?.role ?? 'staff',
      password: '',
      pin: ''
    });
    setError(null);
    setVerifyState('idle');
    setVerifyError(null);
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, [open, existing]);

  // Bersihkan listener realtime saat komponen unmount
  useEffect(() => {
    return () => unsubscribeRef.current?.();
  }, []);

  function update<K extends keyof UserFormInput>(key: K, value: UserFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleKirimKodeVerifikasi() {
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setVerifyError('Isi email yang valid dulu sebelum kirim kode verifikasi.');
      return;
    }
    setVerifyState('sending');
    setVerifyError(null);
    try {
      await startEmailVerification(form.email);
      setVerifyState('waiting');
      unsubscribeRef.current?.();
      unsubscribeRef.current = subscribeVerificationStatus(form.email, (status) => {
        if (!status) return;
        if (status.verified) setVerifyState('verified');
        else if (status.expired) setVerifyState('expired');
      });
    } catch (err) {
      setVerifyState('idle');
      setVerifyError(err instanceof Error ? err.message : 'Gagal mengirim kode verifikasi.');
    }
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
    if (!existing && verifyState !== 'verified') {
      setError('Email belum diverifikasi. Kirim kode dan tunggu pemilik email memverifikasi dulu.');
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
          ...(form.pin ? { pin: form.pin } : {})
        });
      } else {
        await createUser({ ...form, emailPreVerified: true });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan user.');
    } finally {
      setSaving(false);
    }
  }

  const emailLocked = !existing && verifyState !== 'idle';
  const canSubmit = existing ? true : verifyState === 'verified';

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
            className="w-full border rounded-lg p-3 min-h-[44px] disabled:bg-gray-100 disabled:text-gray-500"
            required
            disabled={!!existing || emailLocked}
          />

          {/* Kotak status verifikasi — HANYA muncul saat Tambah User baru */}
          {!existing && (
            <div className="mt-2 space-y-2">
              {verifyState === 'idle' && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleKirimKodeVerifikasi}
                  className="w-full text-sm"
                >
                  Kirim Kode Verifikasi ke Email
                </Button>
              )}

              {verifyState === 'sending' && (
                <p className="text-xs text-gray-500">Mengirim kode verifikasi...</p>
              )}

              {verifyState === 'waiting' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-amber-800 break-words">
                    Kode verifikasi sudah dikirim ke <strong>{form.email}</strong>. Menunggu
                    pemilik email membuka link/kode dan memverifikasi (kadaluarsa 10 menit)...
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Menunggu verifikasi
                  </span>
                </div>
              )}

              {verifyState === 'verified' && (
                <p className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  ✓ Email terverifikasi oleh pemiliknya. Silakan lanjutkan mengisi form
                  di bawah lalu tekan Simpan.
                </p>
              )}

              {verifyState === 'expired' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-red-700">Kode sudah kedaluwarsa dan belum diverifikasi.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleKirimKodeVerifikasi}
                    className="w-full text-sm"
                  >
                    Kirim Ulang Kode
                  </Button>
                </div>
              )}

              {verifyError && <p className="text-xs text-red-600">{verifyError}</p>}
            </div>
          )}
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

        <Button type="submit" disabled={saving || !canSubmit} className="w-full">
          {saving
            ? 'Menyimpan...'
            : !existing && verifyState !== 'verified'
              ? 'Menunggu Verifikasi Email...'
              : 'Simpan'}
        </Button>
      </form>
    </Modal>
  );
}
