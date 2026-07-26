import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Riwayat } from '@/modules/transaksi/riwayat.types';
import { Tanah } from './tanah.types';
import { formatPemilikSingkat } from '@/types/pemilik.types';

interface ExportRow {
  tanah: Tanah;
  riwayat: Riwayat[];
}

/**
 * Export laporan Excel dengan RUMUS HIDUP (bukan nilai statis), sesuai §10.2 PRD.
 * Semua proses client-side — tidak menyentuh kuota Firebase/Cloudinary/EmailJS.
 */
export async function exportLaporanExcel(rows: ExportRow[], rentang: { dari: string; sampai: string }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aplikasi Riwayat Tanah Desa';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laporan Riwayat Tanah');

  sheet.columns = [
    { header: 'No. Sertifikat', key: 'nomorSertifikat', width: 20 },
    { header: 'Lokasi', key: 'lokasi', width: 25 },
    { header: 'Luas (m²)', key: 'luas', width: 14 },
    { header: 'Pemilik Saat Ini', key: 'pemilikSaatIni', width: 22 },
    { header: 'Jenis Peristiwa Terakhir', key: 'jenisPeristiwa', width: 20 },
    { header: 'Tanggal Kejadian', key: 'tanggalKejadian', width: 18 }
  ];
  sheet.getRow(1).font = { bold: true };

  rows.forEach(({ tanah, riwayat }) => {
    const terbaru = riwayat[0];
    sheet.addRow({
      nomorSertifikat: tanah.nomorSertifikat,
      lokasi: tanah.lokasi,
      luas: tanah.luas,
      pemilikSaatIni: formatPemilikSingkat(tanah.pemilikSaatIni),
      jenisPeristiwa: terbaru?.jenisPeristiwa ?? '-',
      tanggalKejadian: terbaru?.tanggalKejadian ?? '-'
    });
  });

  const lastDataRow = rows.length + 1;

  // Baris ringkasan dengan RUMUS HIDUP (bukan nilai statis) — sesuai §10.2 poin 4
  const summaryStartRow = lastDataRow + 2;
  sheet.getCell(`A${summaryStartRow}`).value = 'Total Bidang';
  sheet.getCell(`B${summaryStartRow}`).value = { formula: `COUNTA(A2:A${lastDataRow})` };

  sheet.getCell(`A${summaryStartRow + 1}`).value = 'Total Luas (m²)';
  sheet.getCell(`B${summaryStartRow + 1}`).value = { formula: `SUM(C2:C${lastDataRow})` };

  sheet.getCell(`A${summaryStartRow + 2}`).value = 'Jumlah Jual-Beli';
  sheet.getCell(`B${summaryStartRow + 2}`).value = {
    formula: `COUNTIF(E2:E${lastDataRow},"jual-beli")`
  };

  sheet.getCell(`A${summaryStartRow + 3}`).value = 'Jumlah Waris';
  sheet.getCell(`B${summaryStartRow + 3}`).value = {
    formula: `COUNTIF(E2:E${lastDataRow},"waris")`
  };

  sheet.getCell(`A${summaryStartRow + 4}`).value = 'Jumlah Pecah Lahan';
  sheet.getCell(`B${summaryStartRow + 4}`).value = {
    formula: `COUNTIF(E2:E${lastDataRow},"pecah-lahan")`
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `Laporan-Tanah-Desa_${rentang.dari}_${rentang.sampai}.xlsx`);
}
