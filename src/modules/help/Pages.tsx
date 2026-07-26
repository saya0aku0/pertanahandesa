import { Button } from '@/components/Button';
import { developerProfile, faqList } from './developerProfile';

/** Menu 4: Pusat Bantuan — FAQ + kontak developer (§10.5) */
export function BantuanPage() {
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
    </div>
  );
}
