import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableColumn } from '@/components/Table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { deleteRiwayat } from './riwayat.service';
import { jalankanGuardHapusRiwayat, GuardResult } from './relasiGuard';
import { RiwayatForm } from './RiwayatForm';
import { Riwayat } from './riwayat.types';

const JENIS_LABEL: Record<string, string> = {
  'jual-beli': 'Jual-Beli',
  waris: 'Waris',
  'pecah-lahan': 'Pecah Lahan',
  'belum-ada-transaksi': 'Belum Ada Transaksi'
};

/** Menu 2: Transaksi — daftar semua riwayat, urut tanggal terbaru (§3, §10.3) */
export function TransaksiListPage() {
  const navigate = useNavigate();
  const { docs, loading, error, hasMore, loadMore, reload } = useFirestoreCollection<Riwayat>(
    'riwayat',
    [],
    25
  );

  const [target, setTarget] = useState<Riwayat | null>(null);
  const [warnings, setWarnings] = useState<GuardResult[]>([]);
  const [warningIndex, setWarningIndex] = useState(0);
  const [confirmSimple, setConfirmSimple] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const columns: TableColumn<Riwayat>[] = [
    { key: 'tanggal', header: 'Tanggal', render: (r) => r.tanggalKejadian },
    {
      key: 'jenis',
      header: 'Jenis Peristiwa',
      render: (r) => JENIS_LABEL[r.jenisPeristiwa] ?? r.jenisPeristiwa
    },
    { key: 'pemilikBaru', header: 'Pemilik Baru', render: (r) => r.namaPemilikBaru },
    {
      key: 'aksi',
      header: 'Aksi',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMintaHapus(r);
          }}
          className="text-red-600 text-sm hover:underline min-h-[44px]"
        >
          Hapus
        </button>
      )
    }
  ];

  async function handleMintaHapus(riwayat: Riwayat) {
    setTarget(riwayat);
    const hasil = await jalankanGuardHapusRiwayat(riwayat);
    if (hasil.length > 0) {
      setWarnings(hasil);
      setWarningIndex(0);
    } else {
      setConfirmSimple(true);
    }
  }

  async function eksekusiHapus(riwayat: Riwayat) {
    setDeleting(true);
    try {
      await deleteRiwayat(riwayat.id);
      await reload();
    } finally {
      setDeleting(false);
      setTarget(null);
      setWarnings([]);
      setWarningIndex(0);
      setConfirmSimple(false);
    }
  }

  async function handleLanjutkanWarning() {
    if (!target) return;
    const current = warnings[warningIndex];
    if (current.onConfirmed) await current.onConfirmed();

    if (warningIndex + 1 < warnings.length) {
      setWarningIndex((i) => i + 1);
    } else {
      await eksekusiHapus(target);
    }
  }

  if (loading && docs.length === 0) return <LoadingSpinner />;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Transaksi</h1>
        <Button onClick={() => navigate('/transaksi/tambah')}>+ Catat Transaksi</Button>
      </div>

      <Table
        columns={columns}
        data={docs}
        keyExtractor={(r) => r.id}
        emptyMessage="Belum ada transaksi."
      />
      {hasMore && (
        <div className="text-center">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
          </Button>
        </div>
      )}

      {/* Guard relasi §11 — tampil berurutan jika lebih dari 1 peringatan relevan */}
      {target && warnings.length > 0 && (
        <ConfirmDialog
          open={true}
          message={warnings[warningIndex].pesan}
          loading={deleting}
          onCancel={() => {
            setTarget(null);
            setWarnings([]);
            setWarningIndex(0);
          }}
          onConfirm={handleLanjutkanWarning}
        />
      )}

      {/* Konfirmasi sederhana jika tidak ada relasi khusus yang terdampak */}
      {target && confirmSimple && (
        <ConfirmDialog
          open={true}
          title="Hapus Transaksi"
          message={`Yakin ingin menghapus riwayat "${
            JENIS_LABEL[target.jenisPeristiwa] ?? target.jenisPeristiwa
          }" tanggal ${target.tanggalKejadian}? Aksi ini tidak dapat dibatalkan.`}
          confirmLabel="Ya, hapus"
          loading={deleting}
          onCancel={() => {
            setTarget(null);
            setConfirmSimple(false);
          }}
          onConfirm={() => eksekusiHapus(target)}
        />
      )}
    </div>
  );
}

export function TransaksiTambahPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Catat Transaksi Baru</h1>
      <RiwayatForm />
    </div>
  );
}
