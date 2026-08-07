import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Riwayat } from '@/modules/transaksi/riwayat.types';
import { Tanah } from './tanah.types';
import { formatPemilikSingkat } from '@/types/pemilik.types';

interface ExportRow {
  tanah: Tanah;
  riwayat: Riwayat[];
}

const LEBAR_MIN = 10;
const LEBAR_MAX = 45;

/** Auto-fit lebar kolom berdasarkan konten terpanjang (header maupun isi baris),
 * dibatasi min/max supaya tetap rapi walau ada teks yang sangat panjang/pendek. */
function autoFitLebarKolom(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    let maxLen = (col.header?.toString().length ?? 10) + 2; // header + sedikit ruang tombol filter
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const teks = cell.value?.toString() ?? '';
      if (teks.length > maxLen) maxLen = teks.length;
    });
    col.width = Math.min(Math.max(maxLen + 2, LEBAR_MIN), LEBAR_MAX);
  });
}

/**
 * Export laporan Excel dengan RUMUS HIDUP (bukan nilai statis), sesuai §10.2 PRD.
 * Kolom auto-fit mengikuti isi, header ditebalkan+diberi warna, baris beku (freeze
 * pane), dan filter otomatis di header — supaya rapi & langsung enak dipakai.
 * Semua proses client-side — tidak menyentuh kuota Firebase/Cloudinary/EmailJS.
 */
export async function exportLaporanExcel(rows: ExportRow[], rentang: { dari: string; sampai: string }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aplikasi Riwayat Tanah Desa';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laporan Riwayat Tanah', {
    views: [{ state: 'frozen', ySplit: 1 }] // baris header selalu terlihat saat scroll
  });

  sheet.columns = [
    { header: 'No. Sertifikat', key: 'nomorSertifikat', width: 20 },
    { header: 'Lokasi', key: 'lokasi', width: 25 },
    { header: 'Luas (m²)', key: 'luas', width: 14, style: { numFmt: '#,##0' } },
    { header: 'Pemilik Saat Ini', key: 'pemilikSaatIni', width: 22 },
    { header: 'Jenis Peristiwa Terakhir', key: 'jenisPeristiwa', width: 20 },
    { header: 'Tanggal Kejadian', key: 'tanggalKejadian', width: 18 }
  ];

  // Styling header: tebal, teks putih, latar hijau (senada warna utama aplikasi)
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }; // primary-800
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 20;

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

  // Border tipis di semua sel data + header, supaya rapi kalau dicetak/dilihat
  for (let r = 1; r <= lastDataRow; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= sheet.columns.length; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    }
  }

  // Filter otomatis di header (dropdown sort/filter per kolom bawaan Excel)
  sheet.autoFilter = { from: 'A1', to: `F${lastDataRow}` };

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
  for (let r = summaryStartRow; r <= summaryStartRow + 4; r++) {
    sheet.getCell(`A${r}`).font = { bold: true };
  }

  autoFitLebarKolom(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `Laporan-Tanah-Desa_${rentang.dari}_${rentang.sampai}.xlsx`);
}
