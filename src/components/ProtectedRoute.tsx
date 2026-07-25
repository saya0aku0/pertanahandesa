import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthUser } from '@/modules/auth/useAuthUser';
import { LoadingSpinner } from './LoadingSpinner';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthUser();

  if (loading) return <LoadingSpinner label="Memeriksa sesi login..." />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
