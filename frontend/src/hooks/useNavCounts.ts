import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useFamilyMembers } from './useFamilyMembers';

export interface NavCounts {
  members: number;
  photos: number;
  pending: number;
  chars: number;
  users: number;
}

interface RemoteCounts {
  photos: number;
  pending: number;
  users: number;
}

let cache: { key: string; ts: number; data: RemoteCounts } | null = null;
const inflight = new Map<string, Promise<RemoteCounts>>();

async function load(key: string, isAdmin: boolean): Promise<RemoteCounts> {
  const [gallery, users] = await Promise.all([
    api.getGallery(),
    isAdmin ? api.getUsers() : Promise.resolve([]),
  ]);
  const data = {
    photos: gallery.filter(image => image.status === 'approved').length,
    pending: gallery.filter(image => image.status === 'pending').length,
    users: users.length,
  };
  cache = { key, ts: Date.now(), data };
  return data;
}

export function useNavCounts(userId: number | undefined, isAdmin: boolean): NavCounts | null {
  const family = useFamilyMembers(userId);
  const [remote, setRemote] = useState<{ key: string; data: RemoteCounts } | null>(null);
  const key = `${userId}:${isAdmin ? 'a' : 'v'}`;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    if (cache && cache.key === key && Date.now() - cache.ts < 20_000) {
      setRemote({ key, data: cache.data });
      return;
    }
    let request = inflight.get(key);
    if (!request) {
      request = load(key, isAdmin).finally(() => inflight.delete(key));
      inflight.set(key, request);
    }
    request.then(data => { if (alive) setRemote({ key, data }); }).catch(() => {});
    return () => { alive = false; };
  }, [userId, isAdmin, key]);

  const data = remote?.key === key ? remote.data : null;
  if (!data) return null;
  return {
    members: family.members.length,
    photos: data.photos,
    pending: data.pending,
    chars: family.generationChars.length,
    users: data.users,
  };
}
