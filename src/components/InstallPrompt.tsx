import { useEffect, useState } from 'react';

const DISMISS_KEY = 'installPromptDismissedAt';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Banner "Install Aplikasi" — dipakai supaya aplikasi bisa dibuka seperti aplikasi
 * biasa (ikon di layar utama/desktop), bukan cuma tab browser. Gratis (fitur PWA
 * bawaan browser, sudah didukung manifest+service worker yang ada), sangat cocok
 * untuk pemakaian jangka panjang di 1 perangkat kantor desa.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      // Jangan tampilkan lagi kalau baru saja ditutup manual (tunda 14 hari)
      if (dismissedAt && Date.now() - Number(dismissedAt) < 14 * 24 * 60 * 60 * 1000) {
        return;
      }
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => setVisible(false));
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
  }

  function handleTutup() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
      <div>
        <p className="text-sm font-semibold text-primary-900">📲 Pasang aplikasi ini di perangkat?</p>
        <p className="text-xs text-primary-700 mt-0.5">
          Biar bisa dibuka langsung dari ikon di layar utama/desktop, lebih cepat, dan tetap
          bisa dibuka walau koneksi internet lagi lemah.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={handleTutup}
          className="text-sm text-primary-700 hover:underline px-2 min-h-[44px]"
        >
          Nanti saja
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="bg-primary-600 text-white text-sm font-medium rounded-lg px-4 min-h-[44px] hover:bg-primary-700"
        >
          Pasang Sekarang
        </button>
      </div>
    </div>
  );
}
