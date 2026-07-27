import { useState } from 'react';
import { Table, TableColumn } from '@/components/Table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { UserForm } from './UserForm';
import { deleteUser } from './user.service';
import { AppUser } from '@/modules/auth/auth.types';

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Superadmin',
  owner: 'Owner',
  staff: 'Staff'
};

/** Menu 3: Kelola User — daftar akun Owner/Staff/Superadmin (§10.4) */
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

  // NOTE: sebelumnya baris ini menyaring/menyembunyikan akun role "superadmin"
  // dari daftar. Sengaja ditampilkan lagi supaya superadmin bisa dikelola
  // (edit profil, sync directory, dll) lewat menu ini seperti user lain.
  const visibleDocs = docs;

  const columns: TableColumn<AppUser>[] = [
    { key: 'nama', header: 'Nama', render: (r) => r.nama },
    { key: 'username', header: 'Username', render: (r) => r.username ?? '-' },
    { key: 'email', header: 'Email', render: (r) => r.email },
    { key: 'role', header: 'Role', render: (r) => ROLE_LABEL[r.role] ?? r.role },
    {
      key: 'emailVerified',
      header: 'Email',
      render: (r) =>
        r.emailVerified ? (
          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full whitespace-nowrap">
            ✓ Terverifikasi
          </span>
        ) : (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full whitespace-nowrap">
            Belum diverifikasi
          </span>
        )
    },
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Kelola User</h1>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          + Tambah User
        </Button>
      </div>

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
