import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Riwayat } from '@/modules/transaksi/riwayat.types';
import { Tanah } from './tanah.types';
import { formatPemilikSingkat } from '@/types/pemilik.types';
import { KopSurat } from '@/modules/pengaturan/kopSurat.service';

interface ExportRow {
  tanah: Tanah;
  riwayat: Riwayat[];
}

/** Ambil gambar dari URL (mis. Cloudinary) lalu ubah jadi base64 data URL, supaya
 * bisa ditempel ke PDF lewat jsPDF (butuh data URL/base64, tidak bisa langsung pakai
 * URL biasa). Kalau gagal (mis. offline), KOP surat tetap dibuat TANPA logo — tidak
 * menggagalkan export laporan. */
async function muatGambarSebagaiDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Gambar KOP Surat (2 logo + info desa) di bagian atas halaman PDF: logo Kabupaten
 * di KIRI, logo Desa di KANAN, teks di tengah — format umum surat dinas Indonesia.
 * Mengembalikan posisi Y setelah kop surat selesai, supaya konten berikutnya (judul
 * laporan, tabel) tidak menabrak kop surat. */
async function gambarKopSurat(doc: jsPDF, kopSurat?: KopSurat): Promise<number> {
  if (!kopSurat || !kopSurat.namaDesa) return 15; // tidak ada setting KOP surat, langsung mulai seperti biasa

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginKiri = 14;
  const logoSize = 22;
  const yLogo = 10;

  async function tempelLogo(url: string | undefined, x: number) {
    if (!url) return;
    const dataUrl = await muatGambarSebagaiDataUrl(url);
    if (!dataUrl) return;
    const formatMatch = /^data:image\/(png|jpe?g|webp)/i.exec(dataUrl);
    const format = formatMatch ? formatMatch[1].toUpperCase().replace('JPG', 'JPEG') : 'PNG';
    try {
      doc.addImage(dataUrl, format, x, yLogo, logoSize, logoSize);
    } catch {
      // Format gambar tidak didukung addImage — lanjut tanpa logo, jangan gagalkan export
    }
  }

  // Logo Kabupaten di KIRI, logo Desa di KANAN (dimuat paralel biar tidak lambat)
  await Promise.all([
    tempelLogo(kopSurat.logoKabupatenUrl, marginKiri),
    tempelLogo(kopSurat.logoDesaUrl, pageWidth - marginKiri - logoSize)
  ]);

  // Teks kop surat di TENGAH halaman (antara 2 logo) — format resmi pemerintahan
  // desa Indonesia: urutan besar ke kecil (Provinsi -> Kabupaten -> Kecamatan -> Desa).
  const xTengah = pageWidth / 2;
  let yBaris = 14;

  doc.setFont('helvetica', 'bold');
  if (kopSurat.namaProvinsi) {
    doc.setFontSize(11);
    doc.text(`PEMERINTAH PROVINSI ${kopSurat.namaProvinsi}`.toUpperCase(), xTengah, yBaris, {
      align: 'center'
    });
    yBaris += 5;
  }
  if (kopSurat.namaKabupaten) {
    doc.setFontSize(11);
    doc.text(`PEMERINTAH KABUPATEN ${kopSurat.namaKabupaten}`.toUpperCase(), xTengah, yBaris, {
      align: 'center'
    });
    yBaris += 5;
  }
  if (kopSurat.namaKecamatan) {
    doc.setFontSize(11);
    doc.text(`KECAMATAN ${kopSurat.namaKecamatan}`.toUpperCase(), xTengah, yBaris, {
      align: 'center'
    });
    yBaris += 5;
  }
  doc.setFontSize(14);
  doc.text(`DESA ${kopSurat.namaDesa}`.toUpperCase(), xTengah, yBaris, { align: 'center' });
  yBaris += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const barisAlamat = [kopSurat.alamat, kopSurat.kodePos ? `Kode Pos ${kopSurat.kodePos}` : null]
    .filter(Boolean)
    .join(', ');
  if (barisAlamat) {
    doc.text(barisAlamat, xTengah, yBaris, { align: 'center' });
    yBaris += 4.5;
  }
  if (kopSurat.kontak) {
    doc.text(kopSurat.kontak, xTengah, yBaris, { align: 'center' });
    yBaris += 4.5;
  }

  const yGarisPembatas = Math.max(yLogo + logoSize, yBaris) + 2;
  doc.setLineWidth(0.6);
  doc.line(marginKiri, yGarisPembatas, pageWidth - marginKiri, yGarisPembatas);

  return yGarisPembatas + 8;
}

/**
 * Export laporan PDF landscape A4 (versi cetak, nilai statis), sesuai §10.2 poin 5 PRD.
 * Kalau setting KOP Surat sudah diisi (lihat Pusat Bantuan > Setting KOP Surat), laporan
 * otomatis pakai kepala surat (logo + nama desa) di bagian atas.
 * Semua proses client-side — tidak menyentuh kuota Firebase/Cloudinary/EmailJS.
 */
export async function exportLaporanPdf(
  rows: ExportRow[],
  rentang: { dari: string; sampai: string },
  kopSurat?: KopSurat
) {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

  const yMulai = await gambarKopSurat(doc, kopSurat);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Laporan Riwayat Kepemilikan Tanah Desa', 14, yMulai);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Periode: ${rentang.dari} s/d ${rentang.sampai}`, 14, yMulai + 7);

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
    startY: yMulai + 13,
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
