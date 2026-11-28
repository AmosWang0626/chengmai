import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import type { FamilyMember } from '../types';

interface SiblingOrderControlProps {
  members: FamilyMember[];
  generation: number | null;
  onReorder: (generation: number, memberIds: number[]) => Promise<unknown>;
}

export default function SiblingOrderControl({ members, generation, onReorder }: SiblingOrderControlProps) {
  const peers = useMemo(() => members
    .filter(member => member.generation === generation)
    .sort((a, b) => (a.family_rank || 0) - (b.family_rank || 0) || a.id - b.id),
  [members, generation]);
  const [order, setOrder] = useState<FamilyMember[]>(peers);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const peerIds = peers.map(member => member.id).join(',');
  const knownPeerIds = useRef(peerIds);

  useEffect(() => {
    if (peerIds === knownPeerIds.current) return;
    knownPeerIds.current = peerIds;
    if (!saving && draggingId === null) setOrder(peers);
  }, [peerIds, peers, saving, draggingId]);

  const move = (id: number, offset: number) => {
    const from = order.findIndex(member => member.id === id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    const [member] = next.splice(from, 1);
    next.splice(to, 0, member);
    void save(next);
  };

  const save = async (next: FamilyMember[]) => {
    if (generation === null) return;
    const previous = order;
    setOrder(next);
    setSaving(true);
    setError('');
    try {
      await onReorder(generation, next.map(member => member.id));
    } catch (err) {
      setOrder(previous);
      setError(err instanceof Error ? err.message : '排序保存失败');
    } finally {
      setSaving(false);
    }
  };

  const drop = (targetId: number) => {
    setDraggingId(null);
    if (draggingId === null || draggingId === targetId) return;
    const next = [...order];
    const from = next.findIndex(member => member.id === draggingId);
    const to = next.findIndex(member => member.id === targetId);
    if (from < 0 || to < 0) return;
    const [member] = next.splice(from, 1);
    next.splice(to, 0, member);
    void save(next);
  };

  if (peers.length < 2) return null;
  return (
    <section className="mt-4 border-t border-slate-100 pt-3" aria-labelledby="sibling-order-title">
      <div className="flex items-center justify-between gap-2">
        <h4 id="sibling-order-title" className="text-sm font-semibold text-slate-700">同辈排序</h4>
        <span className="text-[11px] text-slate-400">{saving ? '保存中…' : '拖拽或使用箭头'}</span>
      </div>
      <ol className="mt-2 space-y-1">
        {order.map((member, index) => (
          <li
            key={member.id}
            draggable={!saving}
            onDragStart={() => setDraggingId(member.id)}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={event => event.preventDefault()}
            onDrop={() => drop(member.id)}
            className={`flex min-h-11 items-center gap-2 rounded-lg border px-2 ${draggingId === member.id ? 'border-cinnabar-300 bg-cinnabar-50' : 'border-slate-100 bg-white'}`}
          >
            <GripVertical className="h-4 w-4 flex-shrink-0 text-slate-300" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{index + 1}. {member.name}</span>
            <button
              type="button"
              className="ui-icon-btn h-11 w-11"
              disabled={saving || index === 0}
              onClick={() => move(member.id, -1)}
              aria-label={`上移 ${member.name}`}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="ui-icon-btn h-11 w-11"
              disabled={saving || index === order.length - 1}
              onClick={() => move(member.id, 1)}
              aria-label={`下移 ${member.name}`}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ol>
      {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
    </section>
  );
}
