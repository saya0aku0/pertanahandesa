export type UserRole = 'superadmin' | 'owner' | 'staff';

export interface AppUser {
  id: string;
  nama: string;
  email: string;
  username: string; // dipakai untuk mode login "Username" (dipetakan ke email saat login)
  noHp?: string;
  role: UserRole;
  createdAt?: unknown;
}
