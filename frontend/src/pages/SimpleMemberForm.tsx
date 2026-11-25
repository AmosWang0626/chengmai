import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User } from '../types';
import { ArrowLeft, Save, User as UserIcon, Users, Heart } from 'lucide-react';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { motion } from 'framer-motion';

interface SimpleMemberFormProps {
  user: User | null;
}

export default function SimpleMemberForm({ user }: SimpleMemberFormProps) {
  const navigate = useNavigate();
  const idParam = useParams().id;
  const id = idParam ? Number(idParam) : undefined;
  const isEdit = !!id;
  const { members, generationChars, addMember, updateMember, getGenerationChar } = useFamilyMembers(user?.id);

  const maxGeneration = generationChars.length > 0
    ? Math.max(...generationChars.map(gc => gc.generation))
    : 21;

  const [formData, setFormData] = useState({
    name: '',
    gender: 'male' as 'male' | 'female' | 'other' | '',
    generation: maxGeneration,
    generation_char: getGenerationChar(maxGeneration) || '泰',
    parent_id: '',
    spouse_name: '',
    sibling_rank: 1
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit && generationChars.length > 0) {
      const maxGen = Math.max(...generationChars.map(gc => gc.generation));
      setFormData(prev => ({
        ...prev,
        generation: maxGen,
        generation_char: getGenerationChar(maxGen) || '泰'
      }));
    }
  }, [generationChars, isEdit, getGenerationChar]);

  useEffect(() => {
    if (isEdit && id && members.length > 0) {
      const member = members.find(m => m.id === id);
      if (member) {
        setFormData({
          name: member.name,
          gender: member.gender || 'male',
          generation: member.generation || maxGeneration,
          generation_char: member.generation_char || '',
          parent_id: member.parent_id != null ? String(member.parent_id) : '',
          spouse_name: member.spouse_name || '',
          sibling_rank: member.sibling_rank || 1
        });
      }
    }
  }, [isEdit, id, members, maxGeneration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    setError('');
    try {
      const data = {
        name: formData.name,
        gender: formData.gender || null,
        generation: formData.generation,
        generation_char: getGenerationChar(formData.generation),
        parent_id: formData.parent_id ? Number(formData.parent_id) : null,
        spouse_name: formData.spouse_name.trim() || null,
        sibling_rank: formData.sibling_rank
      };

      if (isEdit && id) {
        await updateMember(id, data);
      } else {
        await addMember(data);
      }
      navigate('/members');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "ui-input";
  const labelClass = "ui-label";

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-lg mx-auto px-4 py-6">
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
          <h1 className="font-display text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-cinnabar-50 rounded-xl flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-cinnabar-600" />
            </div>
            {isEdit ? '编辑家人' : '添加家人'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>姓名 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
                placeholder="请输入姓名"
                required
              />
            </div>

            <div>
              <label className={labelClass}>性别</label>
              <div className="flex gap-2">
                {[
                  { value: 'male', label: '男', color: 'bg-blue-500' },
                  { value: 'female', label: '女', color: 'bg-pink-500' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: opt.value as 'male' | 'female' })}
                    className={`flex-1 py-2 rounded-lg border-2 transition-all text-[13px] ${
                      formData.gender === opt.value
                        ? `border-${opt.color.replace('bg-', '')} bg-${opt.color.replace('bg-', '')}/10 text-${opt.color.replace('bg-', '')}`
                        : 'border-slate-200 hover:border-cinnabar-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>辈份</label>
              <select
                value={formData.generation}
                onChange={e => {
                  const gen = parseInt(e.target.value);
                  setFormData({ ...formData, generation: gen, generation_char: getGenerationChar(gen) });
                }}
                className={inputClass}
              >
                {generationChars.map(gc => (
                  <option key={gc.generation} value={gc.generation}>
                    第{gc.generation}世 · {gc.char}字辈
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>排行</label>
              <input
                type="number"
                min={1}
                value={formData.sibling_rank}
                onChange={e => setFormData({ ...formData, sibling_rank: parseInt(e.target.value) || 1 })}
                className={inputClass}
                placeholder="同辈排行"
              />
            </div>

            <div>
              <label className={labelClass}>
                <Users className="w-4 h-4 inline mr-1" />
                父母
              </label>
              <select
                value={formData.parent_id}
                onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                className={inputClass}
              >
                <option value="">请选择（可选）</option>
                {members
                  .filter(m => m.id !== id && m.generation === formData.generation - 1)
                  .sort((a, b) => (a.sibling_rank || 0) - (b.sibling_rank || 0))
                  .map(m => (
                    <option key={m.id} value={m.id}>{m.name}（第{m.generation}世 · {m.generation_char}字辈）</option>
                  ))}
              </select>
              {members.filter(m => m.id !== id && m.generation && m.generation < formData.generation).length === 0 && (
                <p className="text-xs text-gilt-600 mt-1">暂无长辈数据，请先添加长辈</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                <Heart className="w-4 h-4 inline mr-1" />
                配偶名字
              </label>
              <input
                type="text"
                value={formData.spouse_name}
                onChange={e => setFormData({ ...formData, spouse_name: e.target.value })}
                className={inputClass}
                placeholder="输入配偶名字（可选）"
              />
              <p className="text-xs text-slate-400 mt-1">如果配偶不在列表中，请先添加</p>
            </div>

            {error && (
              <div className="mt-4 px-3 py-2 bg-cinnabar-50 text-cinnabar-700 rounded-lg text-xs border border-cinnabar-200">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="flex-1 bg-cinnabar-600 text-paper-card py-3 rounded-xl font-medium hover:bg-cinnabar-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? '保存中...' : (isEdit ? '保存' : '添加')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/members')}
                className="px-6 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors"
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
