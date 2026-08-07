import { useState } from 'react';
import { Table, TableColumn } from '@/components/Table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { UserForm } from './UserForm';
import { deleteUser } from './user.service';
import { AppUser } from '@/modules/auth/auth.types';

export const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Superadmin',
  owner: 'Petugas Utama',
  staff: 'Akun Cadangan (Emergency Access)'
};

// Batas jumlah akun yang disarankan untuk pemakaian 1 petugas/1 perangkat:
// 1 akun utama (dipakai sehari-hari) + 1 akun cadangan (mis. Kepala Desa/Sekdes,
// dipakai HANYA kalau akun utama lupa password/tidak bisa diakses). Bukan hard-limit
// teknis (tetap bisa ditambah lewat Firebase Console kalau benar perlu), cuma
// pengingat di UI supaya tidak menambah akun tanpa perlu jelas.
const BATAS_AKUN_DISARANKAN = 2;

/** Menu 3: Kelola User — 1 akun utama + 1 akun cadangan untuk pemakaian jangka panjang (§10.4) */
export function KelolaUserPage() {
  const { docs, loading, error, hasMore, loadMore, reload } = useFirestoreCollection<AppUser>(
    'users',
    [],
    25
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sembunyikan akun Superadmin dari daftar — akun ini bersifat teknis/pengelola sistem,
  // tidak untuk ditampilkan atau dikelola lewat menu Kelola User biasa.
  const visibleDocs = docs.filter((u) => u.role !== 'superadmin');
  const sudahMencapaiBatas = visibleDocs.length >= BATAS_AKUN_DISARANKAN;

  const columns: TableColumn<AppUser>[] = [
    { key: 'nama', header: 'Nama', render: (r) => r.nama },
    { key: 'username', header: 'Username', render: (r) => r.username ?? '-' },
    { key: 'email', header: 'Email', render: (r) => r.email },
    { key: 'role', header: 'Role', render: (r) => ROLE_LABEL[r.role] ?? r.role },
    {
      key: 'aksi',
      header: 'Aksi',
      render: (r) => (
        <div className="flex gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(r);
              setFormOpen(true);
            }}
            className="text-primary-700 text-sm hover:underline min-h-[44px]"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(r);
            }}
            className="text-red-600 text-sm hover:underline min-h-[44px]"
          >
            Hapus
          </button>
        </div>
      )
    }
  ];

  async function handleHapus() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      await reload();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (loading && docs.length === 0) return <LoadingSpinner />;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold">Kelola User</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Disarankan cukup 2 akun: 1 <strong>Petugas Utama</strong> (dipakai sehari-hari) + 1{' '}
            <strong>Akun Cadangan</strong> untuk jaga-jaga (mis. Kepala Desa/Sekdes) kalau akun
            utama tidak bisa diakses.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          disabled={sudahMencapaiBatas}
          title={
            sudahMencapaiBatas
              ? 'Sudah ada 2 akun. Edit akun yang ada, atau hapus salah satu dulu kalau memang perlu akun baru.'
              : undefined
          }
        >
          + Tambah User
        </Button>
      </div>
      {sudahMencapaiBatas && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Sudah ada {visibleDocs.length} akun (batas yang disarankan). Kalau memang butuh akun
          tambahan, tetap bisa lewat Firebase Console — tapi untuk 1 petugas 1 perangkat,
          biasanya 2 akun ini sudah cukup.
        </p>
      )}

      <Table columns={columns} data={visibleDocs} keyExtractor={(r) => r.id} emptyMessage="Belum ada user." />
      {hasMore && (
        <div className="text-center">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
          </Button>
        </div>
      )}

      <UserForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        existing={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus User"
        message={`Yakin ingin menghapus user "${deleteTarget?.nama}"? Catatan: ini hanya menghapus profil, akun login perlu dinonaktifkan manual di Firebase Console.`}
        confirmLabel="Ya, hapus"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleHapus}
      />
    </div>
  );
}
