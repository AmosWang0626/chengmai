import { useState, useEffect } from 'react';
import { api } from '../api/client';

export type UserRole = 'admin' | 'editor' | 'viewer';

export function useUserRole(userId: number | undefined) {
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const user = await api.restoreSession();
        setRole(user?.role === 'admin' || user?.role === 'editor' ? user.role : 'viewer');
      } catch (err) {
        console.error('获取角色失败:', err);
        setRole('viewer');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [userId]);

  const isAdmin = role === 'admin';
  const isEditor = role === 'editor';
  const isViewer = role === 'viewer';
  const canEditContent = isAdmin || isEditor;

  return { role, isAdmin, isEditor, isViewer, canEditContent, loading };
}