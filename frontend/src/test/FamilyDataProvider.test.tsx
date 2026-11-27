import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { FamilyDataProvider, useFamilyData } from '../hooks/FamilyDataProvider';
import type { FamilyMember } from '../types';

vi.mock('../api/client', () => ({
  api: {
    getMembers: vi.fn(),
    getGenerationChars: vi.fn(),
    createMember: vi.fn(),
    deleteMember: vi.fn(),
  },
}));

const member = (id: number, name: string, parentId: number | null): FamilyMember => ({
  id,
  name,
  parent_id: parentId,
} as FamilyMember);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FamilyDataProvider>{children}</FamilyDataProvider>
);

describe('FamilyDataProvider', () => {
  beforeEach(() => {
    vi.mocked(api.getMembers).mockReset().mockResolvedValue([]);
    vi.mocked(api.getGenerationChars).mockReset().mockResolvedValue([]);
    vi.mocked(api.createMember).mockReset();
    vi.mocked(api.deleteMember).mockReset();
  });

  it('does not let an older in-flight refresh overwrite a created member', async () => {
    const oldMember = member(1, '旧成员', null);
    vi.mocked(api.getMembers).mockResolvedValueOnce([oldMember]);
    const { result } = renderHook(() => useFamilyData(), { wrapper });
    await act(async () => { await result.current.refresh(1); });

    const refresh = deferred<FamilyMember[]>();
    vi.mocked(api.getMembers).mockReturnValueOnce(refresh.promise);
    const created = member(2, '新成员', null);
    vi.mocked(api.createMember).mockResolvedValue(created);
    let refreshing!: Promise<void>;
    act(() => { refreshing = result.current.refresh(1); });
    await act(async () => { await result.current.createMember(1, { name: created.name }); });
    await act(async () => {
      refresh.resolve([oldMember]);
      await refreshing;
    });

    expect(result.current.getSnapshot(1).members.map(item => item.name)).toEqual(['旧成员', '新成员']);
  });

  it('clears local child parent references after deleting a member', async () => {
    vi.mocked(api.getMembers).mockResolvedValue([member(1, '父', null), member(2, '子', 1)]);
    vi.mocked(api.deleteMember).mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useFamilyData(), { wrapper });
    await act(async () => { await result.current.refresh(1); });

    await act(async () => { await result.current.deleteMember(1, 1); });

    await waitFor(() => expect(result.current.getSnapshot(1).members).toHaveLength(1));
    expect(result.current.getSnapshot(1).members[0]).toMatchObject({ id: 2, parent_id: null });
  });
});
