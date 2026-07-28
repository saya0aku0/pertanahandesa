/**
 * CATATAN: helper parsing koordinat ini SUDAH TIDAK dipakai oleh TanahForm lagi
 * (atas permintaan, Master Tanah sekarang cukup menyimpan link Google Maks apa
 * adanya, tanpa fitur ambil-koordinat-otomatis). File ini dibiarkan ada (tidak
 * dihapus, sesuai instruksi menjaga struktur file) kalau suatu saat fitur
 * koordinat lat/long mau diaktifkan lagi.
 */

/**
 * Ekstrak koordinat (lat, long) dari link Google Maps.
 * Mendukung: URL lengkap yang mengandung "@lat,long", parameter q=/ll=/query=,
 * atau teks koordinat polos "lat, long" hasil copy-paste langsung dari Google Maps
 * (klik-kanan lokasi → klik koordinat yang muncul → otomatis ter-copy).
 *
 * CATATAN PENTING: Short link (maps.app.goo.gl / goo.gl/maps) TIDAK BISA
 * di-resolve otomatis dari browser karena dibatasi kebijakan CORS milik Google —
 * app ini murni frontend tanpa server (sengaja dipertahankan di Spark plan gratis).
 * Untuk short link, user perlu buka link itu sekali (tombol "Buka Link"), tunggu
 * redirect selesai, lalu salin URL LENGKAP dari address bar dan tempel di sini.
 */

export function isShortGoogleMapsLink(url: string): boolean {
  return /goo\.gl\/maps|maps\.app\.goo\.gl/i.test(url.trim());
}

export function parseGoogleMapsLink(url: string): { lat: number; long: number } | null {
  const input = url.trim();
  if (!input) return null;

  // Pola 1: koordinat polos "lat, long"
  const plain = input.match(/^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (plain) return { lat: parseFloat(plain[1]), long: parseFloat(plain[2]) };

  // Pola 2: URL lengkap dengan "@lat,long,zoom" (format paling umum di address bar)
  const atPattern = input.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atPattern) return { lat: parseFloat(atPattern[1]), long: parseFloat(atPattern[2]) };

  // Pola 3: parameter query string q=, ll=, atau query=
  const paramPattern = input.match(/[?&](?:q|ll|query)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (paramPattern) return { lat: parseFloat(paramPattern[1]), long: parseFloat(paramPattern[2]) };

  return null;
}
