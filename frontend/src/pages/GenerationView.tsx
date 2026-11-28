import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FamilyMember, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { useUserRole } from '../hooks/useUserRole';
import { ROUTES, memberEditPath } from '../routes';
import { genderTint, genderSym, yearsText } from './tree/shared';
import {
  Users, ChevronDown, Search, ZoomIn, ZoomOut, Maximize2, ChevronUp, Menu, X, Edit2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageError } from '../components/Feedback';

interface GenerationGroup {
  generation: number;
  generationChar: string;
  members: FamilyMember[];
}

const MemberCard: React.FC<{ member: FamilyMember; canEdit: boolean }> = React.memo(({ member, canEdit }) => {
  const spouseSub = member.spouse_origin || yearsText(member.spouse_birth_date, member.spouse_death_date);

  return (
    <div data-member-id={member.id} className="generation-unit min-w-0 rounded-lg border border-slate-200 bg-paper-card p-2 transition-colors hover:border-cinnabar-300">
      <div className="generation-unit-row flex gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
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
            <div className="text-[10px] text-slate-400 mt-0.5 truncate num">{yearsText(member.birth_date, member.death_date)}</div>
          </div>
          {canEdit && (
            <Link to={memberEditPath(member.id)} className="ui-icon-btn flex-shrink-0" title="编辑">
              <Edit2 className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        {member.spouse_name && (
          <div className="generation-spouse w-[120px] flex-shrink-0 rounded-md border border-dashed border-slate-300 bg-paper px-2 py-1">
            <div className="text-[9px] text-slate-400 tracking-wider">配偶</div>
            <div className="generation-sp-name text-[13px] font-display font-semibold text-slate-700 truncate">{member.spouse_name}</div>
            <div className="generation-sp-sub text-[10px] text-slate-400 truncate">{spouseSub}</div>
          </div>
        )}
      </div>
    </div>
  );
});

export default function GenerationView({ user }: { user: User | null }) {
  const { members, loading, error, refresh } = useFamilyMembers(user?.id);
  const { canEditContent } = useUserRole(user);
  const [expandedGenerations, setExpandedGenerations] = useState<Set<number>>(new Set());
  const [scale, setScale] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const generations = useMemo(() => {
    const groups = new Map<number, GenerationGroup>();
    members.forEach(member => {
      if (!member.generation) return;
      const group = groups.get(member.generation) || {
        generation: member.generation,
        generationChar: member.generation_char || '',
        members: [],
      };
      group.members.push(member);
      groups.set(member.generation, group);
    });
    return [...groups.values()]
      .sort((a, b) => a.generation - b.generation)
      .map(group => ({
        ...group,
        members: group.members.sort((a, b) =>
          (a.family_rank || 0) - (b.family_rank || 0) || a.id - b.id),
      }));
  }, [members]);

  useEffect(() => {
    if (generations.length > 0 && !initialized) {
      setExpandedGenerations(new Set(generations.map(group => group.generation)));
      setInitialized(true);
    }
  }, [generations, initialized]);

  const toggleGeneration = useCallback((generation: number) => {
    setExpandedGenerations(previous => {
      const next = new Set(previous);
      if (next.has(generation)) next.delete(generation);
      else next.add(generation);
      return next;
    });
  }, []);

  const selectGeneration = useCallback((generation: number) => {
    setSelectedGeneration(generation);
    setExpandedGenerations(new Set([generation]));
    setMobileNavOpen(false);
  }, []);

  const filteredGenerations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return generations;
    return generations.map(group => ({
      ...group,
      members: group.members.filter(member => member.name.toLowerCase().includes(term)),
    })).filter(group => group.members.length > 0);
  }, [generations, searchTerm]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setSelectedGeneration(null);
    if (term.trim()) setExpandedGenerations(new Set(generations.map(group => group.generation)));
  };

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cinnabar-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-3 lg:items-start">
      {error && <PageError message={error} onRetry={() => void refresh()} />}
      <aside className={`w-full lg:w-52 flex-shrink-0 ${mobileNavOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="ui-card lg:sticky lg:top-16">
          <div className="ui-head">
            <Users className="w-4 h-4 text-cinnabar-600" />
            <h2 className="ui-title">世代导航</h2>
            <button type="button" onClick={() => setMobileNavOpen(false)} className="ui-icon-btn ml-auto lg:hidden" aria-label="关闭世代导航">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-1.5 space-y-0.5 max-h-[52vh] overflow-y-auto">
            {generations.map(group => (
              <button type="button" key={group.generation} onClick={() => selectGeneration(group.generation)}
                className={`w-full flex items-center gap-2 px-2 h-8 rounded-md text-[13px] transition-colors ${
                  selectedGeneration === group.generation ? 'bg-cinnabar-50 text-cinnabar-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                }`}>
                <span className="seal w-5 h-5 text-[11px]">{group.generationChar || group.generation}</span>
                <span className="num">第{group.generation}世</span>
                <span className="ml-auto text-[11px] text-slate-400 num">{group.members.length}人</span>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-slate-100 flex gap-1.5">
            <button type="button" onClick={() => { setExpandedGenerations(new Set(generations.map(group => group.generation))); setSelectedGeneration(null); }}
              className="ui-btn-outline h-7 flex-1 text-xs">展开全部</button>
            <button type="button" onClick={() => { setExpandedGenerations(new Set()); setSelectedGeneration(null); }}
              className="ui-btn-outline h-7 flex-1 text-xs">收起全部</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="rise ui-card p-2 flex items-center gap-2">
          <button type="button" onClick={() => setMobileNavOpen(true)} className="ui-icon-btn lg:hidden" aria-label="打开世代导航">
            <Menu className="w-4 h-4" />
          </button>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="搜索姓名..." value={searchTerm} onChange={event => handleSearch(event.target.value)}
              className="ui-input h-8 pl-8" />
          </div>
          <div className="ml-auto flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-paper-card">
            <button type="button" onClick={() => setScale(previous => Math.max(previous - 0.1, 0.6))} className="ui-icon-btn" aria-label="缩小"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="px-1 text-xs font-medium text-slate-600 min-w-[40px] text-center num">{Math.round(scale * 100)}%</span>
            <button type="button" onClick={() => setScale(previous => Math.min(previous + 0.1, 1.5))} className="ui-icon-btn" aria-label="放大"><ZoomIn className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => setScale(1)} className="ui-icon-btn" title="重置" aria-label="重置缩放"><Maximize2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {members.length === 0 ? (
            <div className="ui-card py-12 flex flex-col items-center gap-3 text-slate-500">
              <span className="seal w-12 h-12 text-xl">谱</span>
              <p className="text-sm">暂无家谱数据</p>
              <Link to={ROUTES.memberNew} className="ui-btn-primary">添加第一位家人</Link>
            </div>
          ) : filteredGenerations.length === 0 ? (
            <div className="ui-card py-12 flex flex-col items-center gap-3 text-slate-500">
              <span className="seal w-12 h-12 text-xl">寻</span>
              <p className="text-sm">没有匹配「{searchTerm}」的家人</p>
              <button type="button" onClick={() => setSearchTerm('')} className="ui-btn-outline">清空搜索</button>
            </div>
          ) : (
            <div className="lg:columns-2 lg:gap-3">
              {filteredGenerations.map((group, index) => (
                <section key={group.generation} className="rise ui-card generation-gen mb-3 break-inside-avoid" style={{ '--d': `${Math.min(index * 60, 300)}ms` } as React.CSSProperties}>
                  <div className="ui-head">
                    <span className="seal w-7 h-7 text-sm">{group.generationChar || group.generation}</span>
                    <div className="min-w-0"><h3 className="ui-title">第{group.generation}世</h3></div>
                    <span className="text-[11px] text-slate-400">{group.generationChar}字辈 · {group.members.length}人</span>
                    <button type="button" onClick={() => toggleGeneration(group.generation)} className="ui-icon-btn ml-auto"
                      aria-label={`${expandedGenerations.has(group.generation) ? '收起' : '展开'}第${group.generation}世`}>
                      {expandedGenerations.has(group.generation) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {expandedGenerations.has(group.generation) && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="generation-grid p-2">
                          {group.members.map(member => <MemberCard key={member.id} member={member} canEdit={canEditContent} />)}
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
  );
}
