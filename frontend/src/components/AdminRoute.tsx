import React from 'react';
import { Navigate } from 'react-router-dom';
import { User } from '../types';
import { useUserRole } from '../hooks/useUserRole';

interface AdminRouteProps {
  user: User | null;
  children: React.ReactNode;
}

export default function AdminRoute({ user, children }: AdminRouteProps) {
  const { isAdmin, loading } = useUserRole(user?.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinnabar-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
