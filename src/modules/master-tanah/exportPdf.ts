import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Riwayat } from '@/modules/transaksi/riwayat.types';
import { Tanah } from './tanah.types';
import { formatPemilikSingkat } from '@/types/pemilik.types';

interface ExportRow {
  tanah: Tanah;
  riwayat: Riwayat[];
}

/**
 * Export laporan PDF landscape A4 (versi cetak, nilai statis), sesuai §10.2 poin 5 PRD.
 * Semua proses client-side — tidak menyentuh kuota Firebase/Cloudinary/EmailJS.
 */
export function exportLaporanPdf(rows: ExportRow[], rentang: { dari: string; sampai: string }) {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

  doc.setFontSize(14);
  doc.text('Laporan Riwayat Kepemilikan Tanah Desa', 14, 15);
  doc.setFontSize(10);
  doc.text(`Periode: ${rentang.dari} s/d ${rentang.sampai}`, 14, 22);

  const body = rows.map(({ tanah, riwayat }) => {
    const terbaru = riwayat[0];
    return [
      tanah.nomorSertifikat,
      tanah.lokasi,
      tanah.luas.toLocaleString('id-ID'),
      formatPemilikSingkat(tanah.pemilikSaatIni),
      terbaru?.jenisPeristiwa ?? '-',
      terbaru?.tanggalKejadian ?? '-'
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: [['No. Sertifikat', 'Lokasi', 'Luas (m²)', 'Pemilik Saat Ini', 'Jenis Peristiwa', 'Tanggal']],
    body,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 101, 52] } // primary-800
  });

  const totalLuas = rows.reduce((sum, r) => sum + r.tanah.luas, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFontSize(10);
  doc.text(`Total Bidang: ${rows.length}`, 14, finalY + 10);
  doc.text(`Total Luas: ${totalLuas.toLocaleString('id-ID')} m²`, 14, finalY + 16);

  doc.save(`Laporan-Tanah-Desa_${rentang.dari}_${rentang.sampai}.pdf`);
}
