import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableColumn } from '@/components/Table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PinDialog } from '@/components/PinDialog';
import { ListControls } from '@/components/ListControls';
import { usePinGuard } from '@/hooks/usePinGuard';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { deleteRiwayat } from './riwayat.service';
import { jalankanGuardHapusRiwayat, GuardResult } from './relasiGuard';
import { RiwayatForm } from './RiwayatForm';
import { PenyatuanLahanForm } from './PenyatuanLahanForm';
import { PerubahanDataForm } from './PerubahanDataForm';
import { PilihBidangPecahLahan } from './PilihBidangPecahLahan';
import { Riwayat } from './riwayat.types';

const JENIS_LABEL: Record<string, string> = {
  'jual-beli': 'Jual-Beli',
  waris: 'Waris',
  'pecah-lahan': 'Pecah Lahan',
  'penyatuan-lahan': 'Penyatuan Lahan',
  'pembaruan-data': 'Pembaruan Data Saja',
  'belum-ada-transaksi': 'Belum Ada Transaksi'
};

const JENIS_FILTER_OPTIONS = Object.entries(JENIS_LABEL).map(([value, label]) => ({ value, label }));

const STATUS_FILTER_OPTIONS = [
  { value: 'final', label: 'Final' },
  { value: 'draft', label: 'Pending (Draft)' }
];

const SORT_OPTIONS = [
  { value: 'tanggalKejadian', label: 'Tanggal' },
  { value: 'jenisPeristiwa', label: 'Jenis Peristiwa' },
  { value: 'pemilikBaru', label: 'Pemilik Baru' }
];

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
  const { requestPin, pinDialogProps } = usePinGuard();

  // SearchBar, Filter, Sort By — bekerja di sisi klien terhadap data yang sudah ter-load
  const [keyword, setKeyword] = useState('');
  const [jenisFilter, setJenisFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('tanggalKejadian');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const visibleDocs = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    let hasil = docs.filter((r) => {
      const cocokKeyword =
        !kw ||
        r.pemilikBaru?.nama?.toLowerCase().includes(kw) ||
        r.pemilikSebelumnya?.nama?.toLowerCase().includes(kw) ||
        r.keterangan?.toLowerCase().includes(kw) ||
        r.pembeli?.toLowerCase().includes(kw) ||
        (JENIS_LABEL[r.jenisPeristiwa] ?? r.jenisPeristiwa).toLowerCase().includes(kw);
      const cocokJenis = !jenisFilter || r.jenisPeristiwa === jenisFilter;
      const cocokStatus = !statusFilter || r.status === statusFilter;
      return cocokKeyword && cocokJenis && cocokStatus;
    });

    hasil = [...hasil].sort((a, b) => {
      let av = '';
      let bv = '';
      if (sortBy === 'tanggalKejadian') {
        av = a.tanggalKejadian ?? '';
        bv = b.tanggalKejadian ?? '';
      } else if (sortBy === 'jenisPeristiwa') {
        av = JENIS_LABEL[a.jenisPeristiwa] ?? a.jenisPeristiwa;
        bv = JENIS_LABEL[b.jenisPeristiwa] ?? b.jenisPeristiwa;
      } else if (sortBy === 'pemilikBaru') {
        av = a.pemilikBaru?.nama ?? '';
        bv = b.pemilikBaru?.nama ?? '';
      }
      return sortDir === 'asc' ? av.localeCompare(bv, 'id-ID') : bv.localeCompare(av, 'id-ID');
    });

    return hasil;
  }, [docs, keyword, jenisFilter, statusFilter, sortBy, sortDir]);

  const columns: TableColumn<Riwayat>[] = [
    { key: 'tanggal', header: 'Tanggal', render: (r) => r.tanggalKejadian },
    {
      key: 'jenis',
      header: 'Jenis Peristiwa',
      render: (r) => JENIS_LABEL[r.jenisPeristiwa] ?? r.jenisPeristiwa
    },
    { key: 'pemilikBaru', header: 'Pemilik Baru', render: (r) => r.pemilikBaru?.nama ?? '-' },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.status === 'draft' ? (
          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
            Pending (Draft)
          </span>
        ) : (
          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
            Final
          </span>
        )
    },
    {
      key: 'aksi',
      header: 'Aksi',
      render: (r) => (
        <div className="flex gap-3 justify-end md:justify-start">
          {r.status === 'draft' && r.jenisPeristiwa === 'pecah-lahan' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/transaksi/perubahan-data?tanahId=${r.tanahId}&draftId=${r.id}`);
              }}
              className="text-primary-700 text-sm hover:underline min-h-[44px]"
            >
              Lanjutkan
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMintaHapus(r);
            }}
            className="text-red-600 text-sm hover:underline min-h-[44px]"
          >
            Hapus
          </button>
        </div>
      )
    }
  ];

  async function handleMintaHapus(riwayat: Riwayat) {
    requestPin(async () => {
      setTarget(riwayat);
      const hasil = await jalankanGuardHapusRiwayat(riwayat);
      if (hasil.length > 0) {
        setWarnings(hasil);
        setWarningIndex(0);
      } else {
        setConfirmSimple(true);
      }
    });
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold">Transaksi</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={() => navigate('/transaksi/pecah-lahan')}>
            + Pemecahan Lahan
          </Button>
          <Button variant="secondary" onClick={() => navigate('/transaksi/penyatuan')}>
            + Penyatuan Lahan
          </Button>
          <Button onClick={() => navigate('/transaksi/tambah')}>+ Catat Transaksi</Button>
        </div>
      </div>

      <ListControls
        searchValue={keyword}
        onSearchChange={setKeyword}
        searchPlaceholder="Cari Pemilik / Pembeli / Keterangan / Jenis..."
        filters={[
          {
            key: 'jenis',
            label: 'Jenis Peristiwa',
            value: jenisFilter,
            options: JENIS_FILTER_OPTIONS,
            onChange: setJenisFilter
          },
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            options: STATUS_FILTER_OPTIONS,
            onChange: setStatusFilter
          }
        ]}
        sortOptions={SORT_OPTIONS}
        sortValue={sortBy}
        onSortChange={setSortBy}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
      />

      <Table
        columns={columns}
        data={visibleDocs}
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

      <PinDialog {...pinDialogProps} />
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

export function TransaksiPenyatuanPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Penyatuan Lahan</h1>
      <PenyatuanLahanForm />
    </div>
  );
}

/**
 * Titik masuk "+ Pemecahan Lahan" dari halaman Transaksi — cari & pilih bidang
 * sumber dulu, lalu diteruskan ke alur Perubahan Data (§ PilihBidangPecahLahan.tsx).
 */
export function TransaksiPecahLahanPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Pemecahan Lahan</h1>
      <PilihBidangPecahLahan />
    </div>
  );
}

/**
 * Alur "Perubahan Data" — dipicu dari tombol di halaman detail Master Tanah.
 * Pilih alasan (jual-beli/waris/pembaruan data saja) → Apakah Luas Bidang Tetap?
 * → isi data pemilik baru, ATAU kalau tidak tetap → Form Pecah Lahan.
 */
export function TransaksiPerubahanDataPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Perubahan Data Tanah</h1>
      <PerubahanDataForm />
    </div>
  );
}
