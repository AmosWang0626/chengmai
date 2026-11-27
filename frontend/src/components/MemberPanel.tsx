import React, { useEffect, useState } from 'react';
import { Edit3, Plus, Save, X } from 'lucide-react';
import type { FamilyMember, User } from '../types';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { CNode, genderTint } from '../pages/tree/shared';
import BatchChildrenModal from './BatchChildrenModal';
import SiblingOrderControl from './SiblingOrderControl';
import '../pages/treeGraph.css';

interface MemberPanelProps {
  node: CNode;
  isSpouse: boolean;
  collapsed: boolean;
  user: User | null;
  canEdit?: boolean;
  onClose: () => void;
  onCenter: () => void;
  onFold: () => void;
}

interface PanelForm {
  name: string;
  gender: FamilyMember['gender'] | '';
  birthDate: string;
  deathDate: string;
  phone: string;
  spouseName: string;
  spouseOrigin: string;
  spouseBirthDate: string;
  spouseDeathDate: string;
  notes: string;
}

const MemberPanel: React.FC<MemberPanelProps> = ({ node, isSpouse, collapsed, user, canEdit = false, onClose, onCenter, onFold }) => {
  const { members, updateMember, reorderMembers } = useFamilyMembers(user?.id);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [childrenOpen, setChildrenOpen] = useState(false);
  const [form, setForm] = useState<PanelForm>({
    name: node.name,
    gender: node.gender || '',
    birthDate: node.birth_date || '',
    deathDate: node.death_date || '',
    phone: node.phone || '',
    spouseName: node.spouse_name || '',
    spouseOrigin: node.spouse_origin || '',
    spouseBirthDate: node.spouse_birth_date || '',
    spouseDeathDate: node.spouse_death_date || '',
    notes: node.notes || '',
  });

  useEffect(() => {
    setEditing(false);
    setError('');
    setForm({
      name: node.name,
      gender: node.gender || '',
      birthDate: node.birth_date || '',
      deathDate: node.death_date || '',
      phone: node.phone || '',
      spouseName: node.spouse_name || '',
      spouseOrigin: node.spouse_origin || '',
      spouseBirthDate: node.spouse_birth_date || '',
      spouseDeathDate: node.spouse_death_date || '',
      notes: node.notes || '',
    });
  }, [node.id, node.name, node.gender, node.birth_date, node.death_date, node.phone, node.spouse_name, node.spouse_origin, node.spouse_birth_date, node.spouse_death_date, node.notes, isSpouse]);

  const name = isSpouse ? node.spouse_name! : node.name;
  const tint = isSpouse ? 'bg-slate-100 text-slate-600' : genderTint(node.gender);
  const row = (key: string, value: React.ReactNode) =>
    value ? <div className="tc-row" key={key}><span className="k">{key}</span><span className="v">{value}</span></div> : null;
  const inputClass = 'ui-input w-full text-sm';

  const updateForm = (field: keyof PanelForm, value: string) => {
    setForm(previous => ({ ...previous, [field]: value }));
  };

  const save = async () => {
    if (!form.name.trim() && !isSpouse) {
      setError('姓名不能为空');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isSpouse) {
        await updateMember(node.id, {
          spouse_name: form.spouseName.trim() || null,
          spouse_origin: form.spouseOrigin.trim() || null,
          spouse_birth_date: form.spouseBirthDate || null,
          spouse_death_date: form.spouseDeathDate || null,
        });
      } else {
        await updateMember(node.id, {
          name: form.name.trim(),
          gender: form.gender || null,
          birth_date: form.birthDate || null,
          death_date: form.deathDate || null,
          phone: form.phone.trim() || null,
          spouse_name: form.spouseName.trim() || null,
          spouse_origin: form.spouseOrigin.trim() || null,
          spouse_birth_date: form.spouseBirthDate || null,
          spouse_death_date: form.spouseDeathDate || null,
          notes: form.notes.trim() || null,
        });
      }
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <aside className="tc-panel" data-stop-pan role="dialog" aria-label={`${name}详情`}>
        <div className="head">
          <span className={`ui-avatar w-11 h-11 text-lg ${tint}`}>{name.slice(-1)}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-slate-900 truncate">{name}</h3>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {isSpouse ? (
                <>
                  <span className="ui-chip bg-slate-100 text-slate-600">配偶</span>
                  <span className="text-[11px] text-slate-400 truncate">{node.name} 的配偶</span>
                </>
              ) : (
                <>
                  <span className="ui-chip bg-gilt-100 text-gilt-700 num">第{node.generation || '?'}世</span>
                  {node.generation_char && <span className="ui-chip bg-cinnabar-50 text-cinnabar-700">{node.generation_char}字辈</span>}
                  <span className="ui-chip bg-slate-100 text-slate-500">{node.gender === 'male' ? '男' : node.gender === 'female' ? '女' : '其他'}</span>
                </>
              )}
            </div>
          </div>
          <button type="button" className="ui-icon-btn flex-shrink-0" onClick={onClose} title="关闭" aria-label="关闭成员详情"><X className="h-4 w-4" /></button>
        </div>

        <div className="body">
          {editing ? (
            <div className="space-y-3">
              {isSpouse ? (
                <>
                  <label className="block"><span className="ui-label">姓名</span><input className={inputClass} value={form.spouseName} onChange={event => updateForm('spouseName', event.target.value)} /></label>
                  <label className="block"><span className="ui-label">籍贯</span><input className={inputClass} value={form.spouseOrigin} onChange={event => updateForm('spouseOrigin', event.target.value)} /></label>
                  <label className="block"><span className="ui-label">出生日期</span><input type="date" className={inputClass} value={form.spouseBirthDate} onChange={event => updateForm('spouseBirthDate', event.target.value)} /></label>
                  <label className="block"><span className="ui-label">逝世日期</span><input type="date" className={inputClass} value={form.spouseDeathDate} onChange={event => updateForm('spouseDeathDate', event.target.value)} /></label>
                </>
              ) : (
                <>
                  <label className="block"><span className="ui-label">姓名</span><input className={inputClass} value={form.name} onChange={event => updateForm('name', event.target.value)} /></label>
                  <label className="block"><span className="ui-label">性别</span><select className={inputClass} value={form.gender || ''} onChange={event => updateForm('gender', event.target.value)}><option value="">未填写</option><option value="male">男</option><option value="female">女</option><option value="other">其他</option></select></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block"><span className="ui-label">出生</span><input type="date" className={inputClass} value={form.birthDate} onChange={event => updateForm('birthDate', event.target.value)} /></label>
                    <label className="block"><span className="ui-label">逝世</span><input type="date" className={inputClass} value={form.deathDate} onChange={event => updateForm('deathDate', event.target.value)} /></label>
                  </div>
                  <label className="block"><span className="ui-label">电话</span><input className={inputClass} value={form.phone} onChange={event => updateForm('phone', event.target.value)} /></label>
                  <label className="block"><span className="ui-label">配偶姓名</span><input className={inputClass} value={form.spouseName} onChange={event => updateForm('spouseName', event.target.value)} /></label>
                  <label className="block"><span className="ui-label">配偶籍贯</span><input className={inputClass} value={form.spouseOrigin} onChange={event => updateForm('spouseOrigin', event.target.value)} /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block"><span className="ui-label">配偶出生</span><input type="date" className={inputClass} value={form.spouseBirthDate} onChange={event => updateForm('spouseBirthDate', event.target.value)} /></label>
                    <label className="block"><span className="ui-label">配偶逝世</span><input type="date" className={inputClass} value={form.spouseDeathDate} onChange={event => updateForm('spouseDeathDate', event.target.value)} /></label>
                  </div>
                  <label className="block"><span className="ui-label">备注</span><textarea className={inputClass} rows={3} value={form.notes} onChange={event => updateForm('notes', event.target.value)} /></label>
                </>
              )}
              {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
            </div>
          ) : (
            <>
              {isSpouse ? (
                <>
                  {row('姓名', node.spouse_name)}
                  {row('配偶', node.name)}
                  {row('籍贯', node.spouse_origin)}
                  {row('出生', node.spouse_birth_date)}
                  {row('逝世', node.spouse_death_date)}
                </>
              ) : (
                <>
                  {row('同辈排行', node.sibling_rank ? `第${node.sibling_rank}位` : '')}
                  {row('家庭排序', node.family_rank ? `第${node.family_rank}位` : '')}
                  {row('出生', node.birth_date)}
                  {row('逝世', node.death_date)}
                  {row('电话', node.phone)}
                  {row('邮箱', node.email)}
                  {row('地址', node.address)}
                  {row('职业', node.occupation)}
                  {row('学历', node.education)}
                  {row('简介', node.bio)}
                  {row('配偶', node.spouse_name)}
                  {row('配偶籍贯', node.spouse_origin)}
                  {row('备注', node.notes)}
                  {row('子女数', node.children.length ? `${node.children.length} 人` : '')}
                </>
              )}
            </>
          )}
          {!editing && canEdit && !isSpouse && (
            <SiblingOrderControl members={members} parentId={node.parent_id} onReorder={reorderMembers} />
          )}
        </div>

        <div className="foot">
          {editing ? (
            <>
              <button type="button" className="ui-btn-primary flex-1" onClick={() => void save()} disabled={saving}><Save className="h-4 w-4" />{saving ? '保存中…' : '保存'}</button>
              <button type="button" className="ui-btn-outline flex-1" onClick={() => setEditing(false)} disabled={saving}>取消</button>
            </>
          ) : (
            <>
              <button type="button" className="ui-btn-primary flex-1" onClick={onCenter}>居中显示</button>
              {!isSpouse && node.children.length > 0 && (
                <button type="button" className="ui-btn-outline flex-1" onClick={onFold}>{collapsed ? '展开此代' : '折叠此代'}</button>
              )}
              {canEdit && (
                <button type="button" className="ui-btn-outline" onClick={() => setEditing(true)} aria-label={`编辑${name}`}><Edit3 className="h-4 w-4" />编辑</button>
              )}
              {canEdit && !isSpouse && (
                <button type="button" className="ui-btn-outline" onClick={() => setChildrenOpen(true)} aria-label={`为${name}添加子女`}><Plus className="h-4 w-4" />子女</button>
              )}
            </>
          )}
        </div>
      </aside>
      {childrenOpen && (
        <BatchChildrenModal user={user} parentIds={[node.id]} isOpen onClose={() => setChildrenOpen(false)} />
      )}
    </>
  );
};

export default MemberPanel;
