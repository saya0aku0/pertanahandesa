import { useNavigate } from 'react-router-dom';
import { Table, TableColumn } from '@/components/Table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { Tanah } from './tanah.types';

/** Tabel data terkini — 1 baris = 1 bidang tanah, status terbaru saja (§3, §10.1) */
export function TanahTable() {
  const { docs, loading, error, hasMore, loadMore } = useFirestoreCollection<Tanah>('tanah', [], 25);
  const navigate = useNavigate();

  const columns: TableColumn<Tanah>[] = [
    { key: 'nomorSertifikat', header: 'No. Sertifikat', render: (r) => r.nomorSertifikat },
    { key: 'lokasi', header: 'Lokasi', render: (r) => r.lokasi },
    { key: 'luas', header: 'Luas (m²)', render: (r) => r.luas.toLocaleString('id-ID') },
    { key: 'pemilikSaatIni', header: 'Pemilik Saat Ini', render: (r) => r.pemilikSaatIni },
    {
      key: 'induk',
      header: 'Asal Bidang',
      render: (r) => (r.parentTanahId ? 'Hasil Pecah Lahan' : 'Bidang Awal')
    }
  ];

  if (loading && docs.length === 0) return <LoadingSpinner />;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      <Table
        columns={columns}
        data={docs}
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
