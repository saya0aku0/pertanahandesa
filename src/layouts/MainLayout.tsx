import { NavLink, Outlet } from 'react-router-dom';
import { AvatarMenu } from './AvatarMenu';
import { useAuthUser } from '@/modules/auth/useAuthUser';
import { EmailVerificationBanner } from '@/modules/auth/EmailVerificationBanner';

// 4 menu sidebar sesuai §3 PRD — sengaja ringkas supaya gampang dirawat solo dev
const MENU_ITEMS = [
  { to: '/master-tanah', label: 'Master Tanah', icon: '🏞️' },
  { to: '/transaksi', label: 'Transaksi', icon: '📋' },
  { to: '/kelola-user', label: 'Kelola User', icon: '👥' },
  { to: '/bantuan', label: 'Pusat Bantuan', icon: '❓' }
];

export function MainLayout() {
  const { user } = useAuthUser();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar — tablet & desktop (>=768px), sesuai §13 Mobile UX */}
      <aside
        className="hidden md:flex md:flex-col w-56 lg:w-64 bg-white border-r shrink-0"
        style={{ paddingLeft: 'env(safe-area-inset-left)' }}
      >
        <div className="p-4 font-bold text-primary-800 text-lg border-b break-words">
          Riwayat Tanah Desa
        </div>
        <nav aria-label="Menu utama" className="flex-1 p-2 space-y-1">
          {MENU_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] ${
                  isActive ? 'bg-primary-100 text-primary-800' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center justify-between bg-white border-b p-4 sticky top-0 z-30"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
        >
          <span className="font-bold text-primary-800 md:hidden break-words">Riwayat Tanah Desa</span>
          <div className="ml-auto">
            <AvatarMenu displayName={user?.email ?? 'Pengguna'} />
          </div>
        </header>

        {user && <EmailVerificationBanner user={user} />}

        {/* Konten halaman — dibatasi lebar maksimal di layar sangat besar supaya tidak
            kosong berlebihan, tapi tetap penuh & nyaman di HP/tablet */}
        <main className="flex-1 p-4 pb-24 md:pb-4 w-full max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation — mobile only (<768px), sesuai §13 Mobile UX */}
      <nav
        aria-label="Menu utama (mobile)"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 flex-1 min-h-[56px] text-xs ${
                isActive ? 'text-primary-700 font-semibold' : 'text-gray-500'
              }`
            }
          >
            <span aria-hidden="true" className="text-lg">{item.icon}</span>
            <span className="break-words text-center leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
