import React from 'react';
import { Navigate } from 'react-router-dom';
import { User } from '../types';
import { useUserRole } from '../hooks/useUserRole';

interface AdminRouteProps {
  user: User | null;
  children: React.ReactNode;
  allowEditor?: boolean;
}

export default function AdminRoute({ user, children, allowEditor = false }: AdminRouteProps) {
  const { isAdmin, canEditContent } = useUserRole(user);

  if (!isAdmin && !(allowEditor && canEditContent)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
