import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { useDebounce } from '@/hooks/useDebounce';
import { searchTanah } from '@/modules/master-tanah/tanah.service';
import { Tanah } from '@/modules/master-tanah/tanah.types';

/**
 * Titik masuk "+ Pemecahan Lahan" dari halaman Transaksi — beda dengan Master Tanah
 * (yang tombolnya sudah tahu bidang mana yang mau diproses), di sini user harus
 * cari & pilih dulu SATU bidang sumber, baru diarahkan ke alur Perubahan Data
 * (alasan -> Apakah Luas Tetap? -> pilih "Tidak (Dipecah)" -> Form Pecah Lahan).
 */
export function PilihBidangPecahLahan() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 400);
  const [hasilCari, setHasilCari] = useState<Tanah[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!debouncedKeyword) {
      setHasilCari([]);
      return;
    }
    setSearching(true);
    searchTanah(debouncedKeyword)
      .then((results) => {
        // Bidang yang sudah diarsipkan (sudah-digabung) tidak bisa dipecah lagi
        setHasilCari(results.filter((t) => t.statusGabung !== 'sudah-digabung'));
      })
      .finally(() => setSearching(false));
  }, [debouncedKeyword]);

  function pilihBidang(t: Tanah) {
    navigate(`/transaksi/perubahan-data?tanahId=${t.id}`);
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-gray-500">
        Cari bidang tanah yang akan dipecah, lalu pilih alasan perubahan datanya.
      </p>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="Cari No. Sertifikat / Lokasi / Pemilik..."
        className="w-full border rounded-lg p-3 min-h-[44px] text-sm"
        autoFocus
      />
      {searching && <p className="text-xs text-gray-400">Mencari...</p>}
      {!searching && debouncedKeyword && hasilCari.length === 0 && (
        <p className="text-sm text-gray-500">Tidak ada bidang tanah yang cocok.</p>
      )}
      <div className="space-y-2">
        {hasilCari.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => pilihBidang(t)}
            className="w-full text-left border rounded-lg p-3 hover:bg-primary-50 hover:border-primary-500"
          >
            <p className="font-medium text-sm">{t.nomorSertifikat}</p>
            <p className="text-xs text-gray-500">
              {t.lokasi} — {t.luas} m² — {t.pemilikSaatIni?.nama}
            </p>
          </button>
        ))}
      </div>
      <Button variant="secondary" onClick={() => navigate('/transaksi')}>
        Batal
      </Button>
    </div>
  );
}
