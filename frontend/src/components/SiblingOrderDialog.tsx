import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, X } from 'lucide-react';
import type { FamilyMember } from '../types';
import SiblingOrderControl from './SiblingOrderControl';

interface SiblingOrderDialogProps {
  open: boolean;
  members: FamilyMember[];
  onClose: () => void;
  onReorder: (generation: number, memberIds: number[]) => Promise<unknown>;
}

interface GenerationGroup {
  generation: number;
  generationChar: string;
  members: FamilyMember[];
}

export default function SiblingOrderDialog({ open, members, onClose, onReorder }: SiblingOrderDialogProps) {
  const groups = useMemo(() => {
    const byGeneration = new Map<number, GenerationGroup>();
    members.forEach(member => {
      if (member.generation === null) return;
      const group = byGeneration.get(member.generation) || {
        generation: member.generation,
        generationChar: member.generation_char || '',
        members: [],
      };
      group.members.push(member);
      byGeneration.set(member.generation, group);
    });
    return [...byGeneration.values()]
      .filter(group => group.members.length > 1)
      .sort((a, b) => a.generation - b.generation);
  }, [members]);
  const [generation, setGeneration] = useState<number | null>(null);

  useEffect(() => {
    if (!open || groups.length === 0) return;
    if (!groups.some(group => group.generation === generation)) {
      setGeneration(groups[0].generation);
    }
  }, [open, groups, generation]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-paper-card p-5 shadow-lift" role="dialog" aria-modal="true" aria-labelledby="sibling-order-dialog-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="sibling-order-dialog-title" className="font-display text-xl font-bold text-slate-900">同辈拖拽排序</h2>
            <p className="mt-1 text-sm text-slate-500">按世代统一调整同辈成员，不区分父母；同辈顺序与同性别排行会自动重算。</p>
          </div>
          <button type="button" className="ui-icon-btn h-11 w-11" onClick={onClose} aria-label="关闭同辈排序"><X className="h-5 w-5" /></button>
        </div>
        {groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">暂无需要排序的同辈世代。</p>
        ) : (
          <>
            <label className="mt-4 block">
              <span className="ui-label">选择同辈世代</span>
              <select
                className="ui-select w-full"
                value={generation ?? ''}
                onChange={event => setGeneration(Number(event.target.value))}
              >
                {groups.map(group => (
                  <option key={group.generation} value={group.generation}>
                    第{group.generation}世{group.generationChar ? ` · ${group.generationChar}字辈` : ''}（{group.members.length} 人）
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4">
              {generation !== null && <SiblingOrderControl members={members} generation={generation} onReorder={onReorder} />}
            </div>
          </>
        )}
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <ArrowUpDown className="mr-auto h-4 w-4 text-slate-400" />
          <button type="button" className="ui-btn-outline" onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  );
}
