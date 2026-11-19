import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { useUserRole } from '../hooks/useUserRole';
import { TreeNode } from '../types';
import {
  Users, ChevronDown, ChevronRight, Search,
  ZoomIn, ZoomOut, Maximize2, ChevronUp, Menu, X, Edit2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

interface FamilyTreeV2Props {
  user: User | null;
}

interface GenerationGroup {
  generation: number;
  generationChar: string;
  members: TreeNode[];
}

const genderTint = (g: string | null) =>
  g === 'male' ? 'bg-blue-100 text-blue-700' : g === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-qing-100 text-qing-700';
const genderSym = (g: string | null) => g === 'male' ? '♂' : g === 'female' ? '♀' : '○';
const yearsText = (b: string | null, d: string | null) => {
  const y = (s: string | null) => s ? String(s).slice(0, 4) : '';
  const by = y(b), dy = y(d);
  if (by && dy) return `${by} – ${dy}`;
  if (by) return `${by} –`;
  if (dy) return `– ${dy}`;
  return '';
};

interface MemberCardProps {
  member: TreeNode;
  expandedMembers: Set<number>;
  onToggleMember: (id: number) => void;
  isAdmin: boolean;
}

/* 夫妻双卡单元：配偶独立成卡，子女嵌套展开 */
const MemberCard: React.FC<MemberCardProps> = React.memo(({ member, expandedMembers, onToggleMember, isAdmin }) => {
  const isExpanded = expandedMembers.has(member.id);
  const hasChildren = member.children.length > 0;
  const spouseSub = member.spouse_origin || yearsText(member.spouse_birth_date, member.spouse_death_date);

  return (
    <div className="v2-unit min-w-0 rounded-lg border border-slate-200 bg-paper-card p-2 transition-colors hover:border-cinnabar-300">
      <div className="v2-unit-row flex gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2.5 cursor-pointer" onClick={() => hasChildren && onToggleMember(member.id)}>
          <span className={`w-10 h-10 rounded-md flex items-center justify-center text-base font-bold flex-shrink-0 ${genderTint(member.gender)}`}>
            {member.name.slice(-1)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-slate-800 truncate">{member.name}</span>
              <span className="text-[11px] text-slate-400">{genderSym(member.gender)}</span>
              {member.death_date && <span className="ui-chip bg-slate-100 text-slate-500">故</span>}
            </div>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className="ui-chip bg-gilt-100 text-gilt-700 num">第{member.generation}世</span>
              {member.generation_char && <span className="ui-chip bg-cinnabar-50 text-cinnabar-700">{member.generation_char}字辈</span>}
              <span className="ui-chip bg-qing-100 text-qing-700 num">行{member.sibling_rank || member.family_rank || '—'}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate num">
              {yearsText(member.birth_date, member.death_date) || '生卒未知'}
              {hasChildren && ` · ${member.children.length} 子女`}
            </div>
          </div>
          {hasChildren && (
            <button className="ui-icon-btn flex-shrink-0" onClick={e => { e.stopPropagation(); onToggleMember(member.id); }}>
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
          {isAdmin && (
            <Link to={`/members/edit/${member.id}`} className="ui-icon-btn flex-shrink-0" title="编辑" onClick={e => e.stopPropagation()}>
              <Edit2 className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        {member.spouse_name && (
          <div className="v2-spouse w-[120px] flex-shrink-0 rounded-md border border-dashed border-slate-300 bg-paper px-2 py-1">
            <div className="text-[9px] text-slate-400 tracking-wider">配偶</div>
            <div className="v2-sp-name text-[13px] font-display font-semibold text-slate-700 truncate">{member.spouse_name}</div>
            <div className="v2-sp-sub text-[10px] text-slate-400 truncate">{spouseSub || '—'}</div>
          </div>
        )}
      </div>
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="ml-3 mt-1.5 pl-3 border-l-2 border-cinnabar-200 space-y-1 overflow-hidden">
            {member.children.map(child => (
              <MemberCard key={child.id} member={child} expandedMembers={expandedMembers}
                onToggleMember={onToggleMember} isAdmin={isAdmin} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

const FamilyTreeV2: React.FC<FamilyTreeV2Props> = ({ user }) => {
  const { tree, loading } = useFamilyMembers(user?.id);
  const { isAdmin } = useUserRole(user?.id);
  const [expandedGenerations, setExpandedGenerations] = useState<Set<number>>(new Set());
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set());
  const [scale, setScale] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const generations = useMemo(() => {
    const genMap = new Map<number, GenerationGroup>();
    const collect = (nodes: TreeNode[]) => nodes.forEach(node => {
      if (!genMap.has(node.generation!)) {
        genMap.set(node.generation!, { generation: node.generation!, generationChar: node.generation_char || '', members: [] });
      }
      genMap.get(node.generation!)!.members.push(node);
      collect(node.children);
    });
    collect(tree);
    return Array.from(genMap.values()).sort((a, b) => a.generation - b.generation);
  }, [tree]);

  useEffect(() => {
    if (generations.length > 0 && !initialized) {
      setExpandedGenerations(new Set(generations.map(g => g.generation)));
      setInitialized(true);
    }
  }, [generations, initialized]);

  const toggleGeneration = useCallback((gen: number) => {
    setExpandedGenerations(prev => {
      const next = new Set(prev);
      if (next.has(gen)) next.delete(gen);
      else next.add(gen);
      return next;
    });
  }, []);

  const selectGeneration = useCallback((gen: number) => {
    setSelectedGeneration(gen);
    setExpandedGenerations(new Set([gen]));
    setExpandedMembers(new Set());
    setMobileNavOpen(false);
  }, []);

  const toggleMember = useCallback((id: number) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredGenerations = useMemo(() => {
    if (!searchTerm) return generations;
    return generations.map(gen => ({
      ...gen,
      members: gen.members.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
    })).filter(gen => gen.members.length > 0);
  }, [generations, searchTerm]);

  if (loading) {
    return (
      <Layout user={user} title="世代分组">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cinnabar-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} title="世代分组">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-3 lg:items-start">
        <aside className={`w-full lg:w-52 flex-shrink-0 ${mobileNavOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="ui-card lg:sticky lg:top-16">
            <div className="ui-head">
              <Users className="w-4 h-4 text-cinnabar-600" />
              <h2 className="ui-title">世代导航</h2>
              <button onClick={() => setMobileNavOpen(false)} className="ui-icon-btn ml-auto lg:hidden">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-1.5 space-y-0.5 max-h-[52vh] overflow-y-auto">
              {generations.map(gen => (
                <button key={gen.generation} onClick={() => selectGeneration(gen.generation)}
                  className={`w-full flex items-center gap-2 px-2 h-8 rounded-md text-[13px] transition-colors ${
                    selectedGeneration === gen.generation ? 'bg-cinnabar-50 text-cinnabar-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                  }`}>
                  <span className="seal w-5 h-5 text-[11px]">{gen.generationChar || gen.generation}</span>
                  <span className="num">第{gen.generation}世</span>
                  <span className="ml-auto text-[11px] text-slate-400 num">{gen.members.length}人</span>
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-slate-100 flex gap-1.5">
              <button onClick={() => setExpandedGenerations(new Set(generations.map(g => g.generation)))} className="ui-btn-outline h-7 flex-1 text-xs">展开全部</button>
              <button onClick={() => { setExpandedGenerations(new Set()); setExpandedMembers(new Set()); }} className="ui-btn-outline h-7 flex-1 text-xs">收起全部</button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="rise ui-card p-2 flex items-center gap-2">
            <button onClick={() => setMobileNavOpen(true)} className="ui-icon-btn lg:hidden">
              <Menu className="w-4 h-4" />
            </button>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" placeholder="搜索姓名..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="ui-input h-8 pl-8" />
            </div>
            <div className="ml-auto flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-paper-card">
              <button onClick={() => setScale(p => Math.max(p - 0.1, 0.6))} className="ui-icon-btn"><ZoomOut className="w-3.5 h-3.5" /></button>
              <span className="px-1 text-xs font-medium text-slate-600 min-w-[40px] text-center num">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(p => Math.min(p + 0.1, 1.5))} className="ui-icon-btn"><ZoomIn className="w-3.5 h-3.5" /></button>
              <button onClick={() => setScale(1)} className="ui-icon-btn" title="重置"><Maximize2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {tree.length === 0 ? (
              <div className="ui-card py-12 flex flex-col items-center gap-3 text-slate-500">
                <span className="seal w-12 h-12 text-xl">谱</span>
                <p className="text-sm">暂无家谱数据</p>
                <Link to="/members/new" className="ui-btn-primary">添加第一位家人</Link>
              </div>
            ) : filteredGenerations.length === 0 ? (
              <div className="ui-card py-12 flex flex-col items-center gap-3 text-slate-500">
                <span className="seal w-12 h-12 text-xl">寻</span>
                <p className="text-sm">没有匹配「{searchTerm}」的家人</p>
                <button onClick={() => setSearchTerm('')} className="ui-btn-outline">清空搜索</button>
              </div>
            ) : (
              <div className="lg:columns-2 lg:gap-3">
                {filteredGenerations.map((gen, gi) => (
                  <section key={gen.generation} className="rise ui-card v2-gen mb-3 break-inside-avoid" style={{ '--d': `${Math.min(gi * 60, 300)}ms` } as React.CSSProperties}>
                    <div className="ui-head">
                      <span className="seal w-7 h-7 text-sm">{gen.generationChar || gen.generation}</span>
                      <div className="min-w-0">
                        <h3 className="ui-title">第{gen.generation}世</h3>
                      </div>
                      <span className="text-[11px] text-slate-400">{gen.generationChar}字辈 · {gen.members.length}人</span>
                      <button onClick={() => toggleGeneration(gen.generation)} className="ui-icon-btn ml-auto">
                        {expandedGenerations.has(gen.generation) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                    <AnimatePresence>
                      {expandedGenerations.has(gen.generation) && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden">
                          <div className="v2-grid p-2">
                            {gen.members.map(member => (
                              <MemberCard key={member.id} member={member} expandedMembers={expandedMembers}
                                onToggleMember={toggleMember} isAdmin={isAdmin} />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FamilyTreeV2;