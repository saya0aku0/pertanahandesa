import { useState } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { getRiwayatByTanah } from '@/modules/transaksi/riwayat.service';
import { exportLaporanExcel } from './exportExcel';
import { exportLaporanPdf } from './exportPdf';
import { Tanah } from './tanah.types';

/** Panel Export Laporan di dalam Master Tanah (§10.2) */
export function ExportPanel() {
  const [open, setOpen] = useState(false);
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ambil semua bidang tanah untuk daftar centang — dibatasi pageSize besar tapi tetap paginated
  const { docs: allTanah } = useFirestoreCollection<Tanah>('tanah', [], 100);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => (prev.size === allTanah.length ? new Set() : new Set(allTanah.map((t) => t.id))));
  }

  async function buildRows() {
    const selected = allTanah.filter((t) => selectedIds.has(t.id));
    const rows = await Promise.all(
      selected.map(async (tanah) => {
        const riwayatSemua = await getRiwayatByTanah(tanah.id);
        const riwayat = riwayatSemua.filter((r) => {
          if (!dari && !sampai) return true;
          const tgl = new Date(r.tanggalKejadian);
          if (dari && tgl < new Date(dari)) return false;
          if (sampai && tgl > new Date(sampai)) return false;
          return true;
        });
        return { tanah, riwayat };
      })
    );
    return rows;
  }

  async function handleExport(format: 'excel' | 'pdf') {
    if (selectedIds.size === 0) {
      setError('Pilih minimal satu nomor sertifikat untuk diexport.');
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const rows = await buildRows();
      const rentang = { dari: dari || 'semua', sampai: sampai || 'semua' };
      if (format === 'excel') await exportLaporanExcel(rows, rentang);
      else exportLaporanPdf(rows, rentang);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat laporan.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>📤 Export Laporan</Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Export Laporan">
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={dari}
                onChange={(e) => setDari(e.target.value)}
                className="w-full border rounded-lg p-3 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
                className="w-full border rounded-lg p-3 min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Pilih Nomor Sertifikat</label>
              <button onClick={toggleAll} className="text-sm text-primary-700 hover:underline">
                {selectedIds.size === allTanah.length ? 'Batal semua' : 'Pilih semua'}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {allTanah.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-3 p-3 min-h-[44px] hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggle(t.id)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm">
                    {t.nomorSertifikat} — {t.lokasi}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <Button onClick={() => handleExport('excel')} disabled={exporting} className="flex-1">
              {exporting ? 'Memproses...' : '📊 Export Excel (rumus hidup)'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              className="flex-1"
            >
              {exporting ? 'Memproses...' : '📄 Export PDF (landscape A4)'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
