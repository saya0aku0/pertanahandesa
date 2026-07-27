import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { watchAuthState } from '@/firebase/auth';
import { syncEmailVerifiedStatus } from '@/modules/kelola-user/user.service';

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = watchAuthState((u) => {
      setUser(u);
      setLoading(false);

      // Best-effort, tidak memblokir UI kalau gagal (mis. profil Firestore
      // belum ada — kasus akun yang dibuat manual di Firebase Console).
      if (u) {
        syncEmailVerifiedStatus(u.uid, u.emailVerified).catch(() => {});
      }
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}
