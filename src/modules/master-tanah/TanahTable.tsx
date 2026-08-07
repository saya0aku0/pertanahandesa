import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableColumn } from '@/components/Table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { ListControls } from '@/components/ListControls';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { Tanah } from './tanah.types';

const SORT_OPTIONS = [
  { value: 'nomorSertifikat', label: 'No. Sertifikat' },
  { value: 'lokasi', label: 'Lokasi Tanah' },
  { value: 'luas', label: 'Luas' },
  { value: 'tanggalTerbitSertifikat', label: 'Tgl. Terbit' }
];

const STATUS_OPTIONS = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'draft', label: 'Pending (Draft)' }
];

/** Tabel data terkini — 1 baris = 1 bidang tanah, status terbaru saja (§3, §10.1) */
export function TanahTable() {
  const { docs, loading, error, hasMore, loadMore } = useFirestoreCollection<Tanah>('tanah', [], 25);
  const navigate = useNavigate();
  const [tampilkanArsip, setTampilkanArsip] = useState(false);

  // SearchBar, Filter, Sort By — bekerja di sisi klien terhadap data yang sudah ter-load
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('nomorSertifikat');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Bidang yang sudah "sudah-digabung" disembunyikan dari tabel utama secara default
  // (data tetap ada di database, cuma diarsipkan dari tampilan supaya tidak membingungkan).
  const jumlahArsip = docs.filter((d) => d.statusGabung === 'sudah-digabung').length;
  const arsipFiltered = tampilkanArsip
    ? docs
    : docs.filter((d) => d.statusGabung !== 'sudah-digabung');

  const visibleDocs = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    let hasil = arsipFiltered.filter((d) => {
      const cocokKeyword =
        !kw ||
        d.nomorSertifikat?.toLowerCase().includes(kw) ||
        d.lokasi?.toLowerCase().includes(kw) ||
        d.pemilikSaatIni?.nama?.toLowerCase().includes(kw) ||
        d.nomorSuratUkur?.toLowerCase().includes(kw);
      const cocokStatus = !statusFilter || d.status === statusFilter;
      return cocokKeyword && cocokStatus;
    });

    hasil = [...hasil].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortBy === 'luas') {
        av = a.luas ?? 0;
        bv = b.luas ?? 0;
      } else if (sortBy === 'nomorSertifikat') {
        av = a.nomorSertifikat ?? '';
        bv = b.nomorSertifikat ?? '';
      } else if (sortBy === 'lokasi') {
        av = a.lokasi ?? '';
        bv = b.lokasi ?? '';
      } else if (sortBy === 'tanggalTerbitSertifikat') {
        av = a.tanggalTerbitSertifikat ?? '';
        bv = b.tanggalTerbitSertifikat ?? '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), 'id-ID')
        : String(bv).localeCompare(String(av), 'id-ID');
    });

    return hasil;
  }, [arsipFiltered, keyword, statusFilter, sortBy, sortDir]);

  const columns: TableColumn<Tanah>[] = [
    { key: 'nomorSertifikat', header: 'No. Sertifikat', render: (r) => r.nomorSertifikat },
    {
      key: 'lokasi',
      header: 'Lokasi Tanah',
      render: (r) => (
        <div className="whitespace-normal leading-snug md:min-w-[220px] lg:min-w-[280px]">
          {r.lokasi}
        </div>
      )
    },
    { key: 'pemilikSaatIni', header: 'NIK Pemilik', render: (r) => r.pemilikSaatIni?.nik || '-' },
    {
      key: 'sertifikat',
      header: 'Detail Sertifikat',
      render: (r) =>
        r.slug ? (
          <a
            href={`/master-tanah/sertifikat/${r.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary-700 text-sm hover:underline"
          >
            Lihat Detail
          </a>
        ) : (
          '-'
        )
    },
    { key: 'luas', header: 'Luas (m²)', render: (r) => r.luas.toLocaleString('id-ID') },
    {
      key: 'induk',
      header: 'Asal Bidang',
      render: (r) => {
        if (r.statusGabung === 'sudah-digabung') return 'Sudah Digabung (Arsip)';
        if (r.parentTanahIds && r.parentTanahIds.length > 0) return 'Hasil Penyatuan Lahan';
        if (r.parentTanahId) return 'Hasil Pecah Lahan';
        return 'Bidang Awal';
      }
    },
    {
      key: 'status',
      header: '',
      render: (r) =>
        r.status === 'draft' ? (
          <span
            className="relative inline-flex h-3 w-3"
            title="Pending (Draft) — belum disimpan final"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
          </span>
        ) : (
          <span
            className="inline-flex h-3 w-3 rounded-full bg-green-500"
            title="Aktif — sudah tersimpan final"
          />
        )
    }
  ];

  if (loading && docs.length === 0) return <LoadingSpinner />;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      <ListControls
        searchValue={keyword}
        onSearchChange={setKeyword}
        searchPlaceholder="Cari No. Sertifikat / Lokasi / Pemilik / No. Surat Ukur..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            options: STATUS_OPTIONS,
            onChange: setStatusFilter
          }
        ]}
        sortOptions={SORT_OPTIONS}
        sortValue={sortBy}
        onSortChange={setSortBy}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
      />
      {jumlahArsip > 0 && (
        <button
          onClick={() => setTampilkanArsip((v) => !v)}
          className="text-sm text-primary-700 hover:underline"
        >
          {tampilkanArsip
            ? 'Sembunyikan bidang yang sudah digabung'
            : `Tampilkan ${jumlahArsip} bidang yang sudah digabung (arsip)`}
        </button>
      )}
      <Table
        columns={columns}
        data={visibleDocs}
        keyExtractor={(r) => r.id}
        onRowClick={(r) => navigate(`/master-tanah/${r.id}`)}
        emptyMessage="Belum ada data bidang tanah."
      />
      {hasMore && (
        <div className="text-center">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
          </Button>
        </div>
      )}
    </div>
  );
}
