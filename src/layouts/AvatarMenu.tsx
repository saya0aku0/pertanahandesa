import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '@/firebase/auth';

interface AvatarMenuProps {
  displayName: string;
}

export function AvatarMenu({ displayName }: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initial = displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-primary-700 text-white flex items-center justify-center font-semibold"
        aria-label="Menu akun"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg py-1 z-50">
          <div className="px-4 py-2 text-sm text-gray-500 border-b truncate">{displayName}</div>
          <button
            onClick={() => {
              setOpen(false);
              navigate('/profil');
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 min-h-[44px]"
          >
            Setting Profil Akun
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 min-h-[44px]"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
