import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { ArrowLeft, Save, Edit3, CheckSquare, Square } from 'lucide-react';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { FamilyMember } from '../types';
import { motion } from 'framer-motion';

interface BatchEditMemberFormProps {
  user: User | null;
}

interface EditableMember {
  id: number;
  name: string;
  gender: 'male' | 'female' | 'other' | '';
  generation: number;
  generation_char: string;
  parent_id: string;
  spouse_name: string;
  sibling_rank: number;
  family_rank: number;
  selected: boolean;
}

export default function BatchEditMemberForm({ user }: BatchEditMemberFormProps) {
  const navigate = useNavigate();
  const { members, generationChars, updateMember, getGenerationChar, refresh } = useFamilyMembers(user?.id);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [generationFilter, setGenerationFilter] = useState<string>('');
  const [parentFilter, setParentFilter] = useState<string>('');
  const [editableMembers, setEditableMembers] = useState<EditableMember[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (members.length > 0 && !initialized) {
      setEditableMembers(members.map(m => ({
        id: m.id,
        name: m.name,
        gender: m.gender || '',
        generation: m.generation || 21,
        generation_char: m.generation_char || '',
        parent_id: m.parent_id != null ? String(m.parent_id) : '',
        spouse_name: m.spouse_name || '',
        sibling_rank: m.sibling_rank || 1,
        family_rank: m.family_rank || 1,
        selected: false
      })));
      setInitialized(true);
    }
  }, [members, initialized]);

  const filteredMembers = useMemo(() => {
    return editableMembers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGender = genderFilter ? m.gender === genderFilter : true;
      const matchesGeneration = generationFilter ? m.generation === parseInt(generationFilter) : true;
      const matchesParent = parentFilter ? m.parent_id === parentFilter : true;
      return matchesSearch && matchesGender && matchesGeneration && matchesParent;
    });
  }, [editableMembers, searchTerm, genderFilter, generationFilter, parentFilter]);

  const selectedCount = editableMembers.filter(m => m.selected).length;

  const toggleSelect = (id: number) => {
    setEditableMembers(prev => prev.map(m =>
      m.id === id ? { ...m, selected: !m.selected } : m
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = filteredMembers.every(m => m.selected);
    setEditableMembers(prev => prev.map(m =>
      filteredMembers.some(fm => fm.id === m.id)
        ? { ...m, selected: !allSelected }
        : m
    ));
  };

  const updateField = (id: number, field: keyof EditableMember, value: string | number) => {
    setEditableMembers(prev => prev.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, [field]: value };
      if (field === 'generation') {
        updated.generation = typeof value === 'number' ? value : parseInt(value as string);
        updated.generation_char = getGenerationChar(updated.generation);
      }
      return updated;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMembers = editableMembers.filter(m => m.selected);
    if (selectedMembers.length === 0) return;

    setSaving(true);
    setSavedCount(0);

    try {
      for (const member of selectedMembers) {
        const data = {
          name: member.name.trim(),
          gender: member.gender || null,
          generation: member.generation,
          generation_char: getGenerationChar(member.generation),
          parent_id: member.parent_id ? Number(member.parent_id) : null,
          spouse_name: member.spouse_name.trim() || null,
          sibling_rank: member.sibling_rank,
          family_rank: member.family_rank
        };
        await updateMember(member.id, data);
        setSavedCount(prev => prev + 1);
      }
      await refresh();
      setTimeout(() => navigate('/members'), 500);
    } catch (err) {
      console.error('批量编辑失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "ui-input transition-all text-sm";
  const selectClass = "ui-input transition-all text-sm bg-paper-card";

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-6xl mx-auto px-4 py-6">
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
                <Edit3 className="w-5 h-5 text-cinnabar-600" />
              </div>
              批量编辑家人
            </h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索姓名"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-4 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cinnabar-100 w-48"
                />
              </div>
              <select
                value={genderFilter}
                onChange={e => setGenderFilter(e.target.value)}
                className="ui-select h-8"
              >
                <option value="">全部性别</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
              <select
                value={generationFilter}
                onChange={e => setGenerationFilter(e.target.value)}
                className="ui-select h-8"
              >
                <option value="">全部辈份</option>
                {generationChars.map(gc => (
                  <option key={gc.generation} value={gc.generation}>
                    第{gc.generation}世 · {gc.char}字辈
                  </option>
                ))}
              </select>
              <select
                value={parentFilter}
                onChange={e => setParentFilter(e.target.value)}
                className="ui-select h-8"
              >
                <option value="">全部父母</option>
                {members.filter(m => m.generation && m.generation < (generationFilter ? parseInt(generationFilter) : 100)).map(m => (
                  <option key={m.id} value={m.id}>{m.name}（第{m.generation}世）</option>
                ))}
              </select>
              <span className="text-sm text-slate-500">
                已选 {selectedCount} 人
              </span>
              {saving && (
                <span className="text-sm text-cinnabar-600 font-medium">
                  已保存 {savedCount}/{selectedCount}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3 text-left w-12">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                      >
                        {filteredMembers.length > 0 && filteredMembers.every(m => m.selected) ? (
                          <CheckSquare className="w-5 h-5 text-cinnabar-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-36">姓名</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-28">性别</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-32">辈份</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-20">同辈排行</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-20">家庭排序</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-40">父母</th>
                    <th className="px-3 py-3 text-left text-sm font-medium text-slate-700 w-32">配偶名字</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50 ${member.selected ? 'bg-cinnabar-50/50' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSelect(member.id)}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          {member.selected ? (
                            <CheckSquare className="w-5 h-5 text-cinnabar-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={member.name}
                          onChange={e => updateField(member.id, 'name', e.target.value)}
                          disabled={!member.selected}
                          className={`${inputClass} ${!member.selected ? 'bg-slate-100 text-slate-400' : ''}`}
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
                              onClick={() => updateField(member.id, 'gender', opt.value)}
                              disabled={!member.selected}
                              className={`flex-1 py-2 px-2 rounded-lg text-sm border transition-all ${
                                member.gender === opt.value
                                  ? 'bg-cinnabar-50 border-violet-500 text-cinnabar-700'
                                  : 'border-slate-200 hover:border-cinnabar-300'
                              } ${!member.selected ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={member.generation}
                          onChange={e => updateField(member.id, 'generation', parseInt(e.target.value))}
                          disabled={!member.selected}
                          className={`${selectClass} ${!member.selected ? 'bg-slate-100 text-slate-400' : ''}`}
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
                          value={member.sibling_rank}
                          onChange={e => updateField(member.id, 'sibling_rank', parseInt(e.target.value) || 1)}
                          disabled={!member.selected}
                          className={`${inputClass} ${!member.selected ? 'bg-slate-100 text-slate-400' : ''}`}
                          placeholder="同辈排行"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={1}
                          value={member.family_rank}
                          onChange={e => updateField(member.id, 'family_rank', parseInt(e.target.value) || 1)}
                          disabled={!member.selected}
                          className={`${inputClass} ${!member.selected ? 'bg-slate-100 text-slate-400' : ''}`}
                          placeholder="家庭排序"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={member.parent_id}
                          onChange={e => {
                            updateField(member.id, 'parent_id', e.target.value);
                            setParentFilter(e.target.value);
                          }}
                          disabled={!member.selected}
                          className={`${selectClass} ${!member.selected ? 'bg-slate-100 text-slate-400' : ''}`}
                        >
                          <option value="">无</option>
                          {members.filter(m => m.generation && m.generation < member.generation).map(m => (
                            <option key={m.id} value={m.id}>{m.name}（第{m.generation}世）</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={member.spouse_name}
                          onChange={e => updateField(member.id, 'spouse_name', e.target.value)}
                          disabled={!member.selected}
                          className={`${inputClass} ${!member.selected ? 'bg-slate-100 text-slate-400' : ''}`}
                          placeholder="配偶名字"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredMembers.length === 0 && (
              <div className="text-center py-12 text-slate-500">暂无数据</div>
            )}

            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
              <button
                type="submit"
                disabled={saving || selectedCount === 0}
                className="flex-1 bg-cinnabar-600 text-paper-card py-3 rounded-xl font-medium hover:bg-cinnabar-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? `保存中 (${savedCount}/${selectedCount})...` : `保存修改 (${selectedCount})`}
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
