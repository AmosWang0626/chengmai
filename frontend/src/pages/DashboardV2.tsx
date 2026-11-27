import React, { useState, useEffect, useMemo } from 'react';
import { User, FamilyMember } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Users, PieChart, Image, UserPlus, Search, ChevronRight, ArrowRight, X, ScrollText, Network } from 'lucide-react';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { useUserRole } from '../hooks/useUserRole';
import { useGallery } from '../hooks/useGallery';
import Layout from '../components/Layout';
import ProtectedImage from '../components/ProtectedImage';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardV2Props {
  user: User | null;
}

/* 世系分布六色：朱砂/鎏金/ jade /黛青/靛蓝/绛紫，亮度错开并带直接数值标签 */
const GEN_HUES = ['#B93A26', '#C9972C', '#3E8763', '#357F7E', '#2563EB', '#9C3240'];

const genderTint = (g: FamilyMember['gender']) =>
  g === 'male' ? 'bg-blue-100 text-blue-700' : g === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-qing-100 text-qing-700';
const genderSym = (g: FamilyMember['gender']) => g === 'male' ? '♂' : g === 'female' ? '♀' : '○';

function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

const StatCell: React.FC<{ label: string; value: number; sub: React.ReactNode }> = ({ label, value, sub }) => {
  const n = useCountUp(value);
  return (
    <div className="bg-paper-card px-3 py-2.5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="font-display text-2xl font-bold text-slate-900 num leading-tight">{n}</p>
      <div className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</div>
    </div>
  );
};

const DashboardV2: React.FC<DashboardV2Props> = ({ user }) => {
  const navigate = useNavigate();
  const { members, generationChars, loading: membersLoading, error: membersError } = useFamilyMembers(user?.id);
  const { isAdmin } = useUserRole(user?.id);
  const { images, loading: galleryLoading, error: galleryError } = useGallery();
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<'recent' | 'generation' | 'name'>('recent');
  const [selected, setSelected] = useState<FamilyMember | null>(null);

  const byId = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);

  const stats = useMemo(() => {
    const gens = members.map(m => m.generation).filter((g): g is number => !!g);
    const male = members.filter(m => m.gender === 'male').length;
    const female = members.filter(m => m.gender === 'female').length;
    const surnameCount = new Map<string, number>();
    members.forEach(m => {
      const s = m.name.slice(0, 1);
      surnameCount.set(s, (surnameCount.get(s) || 0) + 1);
    });
    const surname = [...surnameCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '家';
    const roots = members.filter(m => !m.parent_id || !byId.has(m.parent_id)).length;
    return {
      total: members.length, male, female, roots, surname,
      spouses: members.filter(m => m.spouse_name).length,
      genCount: new Set(gens).size,
      genMin: gens.length ? Math.min(...gens) : 0,
      genMax: gens.length ? Math.max(...gens) : 0,
      approved: images.filter(i => i.status === 'approved').length,
      pending: images.filter(i => i.status === 'pending').length
    };
  }, [members, images, byId]);

  const genGroups = useMemo(() => {
    const map = new Map<number, { count: number; char: string; firstId: number }>();
    members.forEach(m => {
      if (!m.generation) return;
      const g = map.get(m.generation) || { count: 0, char: '', firstId: m.id };
      g.count++;
      map.set(m.generation, g);
    });
    generationChars.forEach(c => {
      const g = map.get(c.generation);
      if (g) g.char = c.char;
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([gen, g]) => ({ gen, ...g }));
  }, [members, generationChars]);
  const maxGen = Math.max(1, ...genGroups.map(g => g.count));

  const poem = useMemo(() =>
    [...generationChars].sort((a, b) => a.generation - b.generation).map(c => c.char).join(' '),
    [generationChars]);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    const list = q ? members.filter(m => m.name.toLowerCase().includes(q)) : [...members];
    if (sort === 'recent') list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    else if (sort === 'generation') list.sort((a, b) => (a.generation || 0) - (b.generation || 0) || (a.family_rank || 0) - (b.family_rank || 0));
    else list.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    return list;
  }, [members, term, sort]);

  const recentImages = useMemo(() => images.filter(i => i.status === 'approved').slice(-3), [images]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const focusInCanvas = (id: number) => navigate(`/tree-canvas?focus=${id}`);

  const quickActions = [
    { label: '家谱图谱', icon: PieChart, path: '/tree-canvas', primary: true },
    { label: '添加家人', icon: UserPlus, path: '/members/new', adminOnly: true },
    { label: '上传照片', icon: Image, path: '/gallery' },
    { label: '家人列表', icon: Users, path: '/members' }
  ];

  const drawerChildren = selected ? members.filter(m => m.parent_id === selected.id) : [];
  const drawerParent = selected?.parent_id ? byId.get(selected.parent_id) : undefined;

  const row = (k: string, v: React.ReactNode) =>
    v ? <div className="flex gap-2 py-1.5 border-b border-dashed border-slate-100 text-[13px]" key={k}>
      <span className="w-16 flex-shrink-0 text-slate-400">{k}</span>
      <span className="text-slate-700 break-all">{v}</span>
    </div> : null;

  return (
    <Layout user={user} title="首页">
      <div className="max-w-[1400px] mx-auto space-y-3">
        {(membersError || galleryError) && (
          <div className="px-3 py-1.5 rounded-lg bg-cinnabar-50 border border-cinnabar-200 text-xs text-cinnabar-700">
            {membersError || galleryError}
          </div>
        )}

        {/* 报头：族姓 + 字辈诗 + 快捷操作 */}
        <div className="rise flex flex-wrap items-center gap-3" style={{ '--d': '0ms' } as React.CSSProperties}>
          <span className="seal w-10 h-10 text-xl">{stats.surname}</span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-slate-900 tracking-wide leading-tight">
              {stats.surname}氏家谱
              <span className="ml-2 text-xs font-sans font-normal text-slate-500 num">
                第{stats.genMin}世 – 第{stats.genMax}世 · {stats.total} 人
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              <span className="text-cinnabar-700 font-medium">字辈</span>
              <span className="ml-2 font-display tracking-[.18em] text-slate-700">{poem || '—'}</span>
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {quickActions.filter(a => !a.adminOnly || isAdmin).map(a => (
              <Link key={a.path} to={a.path}
                className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium transition-all hover:-translate-y-px ${
                  a.primary
                    ? 'bg-cinnabar-600 text-paper-card shadow-card hover:bg-cinnabar-700'
                    : 'bg-paper-card border border-slate-200 text-slate-700 hover:border-cinnabar-300 hover:text-cinnabar-700'
                }`}>
                <a.icon className="w-3.5 h-3.5" />{a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 统计条：单卡五格，发丝分隔 */}
        <div className="rise ui-card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-200" style={{ '--d': '60ms' } as React.CSSProperties}>
          <StatCell label="成员" value={stats.total} sub={
            <span className="flex items-center gap-1.5">
              <span className="flex-1 h-1.5 rounded-full bg-pink-200 overflow-hidden">
                <span className="block h-full bg-blue-400" style={{ width: `${stats.total ? (stats.male / stats.total) * 100 : 0}%` }} />
              </span>
              <span className="num">男{stats.male} 女{stats.female}</span>
            </span>
          } />
          <StatCell label="世代" value={stats.genCount} sub={`第${stats.genMin}世 – 第${stats.genMax}世`} />
          <StatCell label="字辈" value={generationChars.length} sub={poem ? poem.replace(/ /g, '·') : '未配置'} />
          <StatCell label="图册" value={stats.approved} sub={
            stats.pending > 0
              ? <Link to="/gallery" className="text-gilt-700 font-medium hover:underline">{stats.pending} 张待审</Link>
              : '全部已审核'
          } />
          <StatCell label="支系" value={stats.roots} sub="同源共祖 · 分支开枝" />
          <StatCell label="配偶" value={stats.spouses} sub="姻亲 · 独立成卡" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 items-start">
          <div className="space-y-3 min-w-0">
            {/* 世系分布 */}
            <section className="rise ui-card" style={{ '--d': '120ms' } as React.CSSProperties}>
              <div className="ui-head">
                <Network className="w-4 h-4 text-cinnabar-600" />
                <h2 className="ui-title">世系分布</h2>
                <span className="text-[11px] text-slate-400">点击世代可在图谱中定位</span>
                <Link to="/tree-canvas" className="ml-auto text-xs text-cinnabar-700 hover:underline flex items-center gap-1">
                  图谱全图 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="p-2 space-y-0.5">
                {membersLoading ? (
                  <div className="h-24 flex items-center justify-center text-xs text-slate-400">加载中…</div>
                ) : genGroups.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-xs text-slate-400">暂无成员数据</div>
                ) : genGroups.map((g, i) => (
                  <button key={g.gen} onClick={() => focusInCanvas(g.firstId)}
                    className="w-full flex items-center gap-2 h-7 px-1.5 rounded-md hover:bg-slate-50 transition-colors text-left group">
                    <span className="w-14 text-xs text-slate-600 num flex-shrink-0">第{g.gen}世</span>
                    <span className="seal w-5 h-5 text-[11px]">{g.char || '·'}</span>
                    <span className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                      <span className="block h-full rounded-full transition-all duration-700 group-hover:opacity-80"
                        style={{ width: `${(g.count / maxGen) * 100}%`, background: GEN_HUES[i % GEN_HUES.length] }} />
                    </span>
                    <span className="w-9 text-right text-xs text-slate-600 num flex-shrink-0">{g.count}人</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 家人动态：搜索 + 排序 + 行点击抽屉 */}
            <section className="rise ui-card" style={{ '--d': '180ms' } as React.CSSProperties}>
              <div className="ui-head">
                <Users className="w-4 h-4 text-cinnabar-600" />
                <h2 className="ui-title">家人动态</h2>
                <span className="text-[11px] text-slate-400 num">{filtered.length}/{members.length}</span>
                <Link to="/members" className="ml-auto text-xs text-cinnabar-700 hover:underline flex items-center gap-1">
                  查看全部 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="px-3 py-2 flex gap-2 border-b border-slate-100">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={term} onChange={e => setTerm(e.target.value)} placeholder="搜索姓名…"
                    className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-slate-200 bg-paper outline-none focus:border-cinnabar-400 focus:ring-2 focus:ring-cinnabar-100" />
                </div>
                <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
                  className="h-7 px-1.5 text-xs rounded-md border border-slate-200 bg-paper-card text-slate-600 outline-none focus:border-cinnabar-400">
                  <option value="recent">最近录入</option>
                  <option value="generation">世代排序</option>
                  <option value="name">姓名排序</option>
                </select>
              </div>
              <div className="max-h-[292px] overflow-y-auto p-1.5 space-y-0.5">
                {membersLoading ? (
                  <div className="h-24 flex items-center justify-center text-xs text-slate-400">加载中…</div>
                ) : filtered.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <p>没有匹配「{term}」的家人</p>
                    <button onClick={() => setTerm('')} className="mt-2 px-2.5 h-6 rounded-md border border-slate-200 text-slate-600 hover:border-cinnabar-300 hover:text-cinnabar-700">清空筛选</button>
                  </div>
                ) : filtered.slice(0, 40).map(m => (
                  <button key={m.id} onClick={() => setSelected(m)}
                    className="w-full flex items-center gap-2 h-9 px-1.5 rounded-lg hover:bg-cinnabar-50/70 transition-colors text-left">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${genderTint(m.gender)}`}>
                      {m.name.slice(-1)}
                    </span>
                    <span className="w-20 truncate text-[13px] font-medium text-slate-800 flex-shrink-0">{m.name}</span>
                    <span className="text-[11px] text-slate-400 flex-shrink-0">{genderSym(m.gender)}</span>
                    <span className="px-1.5 py-px rounded bg-gilt-100 text-gilt-700 text-[10px] font-medium num flex-shrink-0">第{m.generation || '?'}世</span>
                    {m.generation_char && <span className="px-1.5 py-px rounded bg-cinnabar-50 text-cinnabar-700 text-[10px] font-medium flex-shrink-0">{m.generation_char}</span>}
                    <span className="flex-1 truncate text-xs text-slate-500">
                      {m.parent_id && byId.get(m.parent_id) ? `${byId.get(m.parent_id)!.gender === 'female' ? '母' : '父'}：${byId.get(m.parent_id)!.name}` : '始祖支系'}
                    </span>
                    <span className="text-[11px] text-slate-400 num flex-shrink-0">{(m.created_at || '').slice(5, 10) || '—'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-3 min-w-0">
            {/* 字辈表 */}
            <section className="rise ui-card" style={{ '--d': '140ms' } as React.CSSProperties}>
              <div className="ui-head">
                <ScrollText className="w-4 h-4 text-cinnabar-600" />
                <h2 className="ui-title">字辈表</h2>
                <Link to="/generation-chars" className="ml-auto text-xs text-cinnabar-700 hover:underline">管理</Link>
              </div>
              <div className="max-h-[228px] overflow-y-auto py-1">
                {genGroups.length === 0 ? (
                  <div className="h-16 flex items-center justify-center text-xs text-slate-400">暂无字辈</div>
                ) : genGroups.map(g => (
                  <button key={g.gen} onClick={() => focusInCanvas(g.firstId)}
                    className="w-full flex items-center gap-2 h-8 px-3 hover:bg-slate-50 transition-colors text-left">
                    <span className="seal w-6 h-6 text-[13px]">{g.char || '·'}</span>
                    <span className="text-xs text-slate-600 num">第{g.gen}世</span>
                    <span className="ml-auto text-xs text-slate-500 num">{g.count}人</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 图册掠影 */}
            <section className="rise ui-card" style={{ '--d': '200ms' } as React.CSSProperties}>
              <div className="ui-head">
                <Image className="w-4 h-4 text-cinnabar-600" />
                <h2 className="ui-title">图册掠影</h2>
                {isAdmin && stats.pending > 0 && (
                  <Link to="/gallery" className="ml-auto px-1.5 py-px rounded bg-gilt-100 text-gilt-700 text-[11px] font-medium hover:bg-gilt-200">
                    {stats.pending} 待审
                  </Link>
                )}
              </div>
              <div className="p-3">
                {galleryLoading ? (
                  <div className="h-20 flex items-center justify-center text-xs text-slate-400">加载中…</div>
                ) : recentImages.length === 0 ? (
                  <div className="h-20 flex flex-col items-center justify-center gap-1 text-xs text-slate-400">
                    <Image className="w-6 h-6 text-slate-300" />
                    <p>暂无已审核照片</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {recentImages.map(img => (
                      <button key={img.id} onClick={() => navigate('/gallery')}
                        className="aspect-square rounded-lg overflow-hidden bg-slate-100 group">
                        <ProtectedImage src={img.thumbnail_url || img.url} alt={img.title || '家族照片'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </button>
                    ))}
                  </div>
                )}
                <Link to="/gallery" className="mt-2 flex items-center justify-center gap-1 h-7 rounded-md border border-slate-200 text-xs text-slate-600 hover:border-cinnabar-300 hover:text-cinnabar-700 transition-colors">
                  进入图册 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* 家人详情抽屉 */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] z-40" onClick={() => setSelected(null)} />
            <motion.aside initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} transition={{ type: 'tween', duration: .25, ease: [0.22, 0.61, 0.36, 1] }}
              className="fixed right-0 top-0 bottom-0 w-[320px] max-w-[92vw] z-50 bg-paper-card border-l border-slate-200 shadow-lift flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-display text-lg font-bold ${genderTint(selected.gender)}`}>
                  {selected.name.slice(-1)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-slate-900 truncate">{selected.name}</h3>
                  <div className="flex gap-1 mt-0.5">
                    <span className="px-1.5 py-px rounded bg-gilt-100 text-gilt-700 text-[10px] font-medium num">第{selected.generation || '?'}世</span>
                    {selected.generation_char && <span className="px-1.5 py-px rounded bg-cinnabar-50 text-cinnabar-700 text-[10px] font-medium">{selected.generation_char}字辈</span>}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="ml-auto w-7 h-7 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {row('性别', selected.gender === 'male' ? '男' : selected.gender === 'female' ? '女' : '其他')}
                {row('同辈排行', selected.sibling_rank ? `第${selected.sibling_rank}位` : '')}
                {row('家庭排序', selected.family_rank ? `第${selected.family_rank}位` : '')}
                {row('出生', selected.birth_date)}
                {row('逝世', selected.death_date)}
                {row('配偶', selected.spouse_name)}
                {row(drawerParent?.gender === 'female' ? '母亲' : '父亲', drawerParent?.name)}
                {row('子女', drawerChildren.length ? drawerChildren.map(c => c.name).join('、') : '')}
                {row('电话', selected.phone)}
                {row('地址', selected.address)}
                {row('职业', selected.occupation)}
                {row('学历', selected.education)}
                {row('简介', selected.bio)}
                {row('备注', selected.notes)}
              </div>
              <div className="p-3 border-t border-slate-100 flex gap-2">
                <button onClick={() => focusInCanvas(selected.id)}
                  className="flex-1 h-8 rounded-lg bg-cinnabar-600 text-paper-card text-[13px] font-medium hover:bg-cinnabar-700 transition-colors inline-flex items-center justify-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5" />图谱定位
                </button>
                {isAdmin && (
                  <Link to={`/members/edit/${selected.id}`}
                    className="flex-1 h-8 rounded-lg border border-slate-200 text-slate-700 text-[13px] hover:border-cinnabar-300 hover:text-cinnabar-700 transition-colors inline-flex items-center justify-center">
                    编辑
                  </Link>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default DashboardV2;