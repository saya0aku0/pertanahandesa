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
  const navigate = useNavigate();
  const { data: tanah, loading } = useFirestoreDoc<Tanah>('tanah', id);

  if (loading) return <LoadingSpinner />;
  if (!tanah) return <p className="text-sm text-gray-500">Bidang tanah tidak ditemukan.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold">{tanah.nomorSertifikat}</h1>
          <p className="text-sm text-gray-500">{tanah.lokasi}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {tanah.status === 'draft' && (
              <span className="inline-block text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                Pending (Draft)
              </span>
            )}
            {tanah.statusGabung === 'sudah-digabung' && (
              <span className="inline-block text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                Arsip — Sudah Digabung
              </span>
            )}
            {tanah.statusPecah === 'sudah-dipecah' && (
              <span className="inline-block text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                Arsip — Sudah Dipecah
              </span>
            )}
          </div>
        </div>
        {tanah.status !== 'draft' &&
          tanah.statusGabung !== 'sudah-digabung' &&
          tanah.statusPecah !== 'sudah-dipecah' && (
            <Button onClick={() => navigate(`/transaksi/perubahan-data?tanahId=${tanah.id}`)}>
              Perubahan Data
            </Button>
          )}
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-2 text-sm">
        {tanah.tanggalTerbitSertifikat && (
          <div className="flex justify-between">
            <span className="text-gray-500">Tanggal Terbit / Disahkan</span>
            <span className="font-medium">{tanah.tanggalTerbitSertifikat}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Luas</span>
          <span className="font-medium">
            {tanah.luas.toLocaleString('id-ID')} m²
            {tanah.panjang && tanah.lebar && (
              <span className="text-gray-400"> ({tanah.panjang}m × {tanah.lebar}m)</span>
            )}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Pemilik Saat Ini</span>
          <span className="font-medium text-right">
            {tanah.pemilikSaatIni?.nama || '-'}
            <br />
            <span className="text-xs text-gray-500 font-normal">
              NIK {tanah.pemilikSaatIni?.nik || '-'}
            </span>
            <br />
            <span className="text-xs text-gray-500 font-normal">
              {tanah.pemilikSaatIni?.alamatLengkap || '-'}
            </span>
          </span>
        </div>
        {tanah.nomorSuratUkur && (
          <div className="flex justify-between">
            <span className="text-gray-500">No. Surat Ukur</span>
            <span className="font-medium">{tanah.nomorSuratUkur}</span>
          </div>
        )}
        {tanah.tanggalUkur && (
          <div className="flex justify-between">
            <span className="text-gray-500">Tanggal Ukur</span>
            <span className="font-medium">{tanah.tanggalUkur}</span>
          </div>
        )}
        {tanah.petugasUkur && (
          <div className="flex justify-between">
            <span className="text-gray-500">Petugas Ukur</span>
            <span className="font-medium">{tanah.petugasUkur}</span>
          </div>
        )}
        {tanah.lat != null && tanah.long != null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Koordinat</span>
            <span className="font-medium">
              {tanah.lat}, {tanah.long}
              {tanah.googleMapsLink && (
                <>
                  {' '}
                  <a
                    href={
                      tanah.googleMapsLink.startsWith('http')
                        ? tanah.googleMapsLink
                        : `https://www.google.com/maps?q=${tanah.lat},${tanah.long}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-700 hover:underline"
                  >
                    (buka peta)
                  </a>
                </>
              )}
            </span>
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
