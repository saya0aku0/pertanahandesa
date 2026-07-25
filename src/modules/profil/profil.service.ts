import { getDocById, updateDocById } from '@/firebase/firestore';
import { AppUser } from '@/modules/auth/auth.types';

export async function getProfil(userId: string) {
  return getDocById<AppUser>('users', userId);
}

export async function updateProfil(
  userId: string,
  data: { nama?: string; noHp?: string; email?: string }
) {
  return updateDocById('users', userId, data);
}
