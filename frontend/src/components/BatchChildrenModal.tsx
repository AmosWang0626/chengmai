import React, { useEffect, useMemo } from 'react';
import { X, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import MemberBatchEditor from './MemberBatchEditor';

interface BatchChildrenModalProps {
  user: User | null;
  parentIds: number[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BatchChildrenModal({ user, parentIds, isOpen, onClose, onSuccess }: BatchChildrenModalProps) {
  const { members, getGenerationChar } = useFamilyMembers(user?.id);
  const parentKey = parentIds.join(',');
  const selectedParents = useMemo(() => {
    const ids = new Set(parentKey.split(',').filter(Boolean).map(Number));
    return members.filter(member => ids.has(member.id));
  }, [members, parentKey]);
  const childGeneration = (selectedParents[0]?.generation || 0) + 1;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="batch-children-title"
        className="bg-paper-card rounded-xl shadow-lift w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="batch-children-title" className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-cinnabar-50 rounded-xl flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-cinnabar-600" />
                </div>
                批量添加子女
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                为 {selectedParents.map(parent => parent.name).join('、')} 添加子女
                （第{childGeneration}世 · {getGenerationChar(childGeneration) || '无'}字辈）
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="关闭批量添加子女"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[65vh]">
          <MemberBatchEditor user={user} parentIds={parentIds} onCancel={onClose}
            onSaved={() => { onSuccess?.(); onClose(); }} />
        </div>
      </div>
    </div>
  );
}
