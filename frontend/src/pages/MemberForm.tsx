import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User as UserIcon, Calendar, Phone, Mail, MapPin, BookOpen, Briefcase, Heart, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { FamilyMember, MemberFormData, User } from '../types';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { ROUTES } from '../routes';
import DateInput from '../components/DateInput';

const emptyForm = (generation: number, generationChar: string): MemberFormData => ({
  name: '',
  gender: '',
  birth_date: '',
  birth_calendar: 'solar',
  birth_lunar_leap: 0,
  death_date: '',
  phone: '',
  email: '',
  address: '',
  occupation: '',
  education: '',
  bio: '',
  notes: '',
  parent_id: '',
  spouse_name: '',
  spouse_origin: '',
  spouse_birth_date: '',
  spouse_birth_calendar: 'solar',
  spouse_lunar_leap: 0,
  spouse_death_date: '',
  generation,
  generation_char: generationChar,
  sibling_rank: 1,
  family_rank: 1,
});

const hasAdvancedInfo = (member: FamilyMember) => Boolean(
  member.birth_date || member.death_date || member.phone || member.email || member.address ||
  member.occupation || member.education || member.bio || member.notes || member.spouse_origin ||
  member.spouse_birth_date || member.spouse_death_date
);

export default function MemberForm({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const idParam = useParams().id;
  const id = idParam ? Number(idParam) : undefined;
  const isEdit = id !== undefined;
  const { members, generationChars, addMember, updateMember, getGenerationChar } = useFamilyMembers(user?.id);
  const maxGeneration = Math.max(
    1,
    ...generationChars.map(char => char.generation),
    ...members.map(member => member.generation || 0),
  );
  const [formData, setFormData] = useState<MemberFormData>(() => emptyForm(maxGeneration, getGenerationChar(maxGeneration)));
  const [saving, setSaving] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [error, setError] = useState('');
  const generationTouched = useRef(false);
  const initializedMemberId = useRef<number | null>(null);

  useEffect(() => {
    if (!isEdit && !generationTouched.current && generationChars.length > 0) {
      setFormData(previous => ({
        ...previous,
        generation: maxGeneration,
        generation_char: getGenerationChar(maxGeneration),
      }));
    }
  }, [generationChars.length, getGenerationChar, isEdit, maxGeneration]);

  useEffect(() => {
    if (!isEdit || id === undefined || initializedMemberId.current === id) return;
    const member = members.find(item => item.id === id);
    if (!member) return;
    initializedMemberId.current = id;
    setFormData({
      name: member.name,
      gender: member.gender || '',
      birth_date: member.birth_date || '',
      birth_calendar: member.birth_calendar || 'solar',
      birth_lunar_leap: member.birth_lunar_leap || 0,
      death_date: member.death_date || '',
      phone: member.phone || '',
      email: member.email || '',
      address: member.address || '',
      occupation: member.occupation || '',
      education: member.education || '',
      bio: member.bio || '',
      notes: member.notes || '',
      parent_id: member.parent_id != null ? String(member.parent_id) : '',
      spouse_name: member.spouse_name || '',
      spouse_origin: member.spouse_origin || '',
      spouse_birth_date: member.spouse_birth_date || '',
      spouse_birth_calendar: member.spouse_birth_calendar || 'solar',
      spouse_lunar_leap: member.spouse_lunar_leap || 0,
      spouse_death_date: member.spouse_death_date || '',
      generation: member.generation || maxGeneration,
      generation_char: member.generation_char || '',
      sibling_rank: member.sibling_rank || 1,
      family_rank: member.family_rank || 1,
    });
    setShowMoreInfo(hasAdvancedInfo(member));
  }, [id, isEdit, members, maxGeneration]);

  const availableParents = members
    .filter(member => member.id !== id && (
      member.generation === formData.generation - 1 || String(member.id) === formData.parent_id
    ))
    .sort((a, b) => (a.sibling_rank || 0) - (b.sibling_rank || 0) || a.name.localeCompare(b.name, 'zh'));

  const changeGeneration = (generation: number) => {
    generationTouched.current = true;
    setFormData(previous => ({
      ...previous,
      generation,
      generation_char: getGenerationChar(generation),
      parent_id: members.some(member => String(member.id) === previous.parent_id && member.generation === generation - 1)
        ? previous.parent_id
        : '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    setError('');
    const data: Partial<FamilyMember> = {
      name: formData.name.trim(),
      gender: formData.gender || null,
      birth_date: formData.birth_date || null,
      birth_calendar: formData.birth_calendar,
      birth_lunar_leap: formData.birth_lunar_leap,
      death_date: formData.death_date || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      occupation: formData.occupation.trim() || null,
      education: formData.education.trim() || null,
      bio: formData.bio.trim() || null,
      notes: formData.notes.trim() || null,
      parent_id: formData.parent_id ? Number(formData.parent_id) : null,
      spouse_name: formData.spouse_name.trim() || null,
      spouse_origin: formData.spouse_origin.trim() || null,
      spouse_birth_date: formData.spouse_birth_date || null,
      spouse_birth_calendar: formData.spouse_birth_calendar,
      spouse_lunar_leap: formData.spouse_lunar_leap,
      spouse_death_date: formData.spouse_death_date || null,
      generation: formData.generation,
      sibling_rank: formData.sibling_rank,
      family_rank: formData.family_rank,
    };

    try {
      if (isEdit && id !== undefined) await updateMember(id, data);
      else await addMember(data);
      navigate(ROUTES.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'ui-input';
  const labelClass = 'ui-label';

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <button type="button" onClick={() => navigate(ROUTES.members)}
          className="flex items-center gap-2 text-slate-600 hover:text-cinnabar-600 transition-colors mb-4 sm:mb-6">
          <ArrowLeft className="w-5 h-5" />
          返回成员
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
                <input type="text" value={formData.name} onChange={event => setFormData({ ...formData, name: event.target.value })}
                  className={inputClass} placeholder="请输入姓名" required />
              </div>

              <div>
                <label className={labelClass}>性别</label>
                <select value={formData.gender} onChange={event => setFormData({ ...formData, gender: event.target.value as MemberFormData['gender'] })}
                  className={inputClass}>
                  <option value="">请选择</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>辈份</label>
                <select value={formData.generation} onChange={event => changeGeneration(Number(event.target.value))} className={inputClass}>
                  {!generationChars.some(char => char.generation === formData.generation) && (
                    <option value={formData.generation}>第{formData.generation}世 · 未配置字辈</option>
                  )}
                  {generationChars.map(char => (
                    <option key={char.generation} value={char.generation}>第{char.generation}世 · {char.char}字辈</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>字辈</label>
                <div className="px-4 py-3 bg-cinnabar-50 border border-violet-200 rounded-xl text-cinnabar-700 font-medium">
                  {getGenerationChar(formData.generation) || '—'}
                </div>
              </div>

              <div>
                <label className={labelClass}><Users className="w-4 h-4 inline mr-1" />父母</label>
                <select value={formData.parent_id} onChange={event => setFormData({ ...formData, parent_id: event.target.value })} className={inputClass}>
                  <option value="">请选择（可选）</option>
                  {availableParents.map(member => (
                    <option key={member.id} value={member.id}>{member.name}（第{member.generation}世 · {member.generation_char || '无字辈'}）</option>
                  ))}
                </select>
                {availableParents.length === 0 && <p className="mt-1 text-xs text-gilt-600">暂无上一代家人，可先添加长辈</p>}
              </div>

              <div>
                <label className={labelClass}><Heart className="w-4 h-4 inline mr-1" />配偶名字</label>
                <input type="text" value={formData.spouse_name} onChange={event => setFormData({ ...formData, spouse_name: event.target.value })}
                  className={inputClass} placeholder="输入配偶名字（可选）" />
              </div>

              <div>
                <label className={labelClass}>同性别排行</label>
                <input type="number" min={1} value={formData.sibling_rank}
                  onChange={event => setFormData({ ...formData, sibling_rank: Number(event.target.value) || 1 })}
                  className={inputClass} placeholder="同世代同性别中的排行" />
              </div>

              <div>
                <label className={labelClass}>同辈顺序</label>
                <input type="number" min={1} value={formData.family_rank}
                  onChange={event => setFormData({ ...formData, family_rank: Number(event.target.value) || 1 })}
                  className={inputClass} placeholder="同世代全部成员中的顺序" />
              </div>

              <div className="md:col-span-2">
                <button type="button" onClick={() => setShowMoreInfo(!showMoreInfo)}
                  className="flex items-center gap-2 text-cinnabar-600 hover:text-cinnabar-700 font-medium transition-colors">
                  {showMoreInfo ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  {showMoreInfo ? '收起更多信息' : '展开更多信息（生卒、联系方式、职业、简介）'}
                </button>
              </div>

              {showMoreInfo && (
                <>
                  <div>
                    <label className={labelClass}><Calendar className="w-4 h-4 inline mr-1" />出生日期</label>
                    <DateInput
                      value={formData.birth_date}
                      onChange={value => setFormData({ ...formData, birth_date: value })}
                      calendar={formData.birth_calendar}
                      onCalendarChange={birth_calendar => setFormData({ ...formData, birth_calendar })}
                      leap={Boolean(formData.birth_lunar_leap)}
                      onLeapChange={leap => setFormData({ ...formData, birth_lunar_leap: leap ? 1 : 0 })}
                      className={inputClass}
                      ariaLabel="出生日期"
                    />
                  </div>
                  <div>
                    <label className={labelClass}><Calendar className="w-4 h-4 inline mr-1" />逝世日期</label>
                    <DateInput value={formData.death_date} onChange={value => setFormData({ ...formData, death_date: value })} className={inputClass} ariaLabel="逝世日期" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}><MapPin className="w-4 h-4 inline mr-1" />配偶籍贯</label>
                    <input type="text" value={formData.spouse_origin} onChange={event => setFormData({ ...formData, spouse_origin: event.target.value })}
                      className={inputClass} placeholder="输入配偶籍贯（可选）" />
                  </div>
                  <div>
                    <label className={labelClass}><Calendar className="w-4 h-4 inline mr-1" />配偶出生日期</label>
                    <DateInput
                      value={formData.spouse_birth_date}
                      onChange={value => setFormData({ ...formData, spouse_birth_date: value })}
                      calendar={formData.spouse_birth_calendar}
                      onCalendarChange={spouse_birth_calendar => setFormData({ ...formData, spouse_birth_calendar })}
                      leap={Boolean(formData.spouse_lunar_leap)}
                      onLeapChange={leap => setFormData({ ...formData, spouse_lunar_leap: leap ? 1 : 0 })}
                      className={inputClass}
                      ariaLabel="配偶出生日期"
                    />
                  </div>
                  <div>
                    <label className={labelClass}><Calendar className="w-4 h-4 inline mr-1" />配偶逝世日期</label>
                    <DateInput value={formData.spouse_death_date} onChange={value => setFormData({ ...formData, spouse_death_date: value })} className={inputClass} ariaLabel="配偶逝世日期" />
                  </div>
                  <div>
                    <label className={labelClass}><Phone className="w-4 h-4 inline mr-1" />电话</label>
                    <input type="tel" value={formData.phone} onChange={event => setFormData({ ...formData, phone: event.target.value })}
                      className={inputClass} placeholder="请输入电话号码" />
                  </div>
                  <div>
                    <label className={labelClass}><Mail className="w-4 h-4 inline mr-1" />邮箱</label>
                    <input type="email" value={formData.email} onChange={event => setFormData({ ...formData, email: event.target.value })}
                      className={inputClass} placeholder="请输入邮箱地址" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}><MapPin className="w-4 h-4 inline mr-1" />地址</label>
                    <input type="text" value={formData.address} onChange={event => setFormData({ ...formData, address: event.target.value })}
                      className={inputClass} placeholder="请输入居住地址" />
                  </div>
                  <div>
                    <label className={labelClass}><Briefcase className="w-4 h-4 inline mr-1" />职业</label>
                    <input type="text" value={formData.occupation} onChange={event => setFormData({ ...formData, occupation: event.target.value })}
                      className={inputClass} placeholder="请输入职业" />
                  </div>
                  <div>
                    <label className={labelClass}><BookOpen className="w-4 h-4 inline mr-1" />学历</label>
                    <input type="text" value={formData.education} onChange={event => setFormData({ ...formData, education: event.target.value })}
                      className={inputClass} placeholder="请输入学历" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>个人简介</label>
                    <textarea value={formData.bio} onChange={event => setFormData({ ...formData, bio: event.target.value })}
                      className={`${inputClass} min-h-[100px] resize-y`} placeholder="请输入个人简介..." rows={4} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>备注</label>
                    <textarea value={formData.notes} onChange={event => setFormData({ ...formData, notes: event.target.value })}
                      className={`${inputClass} min-h-[80px] resize-y`} placeholder="请输入备注..." rows={3} />
                  </div>
                </>
              )}
            </div>

            {error && <div className="px-3 py-2 bg-cinnabar-50 text-cinnabar-700 rounded-lg text-xs border border-cinnabar-200" role="alert">{error}</div>}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <button type="submit" disabled={saving || !formData.name.trim()}
                className="flex-1 bg-cinnabar-600 text-paper-card py-3 rounded-xl font-medium hover:bg-cinnabar-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                <Save className="w-5 h-5" />
                {saving ? '保存中...' : (isEdit ? '保存修改' : '添加家人')}
              </button>
              <button type="button" onClick={() => navigate(ROUTES.members)}
                className="px-6 sm:px-8 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
