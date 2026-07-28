import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPaginated, where } from '@/firebase/firestore';
import { Tanah } from '@/modules/master-tanah/tanah.types';
import { Riwayat } from '@/modules/transaksi/riwayat.types';

const HARI_DIANGGAP_MENGGANTUNG = 7;
const DISMISS_KEY = 'draftReminderDismissedAt';

interface DraftItem {
  id: string;
  label: string;
  href: string;
  hariBerjalan: number;
}

function timestampToDate(value: unknown): Date | null {
  if (!value) return null;
  const v = value as { toDate?: () => Date };
  if (typeof v.toDate === 'function') return v.toDate();
  return null;
}

/**
 * Banner pengingat draft yang menggantung — Master Tanah & Transaksi yang disimpan
 * sebagai "Pending (Draft)" tapi sudah lebih dari seminggu tidak dilanjutkan.
 * Cocok untuk pemakaian 1 petugas: gampang lupa ada input yang belum diselesaikan
 * kalau tidak diingatkan. 100% query Firestore biasa, gratis di Spark Plan.
 */
export function DraftReminder() {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < 24 * 60 * 60 * 1000) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    let aktif = true;
    async function muat() {
      try {
        const batasWaktu = Date.now() - HARI_DIANGGAP_MENGGANTUNG * 24 * 60 * 60 * 1000;

        const [tanahDraft, riwayatDraft] = await Promise.all([
          getPaginated<Tanah>('tanah', [where('status', '==', 'draft')], 50),
          getPaginated<Riwayat>('riwayat', [where('status', '==', 'draft')], 50)
        ]);

        const hasil: DraftItem[] = [];

        for (const t of tanahDraft.docs) {
          const dibuat = timestampToDate(t.createdAt);
          if (dibuat && dibuat.getTime() < batasWaktu) {
            hasil.push({
              id: t.id,
              label: `Master Tanah — ${t.nomorSertifikat || '(belum ada No. Sertifikat)'}`,
              href: `/master-tanah/${t.id}`,
              hariBerjalan: Math.floor((Date.now() - dibuat.getTime()) / (24 * 60 * 60 * 1000))
            });
          }
        }

        for (const r of riwayatDraft.docs) {
          const dibuat = timestampToDate(r.createdAt);
          if (dibuat && dibuat.getTime() < batasWaktu) {
            hasil.push({
              id: r.id,
              label: `Transaksi — ${r.pemilikBaru?.nama ?? r.keterangan ?? 'Draft transaksi'}`,
              href: `/transaksi`,
              hariBerjalan: Math.floor((Date.now() - dibuat.getTime()) / (24 * 60 * 60 * 1000))
            });
          }
        }

        if (aktif) setItems(hasil);
      } finally {
        if (aktif) setLoading(false);
      }
    }
    muat();
    return () => {
      aktif = false;
    };
  }, []);

  function handleTutup() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  if (loading || dismissed || items.length === 0) return null;

  return (
    <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-sky-900">
          📝 Ada {items.length} draft yang belum dilanjutkan lebih dari {HARI_DIANGGAP_MENGGANTUNG}{' '}
          hari
        </p>
        <button
          type="button"
          onClick={handleTutup}
          className="text-xs text-sky-700 hover:underline shrink-0 min-h-[44px] px-1"
        >
          Tutup
        </button>
      </div>
      <ul className="space-y-1">
        {items.slice(0, 5).map((item) => (
          <li key={item.id} className="text-xs">
            <Link to={item.href} className="text-primary-700 hover:underline">
              {item.label}
            </Link>
            <span className="text-gray-400"> — {item.hariBerjalan} hari lalu</span>
          </li>
        ))}
        {items.length > 5 && (
          <li className="text-xs text-gray-400">dan {items.length - 5} draft lainnya...</li>
        )}
      </ul>
    </div>
  );
}
