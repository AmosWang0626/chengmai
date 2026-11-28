import { useCallback, useEffect, useMemo } from 'react';
import type { FamilyMember, TreeNode } from '../types';
import { useFamilyData } from './FamilyDataProvider';

export function useFamilyMembers(userId: number | undefined, rootMemberId?: number | null) {
  const { getSnapshot, refresh, createMember, createMembersBatch, updateMember, updateMembersBatch, reorderMembers, deleteMember } = useFamilyData();
  const snapshot = getSnapshot(userId);

  useEffect(() => {
    void refresh(userId, false);
  }, [refresh, userId]);

  const tree = useMemo(() => {
    const memberMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];
    const spouseByName = new Map(snapshot.members.map(member => [member.name, member]));

    snapshot.members.forEach(member => {
      memberMap.set(member.id, { ...member, children: [] });
    });

    snapshot.members.forEach(member => {
      const node = memberMap.get(member.id)!;
      if (member.parent_id && memberMap.has(member.parent_id)) {
        memberMap.get(member.parent_id)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    snapshot.members.forEach(member => {
      const node = memberMap.get(member.id)!;
      if (member.spouse_name) {
        const spouse = spouseByName.get(member.spouse_name);
        if (spouse && spouse.id !== member.id) node.spouse = memberMap.get(spouse.id);
      }
    });

    const byRank = (a: TreeNode, b: TreeNode) =>
      (a.generation || 0) - (b.generation || 0)
      || (a.family_rank || 0) - (b.family_rank || 0)
      || a.name.localeCompare(b.name, 'zh');
    memberMap.forEach(node => node.children.sort(byRank));
    rootNodes.sort(byRank);

    if (rootMemberId) {
      const selectedRoot = memberMap.get(rootMemberId);
      if (selectedRoot) return [selectedRoot];
    }
    return rootNodes;
  }, [snapshot.members, rootMemberId]);

  const getGenerationChar = useCallback((generation: number) =>
    snapshot.generationChars.find(char => char.generation === generation)?.char || '',
  [snapshot.generationChars]);

  return {
    members: snapshot.members,
    generationChars: snapshot.generationChars,
    loading: snapshot.loading,
    error: snapshot.error,
    tree,
    refresh: () => refresh(userId),
    addMember: (data: Partial<FamilyMember>) => createMember(userId, data),
    addMembersBatch: (data: Partial<FamilyMember>[]) => createMembersBatch(userId, data),
    updateMember: (id: number, data: Partial<FamilyMember>) => updateMember(userId, id, data),
    updateMembersBatch: (data: (Partial<FamilyMember> & { id: number })[]) => updateMembersBatch(userId, data),
    reorderMembers: (generation: number, memberIds: number[]) => reorderMembers(userId, generation, memberIds),
    deleteMember: (id: number) => deleteMember(userId, id),
    getGenerationChar,
  };
}
