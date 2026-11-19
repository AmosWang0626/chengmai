import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { ArrowLeft, Save, Plus, Trash2, User as UserIcon, Users } from 'lucide-react';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { motion, AnimatePresence } from 'framer-motion';

interface BatchMemberFormProps {
  user: User | null;
}

interface MemberRow {
  id: string;
  name: string;
  gender: 'male' | 'female' | '';
  generation: number;
  parent_id: string;
  spouse_name: string;
  sibling_rank: number;
}

export default function BatchMemberForm({ user }: BatchMemberFormProps) {
  const navigate = useNavigate();
  const { members, generationChars, addMember, getGenerationChar } = useFamilyMembers(user?.id);
  const maxGeneration = generationChars.length > 0
    ? Math.max(...generationChars.map(gc => gc.generation))
    : 21;

  const [rows, setRows] = useState<MemberRow[]>([
    { id: '1', name: '', gender: 'male', generation: maxGeneration, parent_id: '', spouse_name: '', sibling_rank: 1 }
  ]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    const maxGen = generationChars.length > 0
      ? Math.max(...generationChars.map(gc => gc.generation))
      : 21;
    setRows(prev => [...prev, {
      id: Date.now().toString(),
      name: '',
      gender: 'male',
      generation: lastRow ? lastRow.generation : maxGen,
      parent_id: lastRow ? lastRow.parent_id : '',
      spouse_name: '',
      sibling_rank: 1
    }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof MemberRow, value: string | number) => {
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
          parent_id: row.parent_id || null,
          spouse_name: row.spouse_name.trim() || null,
          sibling_rank: row.sibling_rank
        };

        await addMember(data);
        setSavedCount(prev => prev + 1);
      }

      setTimeout(() => navigate('/members'), 500);
    } catch (err) {
      console.error('批量保存失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "ui-input transition-all text-sm";
  const selectClass = "ui-input transition-all text-sm bg-paper-card";

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 text-slate-600 hover:text-cinnabar-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回列表
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ui-card p-3 sm:p-4"
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-cinnabar-50 rounded-xl flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-cinnabar-600" />
              </div>
              批量添加家人
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                共 {rows.length} 行
              </span>
              {saving && (
                <span className="text-sm text-cinnabar-600 font-medium">
                  已保存 {savedCount}/{rows.filter(r => r.name.trim()).length}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-12">#</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-40">姓名 *</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-28">性别</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-32">辈份</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-20">排行</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-40">父母</th>
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
                            value={row.generation}
                            onChange={e => updateRow(row.id, 'generation', parseInt(e.target.value))}
                            className={selectClass}
                          >
                            {generationChars.map(gc => (
                              <option key={gc.generation} value={gc.generation}>
                                第{gc.generation}世 · {gc.char}
                              </option>
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
                          <select
                            value={row.parent_id}
                            onChange={e => updateRow(row.id, 'parent_id', e.target.value)}
                            className={selectClass}
                          >
                            <option value="">无</option>
                            {members
                              .filter(m => m.generation === row.generation - 1)
                              .sort((a, b) => (a.sibling_rank || 0) - (b.sibling_rank || 0))
                              .map(m => (
                                <option key={m.id} value={m.id}>{m.name}（第{m.generation}世 · {m.generation_char}字辈）</option>
                              ))}
                          </select>
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

            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
              <button
                type="submit"
                disabled={saving || rows.filter(r => r.name.trim()).length === 0}
                className="flex-1 bg-cinnabar-600 text-paper-card py-3 rounded-xl font-medium hover:bg-cinnabar-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? `保存中 (${savedCount}/${rows.filter(r => r.name.trim()).length})...` : '批量保存'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/members')}
                className="px-8 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
