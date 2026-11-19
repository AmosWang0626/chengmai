import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { Save, Plus, Trash2, X, User as UserIcon } from 'lucide-react';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { motion, AnimatePresence } from 'framer-motion';

interface BatchChildrenModalProps {
  user: User | null;
  parentIds: number[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ChildRow {
  id: string;
  name: string;
  gender: 'male' | 'female' | '';
  generation: number;
  parent_id: string;
  spouse_name: string;
  sibling_rank: number;
}

export default function BatchChildrenModal({ user, parentIds, isOpen, onClose, onSuccess }: BatchChildrenModalProps) {
  const { members, generationChars, addMember, getGenerationChar } = useFamilyMembers(user?.id);

  const selectedParents = useMemo(() => {
    return members.filter(m => parentIds.includes(m.id));
  }, [members, parentIds]);

  const parentGeneration = selectedParents[0]?.generation || 21;
  const childGeneration = parentGeneration + 1;

  const [rows, setRows] = useState<ChildRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  React.useEffect(() => {
    if (isOpen && selectedParents.length > 0) {
      if (selectedParents.length === 1) {
        setRows([{ id: '1', name: '', gender: 'male', generation: childGeneration, parent_id: String(selectedParents[0].id), spouse_name: '', sibling_rank: 1 }]);
      } else {
        setRows(selectedParents.map((parent, index) => ({
          id: Date.now().toString() + index,
          name: '',
          gender: 'male',
          generation: childGeneration,
          parent_id: String(parent.id),
          spouse_name: '',
          sibling_rank: 1
        })));
      }
    }
  }, [isOpen, selectedParents, childGeneration]);

  const addRow = () => {
    setRows(prev => [...prev, {
      id: Date.now().toString(),
      name: '',
      gender: 'male',
      generation: childGeneration,
      parent_id: selectedParents[0] ? String(selectedParents[0].id) : '',
      spouse_name: '',
      sibling_rank: 1
    }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof ChildRow, value: string | number) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };
      if (field === 'generation') {
        updated.generation = typeof value === 'number' ? value : parseInt(value as string);
      }
      return updated;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter(r => r.name.trim());
    if (validRows.length === 0) return;

    setSaving(true);
    setSavedCount(0);

    try {
      for (const row of validRows) {
        const data = {
          name: row.name.trim(),
          gender: row.gender || null,
          generation: row.generation,
          generation_char: getGenerationChar(row.generation),
          parent_id: row.parent_id ? Number(row.parent_id) : null,
          spouse_name: row.spouse_name.trim() || null,
          sibling_rank: row.sibling_rank
        };

        await addMember(data);
        setSavedCount(prev => prev + 1);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('批量保存失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "ui-input transition-all text-sm";
  const selectClass = "ui-input transition-all text-sm bg-paper-card";

  const availableParents = members.filter(m => m.generation === parentGeneration);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-paper-card rounded-xl shadow-lift w-full max-w-5xl max-h-[90vh] overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-cinnabar-50 rounded-xl flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-cinnabar-600" />
                </div>
                批量添加子女
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                为 {selectedParents.map(p => p.name).join('、')} 添加子女
                （第{childGeneration}世 · {getGenerationChar(childGeneration)}字辈）
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                共 {rows.length} 行
              </span>
              {saving && (
                <span className="text-sm text-cinnabar-600 font-medium">
                  已保存 {savedCount}/{rows.filter(r => r.name.trim()).length}
                </span>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <form onSubmit={handleSubmit}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-12">#</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-40">姓名 *</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-28">性别</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-32">父母</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-20">排行</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-32">配偶名字</th>
                    <th className="px-3 py-3 text-center text-sm font-medium text-slate-700 w-16">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {rows.map((row, index) => (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-3 py-3 text-slate-400 text-sm">{index + 1}</td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={row.name}
                            onChange={e => updateRow(row.id, 'name', e.target.value)}
                            className={inputClass}
                            placeholder="姓名"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            {[
                              { value: 'male', label: '男' },
                              { value: 'female', label: '女' }
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateRow(row.id, 'gender', opt.value)}
                                className={`flex-1 py-2 px-2 rounded-lg text-sm border transition-all ${
                                  row.gender === opt.value
                                    ? 'bg-cinnabar-50 border-violet-500 text-cinnabar-700'
                                    : 'border-slate-200 hover:border-cinnabar-300'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={row.parent_id}
                            onChange={e => updateRow(row.id, 'parent_id', e.target.value)}
                            className={selectClass}
                          >
                            {availableParents.map(m => (
                              <option key={m.id} value={m.id}>{m.name}（第{m.generation}世）</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min={1}
                            value={row.sibling_rank}
                            onChange={e => updateRow(row.id, 'sibling_rank', parseInt(e.target.value) || 1)}
                            className={inputClass}
                            placeholder="排行"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={row.spouse_name}
                            onChange={e => updateRow(row.id, 'spouse_name', e.target.value)}
                            className={inputClass}
                            placeholder="配偶名字"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length === 1}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-cinnabar-300 text-cinnabar-600 rounded-lg hover:bg-cinnabar-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加一行
              </button>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving || rows.filter(r => r.name.trim()).length === 0}
            className="flex-1 bg-cinnabar-600 text-paper-card py-3 rounded-xl font-medium hover:bg-cinnabar-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? `保存中 (${savedCount}/${rows.filter(r => r.name.trim()).length})...` : '批量保存'}
          </button>
          <button
            onClick={onClose}
            className="px-8 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
        </div>
      </motion.div>
    </div>
  );
}
