import { useEffect, useState } from 'react';
import { api } from '../api/client';

export interface NavCounts {
  members: number;
  photos: number;
  pending: number;
  chars: number;
  users: number;
}

/* 导航计数：模块级缓存 20s，避免每个页面重复拉取；按登录账号隔离 */
let cache: { key: string; ts: number; data: NavCounts } | null = null;
let inflight: Promise<NavCounts> | null = null;

async function load(key: string, isAdmin: boolean): Promise<NavCounts> {
  const [members, gallery, chars, users] = await Promise.all([
    api.getMembers(),
    api.getGallery(),
    api.getGenerationChars(),
    isAdmin ? api.getUsers() : Promise.resolve([])
  ]);
  const data: NavCounts = {
    members: members.length,
    photos: gallery.filter(g => g.status === 'approved').length,
    pending: gallery.filter(g => g.status === 'pending').length,
    chars: chars.length,
    users: users.length
  };
  cache = { key, ts: Date.now(), data };
  return data;
}

export function useNavCounts(userId: string | undefined, isAdmin: boolean, roleLoading = false): NavCounts | null {
  const [counts, setCounts] = useState<NavCounts | null>(cache?.data ?? null);

  useEffect(() => {
    if (!userId || roleLoading) return;
    let alive = true;
    const key = `${userId}:${isAdmin ? 'a' : 'v'}`;
    if (cache && cache.key === key && Date.now() - cache.ts < 20000) {
      setCounts(cache.data);
      return;
    }
    if (!inflight) inflight = load(key, isAdmin).finally(() => { inflight = null; });
    inflight.then(d => { if (alive) setCounts(d); }).catch(() => {});
    return () => { alive = false; };
  }, [userId, isAdmin, roleLoading]);

  return counts;
}