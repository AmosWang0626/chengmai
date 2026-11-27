import type { User } from '../types';

export type UserRole = 'admin' | 'editor' | 'viewer';

export function useUserRole(user: User | null) {
  const role: UserRole = user?.role || 'viewer';
  const isAdmin = role === 'admin';
  const isEditor = role === 'editor';
  const isViewer = role === 'viewer';
  const canEditContent = isAdmin || isEditor;

  return { role, isAdmin, isEditor, isViewer, canEditContent, loading: false };
}
