import { useState, useEffect } from 'react';
import { api } from '../api/client';

export type UserRole = 'admin' | 'viewer';

export function useUserRole(userId: string | undefined) {
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
        setRole(user?.role === 'admin' ? 'admin' : 'viewer');
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
  const isViewer = role === 'viewer';

  return { role, isAdmin, isViewer, loading };
}