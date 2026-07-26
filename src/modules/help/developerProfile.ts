// Data kontak developer ditampilkan di Pusat Bantuan (§10.5).
export const developerProfile = {
  nama: 'Mahfud Febry Styanto',
  email: 'Mahfudfebrys@gmail.com',
  whatsapp: '6282234651413',
  whatsappLink: 'https://wa.me/6282234651413',
  catatan:
    'Hubungi developer untuk laporan bug, permintaan fitur, atau kendala teknis lainnya.'
};

export const faqList = [
  {
    pertanyaan: 'Bagaimana cara mencatat transaksi jual-beli tanah?',
    jawaban:
      'Buka menu Transaksi > Catat Transaksi, cari nomor sertifikat di kolom pencarian. Jika bidang belum terdaftar, sistem akan menawarkan untuk membuat data bidang baru terlebih dahulu di Master Tanah.'
  },
  {
    pertanyaan: 'Kenapa saya tidak bisa menghapus riwayat tertentu?',
    jawaban:
      'Sistem akan menampilkan peringatan jika riwayat tersebut terkait dengan bidang tanah lain (misalnya asal-usul pemecahan lahan) atau memengaruhi data pemilik saat ini. Baca peringatan dengan saksama sebelum melanjutkan.'
  },
  {
    pertanyaan: 'Bagaimana cara export laporan ke Excel/PDF?',
    jawaban:
      'Buka menu Master Tanah, klik tombol Export Laporan, pilih rentang tanggal dan nomor sertifikat yang ingin diexport, lalu pilih format Excel atau PDF.'
  }
];
