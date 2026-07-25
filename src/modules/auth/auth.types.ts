export type UserRole = 'superadmin' | 'owner' | 'staff';

export interface AppUser {
  id: string;
  nama: string;
  email: string;
  noHp?: string;
  role: UserRole;
  createdAt?: unknown;
}
