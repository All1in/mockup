import type { ReactNode } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

type Props = {
  children: ReactNode;
};

export default function PrivateRoute({ children }: Props) {
  const { user, isLoading } = useAuth();
  const prevPath = useLocation();

  const urlTransfer = `/login?returnTo=${prevPath.pathname}`;
  return (
    <>
      {isLoading ? (
        <div>Loading...</div>
      ) : user ? (
        <>{children}</>
      ) : (
        <Navigate to={urlTransfer} replace />
      )}
    </>
  );
}
