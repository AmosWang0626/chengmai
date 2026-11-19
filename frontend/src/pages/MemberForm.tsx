import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User } from '../types';
import { ArrowLeft, Save, User as UserIcon, Calendar, Phone, Mail, MapPin, BookOpen, Briefcase, Heart, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { FamilyMember } from '../types';

interface MemberFormProps {
  user: User | null;
}

export default function MemberForm({ user }: MemberFormProps) {
  const navigate = useNavigate();
  const idParam = useParams().id;
  const id = idParam ? Number(idParam) : undefined;
  const isEdit = !!id;
  const { members, generationChars, addMember, updateMember, loading: membersLoading, getGenerationChar } = useFamilyMembers(user?.id);

  const [formData, setFormData] = useState({
    name: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    birth_date: '',
    death_date: '',
    phone: '',
    email: '',
    address: '',
    occupation: '',
    education: '',
    bio: '',
    parent_id: '',
    spouse_name: '',
    spouse_origin: '',
    spouse_birth_date: '',
    spouse_death_date: '',
    generation: 21,
    generation_char: '冠',
    sibling_rank: 1,
    family_rank: 1
  });
  const [saving, setSaving] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  useEffect(() => {
    if (isEdit && id && members.length > 0) {
      const member = members.find(m => m.id === id);
      if (member) {
        setFormData({
          name: member.name,
          gender: member.gender || '',
          birth_date: member.birth_date || '',
          death_date: member.death_date || '',
          phone: member.phone || '',
          email: member.email || '',
          address: member.address || '',
          occupation: member.occupation || '',
          education: member.education || '',
          bio: member.bio || '',
          parent_id: member.parent_id != null ? String(member.parent_id) : '',
          spouse_name: member.spouse_name || '',
          spouse_origin: member.spouse_origin || '',
          spouse_birth_date: member.spouse_birth_date || '',
          spouse_death_date: member.spouse_death_date || '',
          generation: member.generation || 21,
          generation_char: member.generation_char || '',
          sibling_rank: member.sibling_rank || 1,
          family_rank: member.family_rank || 1
        });
      }
    }
  }, [isEdit, id, members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const data = {
        ...formData,
        gender: formData.gender === '' ? null : formData.gender,
        birth_date: formData.birth_date || null,
        death_date: formData.death_date || null,
        parent_id: formData.parent_id ? Number(formData.parent_id) : null,
        spouse_name: formData.spouse_name.trim() || null,
        spouse_origin: formData.spouse_origin.trim() || null,
        spouse_birth_date: formData.spouse_birth_date || null,
        spouse_death_date: formData.spouse_death_date || null,
        generation: formData.generation,
        generation_char: getGenerationChar(formData.generation),
        sibling_rank: formData.sibling_rank,
        family_rank: formData.family_rank
      };

      if (isEdit && id) {
        await updateMember(id, data);
      } else {
        await addMember(data);
      }
      navigate('/members');
    } catch (err) {
      console.error('保存失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "ui-input";
  const labelClass = "ui-label";

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 text-slate-600 hover:text-cinnabar-600 transition-colors mb-4 sm:mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回列表
        </button>

        <div className="ui-card p-3 sm:p-4">
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 mb-6 sm:mb-8 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cinnabar-50 rounded-xl flex items-center justify-center">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-cinnabar-600" />
            </div>
            {isEdit ? '编辑家人信息' : '添加家人'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })}
                  className={inputClass}
                >
                  <option value="">请选择</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
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
                  <option value="">请选择</option>
                  {members.filter(m => m.id !== id).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
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
                <label className={labelClass}>字辈</label>
                <div className="px-4 py-3 bg-cinnabar-50 border border-violet-200 rounded-xl text-cinnabar-700 font-medium">
                  {formData.generation_char || getGenerationChar(formData.generation)}
                </div>
              </div>

              <div>
                <label className={labelClass}>同辈排行（同性别）</label>
                <input
                  type="number"
                  min={1}
                  value={formData.sibling_rank}
                  onChange={e => setFormData({ ...formData, sibling_rank: parseInt(e.target.value) || 1 })}
                  className={inputClass}
                  placeholder="同性别中的排行"
                />
              </div>

              <div>
                <label className={labelClass}>家庭排序</label>
                <input
                  type="number"
                  min={1}
                  value={formData.family_rank}
                  onChange={e => setFormData({ ...formData, family_rank: parseInt(e.target.value) || 1 })}
                  className={inputClass}
                  placeholder="一家人中的排序"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  出生日期
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  逝世日期
                </label>
                <input
                  type="date"
                  value={formData.death_date}
                  onChange={e => setFormData({ ...formData, death_date: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  <MapPin className="w-4 h-4 inline mr-1" />
                  配偶籍贯
                </label>
                <input
                  type="text"
                  value={formData.spouse_origin}
                  onChange={e => setFormData({ ...formData, spouse_origin: e.target.value })}
                  className={inputClass}
                  placeholder="输入配偶籍贯（可选）"
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  配偶出生日期
                </label>
                <input
                  type="date"
                  value={formData.spouse_birth_date}
                  onChange={e => setFormData({ ...formData, spouse_birth_date: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  配偶逝世日期
                </label>
                <input
                  type="date"
                  value={formData.spouse_death_date}
                  onChange={e => setFormData({ ...formData, spouse_death_date: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowMoreInfo(!showMoreInfo)}
                  className="flex items-center gap-2 text-cinnabar-600 hover:text-cinnabar-700 font-medium transition-colors"
                >
                  {showMoreInfo ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  {showMoreInfo ? '收起更多信息' : '展开更多信息（电话、邮箱、地址、职业、学历）'}
                </button>
              </div>

              {showMoreInfo && (
                <>
                  <div>
                    <label className={labelClass}>
                      <Phone className="w-4 h-4 inline mr-1" />
                      电话
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className={inputClass}
                      placeholder="请输入电话号码"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Mail className="w-4 h-4 inline mr-1" />
                      邮箱
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className={inputClass}
                      placeholder="请输入邮箱地址"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      <MapPin className="w-4 h-4 inline mr-1" />
                      地址
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className={inputClass}
                      placeholder="请输入居住地址"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <Briefcase className="w-4 h-4 inline mr-1" />
                      职业
                    </label>
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                      className={inputClass}
                      placeholder="请输入职业"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      <BookOpen className="w-4 h-4 inline mr-1" />
                      学历
                    </label>
                    <input
                      type="text"
                      value={formData.education}
                      onChange={e => setFormData({ ...formData, education: e.target.value })}
                      className={inputClass}
                      placeholder="请输入学历"
                    />
                  </div>

                </>
              )}

              <div className="md:col-span-2">
                <label className={labelClass}>个人简介</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  className={`${inputClass} min-h-[100px] resize-y`}
                  placeholder="请输入个人简介..."
                  rows={4}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <button
                type="submit"
                disabled={saving || !formData.name.trim()}
                className="flex-1 bg-cinnabar-600 text-paper-card py-3 rounded-xl font-medium hover:bg-cinnabar-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? '保存中...' : (isEdit ? '保存修改' : '添加家人')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/members')}
                className="px-6 sm:px-8 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
