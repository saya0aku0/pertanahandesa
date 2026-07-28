import { useEffect, useState } from 'react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Button } from '@/components/Button';
import { developerProfile } from './developerProfile';

const CHECKLIST_SERAH_TERIMA = [
  {
    judul: 'Akun Login Aplikasi',
    detail:
      'Pastikan penerima jabatan sudah punya akun di menu Kelola User (role "Petugas Utama"), dengan email, username, password, dan PIN sendiri — jangan wariskan akun lama begitu saja.'
  },
  {
    judul: 'Project Firebase',
    detail:
      'Tambahkan penerima jabatan sebagai Owner/Editor di Firebase Console (Project Settings > Users and permissions), supaya kalau perlu, dia bisa akses Firestore/Authentication langsung.'
  },
  {
    judul: 'Akun Cloudinary',
    detail:
      'Info login akun Cloudinary (untuk penyimpanan foto/lampiran) diserahkan juga — cek folder tempat kredensial ini dicatat/disimpan.'
  },
  {
    judul: 'Hosting (Vercel) & Domain',
    detail:
      'Kalau ada, tambahkan penerima jabatan sebagai anggota project di Vercel supaya bisa deploy update aplikasi di masa depan.'
  },
  {
    judul: 'Kode Sumber Aplikasi',
    detail:
      'Pastikan salinan kode sumber (folder project ini) tersimpan di tempat yang bisa diakses penerima jabatan, misalnya Google Drive kantor desa atau repository GitHub.'
  },
  {
    judul: 'Backup Data Terakhir',
    detail:
      'Lakukan "Backup Sekarang" (lihat banner Backup Tahunan di dashboard) sebelum serah terima, supaya ada salinan Excel data terbaru per tanggal serah terima.'
  },
  {
    judul: 'Dokumen Fisik Terkait',
    detail:
      'Serahkan juga map/berkas fisik sertifikat tanah, terutama yang sudah ditempeli QR Code, supaya penerima jabatan tahu cara mencocokkan data digital dan fisik.'
  },
  {
    judul: 'Kontak Developer',
    detail: `Kalau ada kendala teknis di kemudian hari, penerima jabatan bisa menghubungi developer aplikasi (${developerProfile.nama}) lewat WhatsApp atau email — info lengkap ada di bagian bawah halaman Pusat Bantuan.`
  }
];

/**
 * "Mode Serah Terima Jabatan" — disiapkan untuk pemakaian jangka panjang oleh 1 petugas
 * (bertahun-tahun sampai pensiun). Halaman ini BUKAN untuk mengelola user teknis, tapi
 * membantu proses transisi ke petugas baru: checklist hal-hal yang perlu diserahkan,
 * ringkasan kondisi data terakhir, dan panduan yang bisa diunduh/dicetak.
 */
export function SerahTerimaPage() {
  const [totalTanah, setTotalTanah] = useState<number | null>(null);
  const [totalRiwayat, setTotalRiwayat] = useState<number | null>(null);

  useEffect(() => {
    async function muatRingkasan() {
      const [tanahSnap, riwayatSnap] = await Promise.all([
        getCountFromServer(collection(db, 'tanah')),
        getCountFromServer(collection(db, 'riwayat'))
      ]);
      setTotalTanah(tanahSnap.data().count);
      setTotalRiwayat(riwayatSnap.data().count);
    }
    muatRingkasan();
  }, []);

  function unduhPanduan() {
    const tanggal = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' });
    const isi = `PANDUAN SERAH TERIMA JABATAN
Aplikasi: Riwayat Tanah Desa
Tanggal dibuat: ${tanggal}

RINGKASAN DATA PER TANGGAL INI
- Total Bidang Tanah tercatat: ${totalTanah ?? '-'}
- Total Riwayat/Transaksi tercatat: ${totalRiwayat ?? '-'}

CHECKLIST SERAH TERIMA
${CHECKLIST_SERAH_TERIMA.map((c, i) => `${i + 1}. ${c.judul}\n   ${c.detail}`).join('\n\n')}

CATATAN
Panduan ini dibuat otomatis oleh aplikasi. Mohon lengkapi/perbarui sesuai kondisi
sebenarnya saat serah terima berlangsung, dan simpan salinannya (cetak/PDF) sebagai
arsip bersama Kepala Desa/Sekretaris Desa.
`;
    const blob = new Blob([isi], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panduan-serah-terima-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold">Serah Terima Jabatan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Disiapkan untuk membantu proses transisi ke petugas pengganti di masa depan —
          checklist, ringkasan data, dan panduan yang bisa diunduh/dicetak.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-2xl font-bold text-primary-800">{totalTanah ?? '...'}</p>
          <p className="text-xs text-gray-500 mt-1">Total Bidang Tanah</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-2xl font-bold text-primary-800">{totalRiwayat ?? '...'}</p>
          <p className="text-xs text-gray-500 mt-1">Total Riwayat/Transaksi</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm text-gray-700">Checklist Serah Terima</h2>
        {CHECKLIST_SERAH_TERIMA.map((item, idx) => (
          <div key={idx} className="bg-white border rounded-xl p-4">
            <p className="text-sm font-medium">
              {idx + 1}. {item.judul}
            </p>
            <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
          </div>
        ))}
      </section>

      <Button onClick={unduhPanduan} className="w-full">
        📄 Unduh Panduan Serah Terima (.txt)
      </Button>
    </div>
  );
}
