import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { FamilyMember, User } from '../types';
import { useFamilyMembers } from '../hooks/useFamilyMembers';

export interface MemberBatchRow {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other' | '';
  generation: number;
  parent_id: string;
  spouse_name: string;
  sibling_rank: number;
}

interface MemberBatchEditorProps {
  user: User | null;
  parentIds?: number[];
  submitLabel?: string;
  onCancel?: () => void;
  onSaved?: (members: FamilyMember[]) => void;
}

const rowId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const blankRow = (generation: number, parentId = ''): MemberBatchRow => ({
  id: rowId(),
  name: '',
  gender: 'male',
  generation,
  parent_id: parentId,
  spouse_name: '',
  sibling_rank: 1,
});

export default function MemberBatchEditor({ user, parentIds = [], submitLabel = '批量保存', onCancel, onSaved }: MemberBatchEditorProps) {
  const { members, generationChars, addMembersBatch } = useFamilyMembers(user?.id);
  const parentKey = parentIds.join(',');
  const parentIdSet = useMemo(() => new Set(parentKey.split(',').filter(Boolean).map(Number)), [parentKey]);
  const selectedParents = useMemo(() => members.filter(member => parentIdSet.has(member.id)), [members, parentIdSet]);
  const maxGeneration = Math.max(1, ...generationChars.map(char => char.generation), ...members.map(member => member.generation || 0));
  const defaultGeneration = selectedParents[0]?.generation ? selectedParents[0].generation + 1 : maxGeneration;
  const [rows, setRows] = useState<MemberBatchRow[]>(() => selectedParents.length > 0
    ? selectedParents.map(parent => blankRow(defaultGeneration, String(parent.id)))
    : [blankRow(defaultGeneration)]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState('');
  const rowsTouched = useRef(false);

  useEffect(() => {
    if (rowsTouched.current) return;
    setRows(selectedParents.length > 0
      ? selectedParents.map(parent => blankRow(defaultGeneration, String(parent.id)))
      : [blankRow(defaultGeneration)]);
  }, [defaultGeneration, selectedParents]);

  const addRow = () => {
    rowsTouched.current = true;
    const lastRow = rows[rows.length - 1];
    setRows(previous => [...previous, blankRow(lastRow?.generation || defaultGeneration, lastRow?.parent_id || '')]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    rowsTouched.current = true;
    setRows(previous => previous.filter(row => row.id !== id));
  };

  const updateRow = (id: string, field: keyof MemberBatchRow, value: string | number) => {
    rowsTouched.current = true;
    setRows(previous => previous.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value } as MemberBatchRow;
      if (field === 'generation') {
        updated.generation = Number(value);
        if (parentIds.length === 0 && !members.some(member => String(member.id) === updated.parent_id && member.generation === updated.generation - 1)) {
          updated.parent_id = '';
        }
      }
      return updated;
    }));
  };

  const validRows = rows.filter(row => row.name.trim());
  const parentOptions = (row: MemberBatchRow) => parentIds.length > 0
    ? selectedParents
    : members.filter(member => member.generation === row.generation - 1)
      .sort((a, b) => (a.sibling_rank || 0) - (b.sibling_rank || 0) || a.name.localeCompare(b.name, 'zh'));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validRows.length === 0) return;
    if (validRows.length > 500) {
      setError('单次最多批量添加 500 人');
      return;
    }

    setSaving(true);
    setSavedCount(0);
    setError('');
    try {
      const created = await addMembersBatch(validRows.map(row => ({
        name: row.name.trim(),
        gender: row.gender || null,
        generation: row.generation,
        parent_id: row.parent_id ? Number(row.parent_id) : null,
        spouse_name: row.spouse_name.trim() || null,
        sibling_rank: row.sibling_rank,
      })));
      setSavedCount(created.length);
      onSaved?.(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-12">#</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-40">姓名 *</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-24">性别</th>
              {parentIds.length === 0 && <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-32">辈份</th>}
              <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-24">同性别排行</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-40">父母</th>
              <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-32">配偶名字</th>
              <th className="px-3 py-3 text-center text-sm font-medium text-slate-700 w-16">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-3 py-3 text-slate-400 text-sm">{index + 1}</td>
                <td className="px-3 py-3">
                  <input type="text" value={row.name} onChange={event => updateRow(row.id, 'name', event.target.value)}
                    className="ui-input text-sm" placeholder="姓名" />
                </td>
                <td className="px-3 py-3">
                  <select value={row.gender} onChange={event => updateRow(row.id, 'gender', event.target.value)}
                    className="ui-input bg-paper-card text-sm">
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </td>
                {parentIds.length === 0 && (
                  <td className="px-3 py-3">
                    <select value={row.generation} onChange={event => updateRow(row.id, 'generation', Number(event.target.value))}
                      className="ui-input bg-paper-card text-sm">
                      {!generationChars.some(char => char.generation === row.generation) && (
                        <option value={row.generation}>第{row.generation}世</option>
                      )}
                      {generationChars.map(char => (
                        <option key={char.generation} value={char.generation}>第{char.generation}世 · {char.char}</option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="px-3 py-3">
                  <input type="number" min={1} value={row.sibling_rank}
                    onChange={event => updateRow(row.id, 'sibling_rank', Number(event.target.value) || 1)}
                    className="ui-input text-sm" placeholder="同性别排行" />
                </td>
                <td className="px-3 py-3">
                  <select value={row.parent_id} onChange={event => updateRow(row.id, 'parent_id', event.target.value)}
                    className="ui-input bg-paper-card text-sm">
                    <option value="">无</option>
                    {parentOptions(row).map(member => (
                      <option key={member.id} value={member.id}>{member.name}（第{member.generation}世 · {member.generation_char || '无字辈'}）</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <input type="text" value={row.spouse_name} onChange={event => updateRow(row.id, 'spouse_name', event.target.value)}
                    className="ui-input text-sm" placeholder="配偶名字" />
                </td>
                <td className="px-3 py-3 text-center">
                  <button type="button" onClick={() => removeRow(row.id)} disabled={rows.length === 1} aria-label="删除此行"
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" onClick={addRow}
          className="flex items-center gap-2 px-4 py-2 border border-dashed border-cinnabar-300 text-cinnabar-600 rounded-lg hover:bg-cinnabar-50 transition-colors">
          <Plus className="w-4 h-4" />
          添加一行
        </button>
        <span className="text-sm text-slate-500">共 {rows.length} 行</span>
        {saving && <span className="text-sm text-cinnabar-600 font-medium">已保存 {savedCount}/{validRows.length}</span>}
      </div>

      {error && <div className="mt-4 px-3 py-2 bg-cinnabar-50 text-cinnabar-700 rounded-lg text-xs border border-cinnabar-200" role="alert">{error}</div>}

      <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
        <button type="submit" disabled={saving || validRows.length === 0}
          className="flex-1 bg-cinnabar-600 text-paper-card py-3 rounded-xl font-medium hover:bg-cinnabar-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
          <Save className="w-5 h-5" />
          {saving ? `保存中 (${savedCount}/${validRows.length})...` : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-8 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            取消
          </button>
        )}
      </div>
    </form>
  );
}
