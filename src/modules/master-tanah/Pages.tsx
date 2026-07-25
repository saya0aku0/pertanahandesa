import { useParams, useNavigate } from 'react-router-dom';
import { DashboardSummary } from './DashboardSummary';
import { TanahTable } from './TanahTable';
import { ExportPanel } from './ExportPanel';
import { TanahForm } from './TanahForm';
import { TanahSilsilah } from './TanahSilsilah';
import { useFirestoreDoc } from '@/hooks/useFirestoreDoc';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { Tanah } from './tanah.types';

/** Menu 1: Master Tanah — dashboard ringkas + tabel data terkini + tombol Export (§3, §10.1) */
export function MasterTanahListPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold">Master Tanah</h1>
        <div className="flex gap-2">
          <ExportPanel />
          <Button onClick={() => navigate('/master-tanah/tambah')}>+ Tambah Bidang</Button>
        </div>
      </div>
      <DashboardSummary />
      <TanahTable />
    </div>
  );
}

export function MasterTanahTambahPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Tambah Bidang Tanah</h1>
      <TanahForm />
    </div>
  );
}

export function MasterTanahDetailPage() {
  const { id } = useParams();
  const { data: tanah, loading } = useFirestoreDoc<Tanah>('tanah', id);

  if (loading) return <LoadingSpinner />;
  if (!tanah) return <p className="text-sm text-gray-500">Bidang tanah tidak ditemukan.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold">{tanah.nomorSertifikat}</h1>
        <p className="text-sm text-gray-500">{tanah.lokasi}</p>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Luas</span>
          <span className="font-medium">{tanah.luas.toLocaleString('id-ID')} m²</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Pemilik Saat Ini</span>
          <span className="font-medium">{tanah.pemilikSaatIni}</span>
        </div>
        {tanah.nomorSuratUkur && (
          <div className="flex justify-between">
            <span className="text-gray-500">No. Surat Ukur</span>
            <span className="font-medium">{tanah.nomorSuratUkur}</span>
          </div>
        )}
      </div>

      <TanahSilsilah tanah={tanah} />

      <details className="bg-white border rounded-xl p-4">
        <summary className="cursor-pointer font-medium text-sm">Edit Data Bidang</summary>
        <div className="mt-4">
          <TanahForm existing={tanah} />
        </div>
      </details>
    </div>
  );
}
