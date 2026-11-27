import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, X } from 'lucide-react';
import type { FamilyMember } from '../types';
import SiblingOrderControl from './SiblingOrderControl';

interface SiblingOrderDialogProps {
  open: boolean;
  members: FamilyMember[];
  onClose: () => void;
  onReorder: (parentId: number | null, memberIds: number[]) => Promise<unknown>;
}

export default function SiblingOrderDialog({ open, members, onClose, onReorder }: SiblingOrderDialogProps) {
  const groups = useMemo(() => {
    const byParent = new Map<string, { parentId: number | null; members: FamilyMember[] }>();
    members.forEach(member => {
      const key = member.parent_id === null ? 'root' : String(member.parent_id);
      const group = byParent.get(key) || { parentId: member.parent_id, members: [] };
      group.members.push(member);
      byParent.set(key, group);
    });
    return [...byParent.values()]
      .filter(group => group.members.length > 1)
      .sort((a, b) => (a.members[0]?.generation || 0) - (b.members[0]?.generation || 0));
  }, [members]);
  const [parentId, setParentId] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    if (!open || !groups.length) return;
    const current = groups.find(group => String(group.parentId) === selectedKey);
    if (!current) {
      setParentId(groups[0].parentId);
      setSelectedKey(String(groups[0].parentId));
    }
  }, [open, groups, selectedKey]);

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
            <p className="mt-1 text-sm text-slate-500">仅调整同一父母下的兄弟姐妹，家庭排行与同性别排行会自动重算。</p>
          </div>
          <button type="button" className="ui-icon-btn h-11 w-11" onClick={onClose} aria-label="关闭同辈排序"><X className="h-5 w-5" /></button>
        </div>
        {groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">暂无需要排序的同辈分组。</p>
        ) : (
          <>
            <label className="mt-4 block">
              <span className="ui-label">选择同辈分组</span>
              <select
                className="ui-select w-full"
                value={selectedKey}
                onChange={event => {
                  setSelectedKey(event.target.value);
                  setParentId(event.target.value === 'null' ? null : Number(event.target.value));
                }}
              >
                {groups.map(group => {
                  const parent = group.parentId === null ? null : members.find(member => member.id === group.parentId);
                  const label = parent ? `${parent.name} 的子女` : '同祖根节点';
                  return <option key={String(group.parentId)} value={String(group.parentId)}>{label}（{group.members.length} 人）</option>;
                })}
              </select>
            </label>
            <div className="mt-4">
              <SiblingOrderControl members={members} parentId={parentId} onReorder={onReorder} />
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
