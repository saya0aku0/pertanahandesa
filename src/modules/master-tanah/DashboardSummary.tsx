import { useEffect, useState } from 'react';
import { collection, getCountFromServer, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Summary {
  totalBidang: number;
  totalLuas: number;
  jumlahJualBeliBulanIni: number;
  jumlahWarisBulanIni: number;
  jumlahPecahLahanBulanIni: number;
}

/**
 * Ringkasan statistik dashboard, digabung di atas halaman Master Tanah (§3, §10.1).
 * Pakai getCountFromServer / aggregate query supaya HEMAT READ (§13) — tidak menarik semua dokumen.
 */
export function DashboardSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startTs = Timestamp.fromDate(startOfMonth).toDate().toISOString();

      const tanahCountSnap = await getCountFromServer(collection(db, 'tanah'));

      const jualBeliQ = query(
        collection(db, 'riwayat'),
        where('jenisPeristiwa', '==', 'jual-beli'),
        where('tanggalKejadian', '>=', startTs)
      );
      const warisQ = query(
        collection(db, 'riwayat'),
        where('jenisPeristiwa', '==', 'waris'),
        where('tanggalKejadian', '>=', startTs)
      );
      const pecahQ = query(
        collection(db, 'riwayat'),
        where('jenisPeristiwa', '==', 'pecah-lahan'),
        where('tanggalKejadian', '>=', startTs)
      );

      const [jualBeliCount, warisCount, pecahCount] = await Promise.all([
        getCountFromServer(jualBeliQ),
        getCountFromServer(warisQ),
        getCountFromServer(pecahQ)
      ]);

      // Catatan: total luas dihitung dari cache/agregat terpisah jika data besar (opsional
      // menyimpan di doc /stats/summary yang di-update client-side saat CRUD, agar tidak
      // perlu getDocs semua dokumen tanah — hemat read sesuai §13).
      setSummary({
        totalBidang: tanahCountSnap.data().count,
        totalLuas: 0, // TODO: isi dari /stats/summary jika ingin akurat tanpa full scan
        jumlahJualBeliBulanIni: jualBeliCount.data().count,
        jumlahWarisBulanIni: warisCount.data().count,
        jumlahPecahLahanBulanIni: pecahCount.data().count
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !summary) return <LoadingSpinner label="Memuat ringkasan..." />;

  const cards = [
    { label: 'Total Bidang Tanah', value: summary.totalBidang },
    { label: 'Jual-Beli Bulan Ini', value: summary.jumlahJualBeliBulanIni },
    { label: 'Waris Bulan Ini', value: summary.jumlahWarisBulanIni },
    { label: 'Pecah Lahan Bulan Ini', value: summary.jumlahPecahLahanBulanIni }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-primary-800">{c.value}</p>
          <p className="text-xs text-gray-500 mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  );
}
