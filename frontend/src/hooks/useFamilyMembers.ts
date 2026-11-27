import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { FamilyMember, TreeNode, GenerationChar } from '../types';

export function useFamilyMembers(userId: number | undefined, rootMemberId?: number | null) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [generationChars, setGenerationChars] = useState<GenerationChar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const [membersData, charsData] = await Promise.all([
        api.getMembers(),
        api.getGenerationChars(),
      ]);
      setMembers(membersData || []);
      setGenerationChars((charsData || []).filter(c => !c.hidden));
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const buildTree = useCallback((): TreeNode[] => {
    const memberMap = new Map<number, TreeNode>();
    const rootNodes: TreeNode[] = [];

    members.forEach(member => {
      memberMap.set(member.id, { ...member, children: [] });
    });

    members.forEach(member => {
      const node = memberMap.get(member.id)!;
      if (member.parent_id && memberMap.has(member.parent_id)) {
        const parent = memberMap.get(member.parent_id)!;
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    members.forEach(member => {
      if (member.spouse_name) {
        const node = memberMap.get(member.id)!;
        const spouse = members.find(m => m.name === member.spouse_name);
        if (spouse) {
          node.spouse = memberMap.get(spouse.id);
        }
      }
    });

    members.forEach(member => {
      const node = memberMap.get(member.id)!;
      node.children.sort((a, b) => {
        const rankDiff = (a.family_rank || 0) - (b.family_rank || 0);
        if (rankDiff !== 0) return rankDiff;
        return a.name.localeCompare(b.name);
      });
    });

    rootNodes.sort((a, b) => {
      const rankDiff = (a.family_rank || 0) - (b.family_rank || 0);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name);
    });

    if (rootMemberId) {
      const selectedRoot = memberMap.get(rootMemberId);
      if (selectedRoot) {
        return [selectedRoot];
      }
    }

    return rootNodes;
  }, [members, rootMemberId]);

  const getGenerationChar = useCallback((generation: number): string => {
    const char = generationChars.find(gc => gc.generation === generation);
    return char?.char || '';
  }, [generationChars]);

  const addMember = useCallback(async (data: Partial<FamilyMember>) => {
    const generationChar = data.generation ? getGenerationChar(data.generation) : '';
    const newMember = await api.createMember({ ...data, generation_char: generationChar });
    setMembers(prev => [...prev, newMember]);
    return newMember;
  }, [getGenerationChar]);

  const addMembersBatch = useCallback(async (items: Partial<FamilyMember>[]) => {
    const payload = items.map(data => ({
      ...data,
      generation_char: data.generation ? getGenerationChar(data.generation) : '',
    }));
    const created = await api.createMembersBatch(payload);
    setMembers(prev => [...prev, ...created]);
    return created;
  }, [getGenerationChar]);

  const updateMember = useCallback(async (id: number, data: Partial<FamilyMember>) => {
    const generationChar = data.generation ? getGenerationChar(data.generation) : undefined;
    const updatedMember = await api.updateMember(id, { ...data, generation_char: generationChar });
    setMembers(prev => prev.map(m => m.id === id ? updatedMember : m));
    return updatedMember;
  }, [getGenerationChar]);

  const deleteMember = async (id: number) => {
    await api.deleteMember(id);
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  return {
    members,
    generationChars,
    loading,
    error,
    tree: buildTree(),
    refresh: fetchMembers,
    addMember,
    addMembersBatch,
    updateMember,
    deleteMember,
    getGenerationChar
  };
}