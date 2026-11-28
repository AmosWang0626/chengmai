import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import type { FamilyMember, GenerationChar } from '../types';

interface FamilySnapshot {
  members: FamilyMember[];
  generationChars: GenerationChar[];
  loading: boolean;
  error: string | null;
  loadedAt: number;
}

interface FamilyDataContextValue {
  getSnapshot: (userId?: number) => FamilySnapshot;
  refresh: (userId?: number, force?: boolean) => Promise<void>;
  createMember: (userId: number | undefined, data: Partial<FamilyMember>) => Promise<FamilyMember>;
  createMembersBatch: (userId: number | undefined, data: Partial<FamilyMember>[]) => Promise<FamilyMember[]>;
  updateMember: (userId: number | undefined, id: number, data: Partial<FamilyMember>) => Promise<FamilyMember>;
  updateMembersBatch: (userId: number | undefined, data: (Partial<FamilyMember> & { id: number })[]) => Promise<FamilyMember[]>;
  reorderMembers: (userId: number | undefined, generation: number, memberIds: number[]) => Promise<FamilyMember[]>;
  deleteMember: (userId: number | undefined, id: number) => Promise<void>;
}

const emptySnapshot: FamilySnapshot = {
  members: [],
  generationChars: [],
  loading: false,
  error: null,
  loadedAt: 0,
};

const FamilyDataContext = createContext<FamilyDataContextValue | null>(null);
const CACHE_TTL = 30_000;

export function FamilyDataProvider({ children }: { children: React.ReactNode }) {
  const [snapshots, setSnapshots] = useState<Record<number, FamilySnapshot>>({});
  const snapshotsRef = useRef(snapshots);
  const mutationVersions = useRef(new Map<number, number>());
  const inflight = useRef(new Map<number, Promise<void>>());

  const commit = useCallback((userId: number, update: (snapshot: FamilySnapshot) => FamilySnapshot) => {
    setSnapshots(previous => {
      const next = { ...previous, [userId]: update(previous[userId] || emptySnapshot) };
      snapshotsRef.current = next;
      return next;
    });
  }, []);

  const beginMutation = useCallback((userId: number | undefined) => {
    if (!userId) return;
    mutationVersions.current.set(userId, (mutationVersions.current.get(userId) || 0) + 1);
  }, []);

  const finishMutation = useCallback((userId: number | undefined) => {
    if (!userId) return;
    mutationVersions.current.set(userId, (mutationVersions.current.get(userId) || 0) + 1);
  }, []);

  const refresh = useCallback(async (userId?: number, force = true) => {
    if (!userId) return;
    const cached = snapshotsRef.current[userId];
    if (!force && cached?.loadedAt && Date.now() - cached.loadedAt < CACHE_TTL) return;
    const pending = inflight.current.get(userId);
    if (pending) return pending;

    const mutationVersion = mutationVersions.current.get(userId) || 0;
    commit(userId, snapshot => ({ ...snapshot, loading: true, error: null }));
    const request = Promise.all([api.getMembers(), api.getGenerationChars()])
      .then(([members, generationChars]) => {
        if ((mutationVersions.current.get(userId) || 0) !== mutationVersion) {
          commit(userId, snapshot => ({ ...snapshot, loading: false }));
          return;
        }
        commit(userId, snapshot => ({
          ...snapshot,
          members: members || [],
          generationChars: (generationChars || []).filter(char => !char.hidden),
          loading: false,
          error: null,
          loadedAt: Date.now(),
        }));
      })
      .catch(error => {
        commit(userId, snapshot => ({
          ...snapshot,
          loading: false,
          error: (mutationVersions.current.get(userId) || 0) === mutationVersion
            ? (error instanceof Error ? error.message : '获取家谱数据失败')
            : snapshot.error,
        }));
      })
      .finally(() => {
        if (inflight.current.get(userId) === request) inflight.current.delete(userId);
      });
    inflight.current.set(userId, request);
    return request;
  }, [commit]);

  const getSnapshot = useCallback((userId?: number) => userId ? snapshots[userId] || emptySnapshot : emptySnapshot, [snapshots]);

  const replaceMembers = useCallback((userId: number | undefined, update: (members: FamilyMember[]) => FamilyMember[]) => {
    if (!userId) return;
    commit(userId, snapshot => ({ ...snapshot, members: update(snapshot.members), loadedAt: Date.now() }));
  }, [commit]);

  const generationCharFor = useCallback((userId: number | undefined, generation?: number | null) => {
    if (!userId || !generation) return '';
    return snapshotsRef.current[userId]?.generationChars.find(char => char.generation === generation)?.char || '';
  }, []);

  const value = useMemo<FamilyDataContextValue>(() => ({
    getSnapshot,
    refresh,
    async createMember(userId, data) {
      beginMutation(userId);
      const payload = { ...data, generation_char: data.generation ? generationCharFor(userId, data.generation) : data.generation_char };
      const created = await api.createMember(payload);
      finishMutation(userId);
      replaceMembers(userId, members => [...members, created]);
      return created;
    },
    async createMembersBatch(userId, data) {
      beginMutation(userId);
      const payload = data.map(item => ({
        ...item,
        generation_char: item.generation ? generationCharFor(userId, item.generation) : item.generation_char,
      }));
      const created = await api.createMembersBatch(payload);
      finishMutation(userId);
      replaceMembers(userId, members => [...members, ...created]);
      return created;
    },
    async updateMember(userId, id, data) {
      beginMutation(userId);
      const generationChar = data.generation ? generationCharFor(userId, data.generation) : undefined;
      const updated = await api.updateMember(id, { ...data, generation_char: generationChar });
      finishMutation(userId);
      replaceMembers(userId, members => members.map(member => member.id === id ? updated : member));
      return updated;
    },
    async updateMembersBatch(userId, data) {
      beginMutation(userId);
      const payload = data.map(item => ({
        ...item,
        generation_char: item.generation ? generationCharFor(userId, item.generation) : item.generation_char,
      }));
      const updated = await api.updateMembersBatch(payload);
      finishMutation(userId);
      const byId = new Map(updated.map(member => [member.id, member]));
      replaceMembers(userId, members => members.map(member => byId.get(member.id) || member));
      return updated;
    },
    async reorderMembers(userId, generation, memberIds) {
      beginMutation(userId);
      try {
        const ordered = await api.reorderMembers(generation, memberIds);
        const byId = new Map(ordered.map(member => [member.id, member]));
        replaceMembers(userId, members => members.map(member => byId.get(member.id) || member));
        return ordered;
      } finally {
        finishMutation(userId);
      }
    },
    async deleteMember(userId, id) {
      beginMutation(userId);
      await api.deleteMember(id);
      finishMutation(userId);
      replaceMembers(userId, members => members
        .filter(member => member.id !== id)
        .map(member => member.parent_id === id ? { ...member, parent_id: null } : member));
    },
  }), [beginMutation, finishMutation, generationCharFor, getSnapshot, refresh, replaceMembers]);

  return <FamilyDataContext.Provider value={value}>{children}</FamilyDataContext.Provider>;
}

export function useFamilyData() {
  const context = useContext(FamilyDataContext);
  if (!context) throw new Error('FamilyDataProvider 未挂载');
  return context;
}
