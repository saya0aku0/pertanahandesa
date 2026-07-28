import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';
import { developerProfile, faqList } from './developerProfile';
import { getLoginLogTerbaru, LoginLogEntry } from '@/modules/auth/loginLog.service';

const METODE_LABEL: Record<string, string> = {
  email: 'Email',
  username: 'Username',
  google: 'Google'
};

function formatWaktuLogin(value: unknown): string {
  const v = value as { toDate?: () => Date };
  if (typeof v?.toDate === 'function') {
    return v.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }
  return '-';
}

/** Menu 4: Pusat Bantuan — FAQ + kontak developer (§10.5) */
export function BantuanPage() {
  const [riwayatLogin, setRiwayatLogin] = useState<(LoginLogEntry & { id: string })[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);

  useEffect(() => {
    getLoginLogTerbaru(10)
      .then(setRiwayatLogin)
      .finally(() => setLoadingLog(false));
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-bold">Pusat Bantuan</h1>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm text-gray-700">Pertanyaan Umum (FAQ)</h2>
        {faqList.map((faq, idx) => (
          <details key={idx} className="bg-white border rounded-xl p-4">
            <summary className="cursor-pointer font-medium text-sm">{faq.pertanyaan}</summary>
            <p className="text-sm text-gray-600 mt-2">{faq.jawaban}</p>
          </details>
        ))}
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-700">Kontak Developer</h2>
        <p className="text-sm">
          <span className="text-gray-500">Nama: </span>
          {developerProfile.nama}
        </p>
        <p className="text-sm">
          <span className="text-gray-500">Email: </span>
          <a
            href={`mailto:${developerProfile.email}`}
            className="text-primary-700 hover:underline"
          >
            {developerProfile.email}
          </a>
        </p>
        <div className="pt-1">
          <a
            href={developerProfile.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button type="button">💬 Hubungi via WhatsApp</Button>
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-2">{developerProfile.catatan}</p>
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-sm text-gray-700">Serah Terima Jabatan</h2>
        <p className="text-xs text-gray-500">
          Kalau suatu saat harus menyerahkan tugas ke petugas baru, ada checklist dan panduan
          yang bisa diunduh supaya prosesnya lebih rapi.
        </p>
        <Link to="/bantuan/serah-terima">
          <Button type="button" variant="secondary">
            📋 Buka Mode Serah Terima Jabatan
          </Button>
        </Link>
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-700">Riwayat Login Terakhir</h2>
        <p className="text-xs text-gray-500">
          Catatan 10 login terakhir — jaga-jaga kalau suatu hari ada login yang tidak Anda
          kenali dari perangkat lain.
        </p>
        {loadingLog && <p className="text-xs text-gray-400">Memuat...</p>}
        {!loadingLog && riwayatLogin.length === 0 && (
          <p className="text-xs text-gray-400">Belum ada catatan login.</p>
        )}
        {riwayatLogin.length > 0 && (
          <ul className="divide-y">
            {riwayatLogin.map((entry) => (
              <li key={entry.id} className="py-2 text-xs flex justify-between gap-2 flex-wrap">
                <span>
                  {entry.email} <span className="text-gray-400">({METODE_LABEL[entry.metode] ?? entry.metode})</span>
                </span>
                <span className="text-gray-400">{formatWaktuLogin(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
