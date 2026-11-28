import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, PieChart, Image, UserPlus, ArrowRight, Network, ScrollText, BookOpen, Cake } from 'lucide-react';
import { User } from '../types';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { useUserRole } from '../hooks/useUserRole';
import { useGallery } from '../hooks/useGallery';
import Layout from '../components/Layout';
import { InlineNotice } from '../components/Feedback';
import { ROUTES } from '../routes';
import { genderTint } from './tree/shared';
import { upcomingBirthdays } from '../utils/calendar';

const GEN_HUES = ['#B93A26', '#C9972C', '#3E8763', '#357F7E', '#2563EB', '#9C3240'];

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

const StatCell: React.FC<{ label: string; value: number; sub: React.ReactNode }> = ({ label, value, sub }) => {
  const count = useCountUp(value);
  return (
    <div className="bg-paper-card px-3 py-2.5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="font-display text-2xl font-bold text-slate-900 num leading-tight">{count}</p>
      <div className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</div>
    </div>
  );
};

export default function DashboardPage({ user }: { user: User | null }) {
  const { members, generationChars, loading: membersLoading, error: membersError, refresh: refreshMembers } = useFamilyMembers(user?.id);
  const { canEditContent, isAdmin } = useUserRole(user);
  const { images, loading: galleryLoading, error: galleryError, refresh: refreshGallery } = useGallery();

  const stats = useMemo(() => {
    const generations = members.map(member => member.generation).filter((generation): generation is number => Boolean(generation));
    const male = members.filter(member => member.gender === 'male').length;
    const female = members.filter(member => member.gender === 'female').length;
    const surnames = new Map<string, number>();
    members.forEach(member => surnames.set(member.name.slice(0, 1), (surnames.get(member.name.slice(0, 1)) || 0) + 1));
    const surname = [...surnames.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '家';
    const ids = new Set(members.map(member => member.id));
    return {
      total: members.length,
      male,
      female,
      surname,
      roots: members.filter(member => !member.parent_id || !ids.has(member.parent_id)).length,
      spouses: members.filter(member => member.spouse_name).length,
      genCount: new Set(generations).size,
      genMin: generations.length ? Math.min(...generations) : 0,
      genMax: generations.length ? Math.max(...generations) : 0,
      approved: images.filter(image => image.status === 'approved').length,
      pending: images.filter(image => image.status === 'pending').length,
    };
  }, [members, images]);

  const genGroups = useMemo(() => {
    const groups = new Map<number, { count: number; char: string; firstId: number }>();
    members.forEach(member => {
      if (!member.generation) return;
      const group = groups.get(member.generation) || { count: 0, char: '', firstId: member.id };
      group.count++;
      groups.set(member.generation, group);
    });
    generationChars.forEach(char => {
      const group = groups.get(char.generation);
      if (group) group.char = char.char;
    });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([generation, group]) => ({ generation, ...group }));
  }, [members, generationChars]);

  const maxGen = Math.max(1, ...genGroups.map(group => group.count));
  const poem = useMemo(() => [...generationChars].sort((a, b) => a.generation - b.generation).map(char => char.char).join(' '), [generationChars]);
  const recentMembers = useMemo(() => [...members]
    .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
    .slice(0, 5), [members]);
  const birthdayReminders = useMemo(() => upcomingBirthdays(members), [members]);

  const quickActions = [
    { label: '家谱图谱', icon: PieChart, path: ROUTES.graph, primary: true, editorOnly: false },
    { label: '添加家人', icon: UserPlus, path: ROUTES.memberNew, primary: false, editorOnly: true },
    { label: '上传照片', icon: Image, path: ROUTES.gallery, primary: false, editorOnly: false },
    { label: '成员管理', icon: Users, path: ROUTES.members, primary: false, editorOnly: false },
  ];

  return (
    <Layout user={user} title="首页">
      <div className="max-w-[1400px] mx-auto space-y-3">
        {membersError && <InlineNotice message={membersError} onRetry={() => void refreshMembers()} />}
        {galleryError && <InlineNotice message={galleryError} onRetry={() => void refreshGallery()} />}

        <div className="rise flex flex-wrap items-center gap-3" style={{ '--d': '0ms' } as React.CSSProperties}>
          <span className="seal w-10 h-10 text-xl">{stats.surname}</span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-slate-900 tracking-wide leading-tight">
              {stats.surname}氏家谱
              <span className="ml-2 text-xs font-sans font-normal text-slate-500 num">{stats.total ? `第${stats.genMin}世 – 第${stats.genMax}世 · ${stats.total} 人` : '尚未录入成员'}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              <span className="text-cinnabar-700 font-medium">字辈</span>
              <span className="ml-2 font-display tracking-[.18em] text-slate-700">{poem || '—'}</span>
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {quickActions.filter(action => !action.editorOnly || canEditContent).map(action => (
              <Link key={action.path} to={action.path}
                className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium transition-all hover:-translate-y-px ${
                  action.primary
                    ? 'bg-cinnabar-600 text-paper-card shadow-card hover:bg-cinnabar-700'
                    : 'bg-paper-card border border-slate-200 text-slate-700 hover:border-cinnabar-300 hover:text-cinnabar-700'
                }`}>
                <action.icon className="w-3.5 h-3.5" />{action.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="rise ui-card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-200" style={{ '--d': '60ms' } as React.CSSProperties}>
          <StatCell label="成员" value={stats.total} sub={
            <span className="flex items-center gap-1.5">
              <span className="flex-1 h-1.5 rounded-full bg-pink-200 overflow-hidden">
                <span className="block h-full bg-blue-400" style={{ width: `${stats.total ? (stats.male / stats.total) * 100 : 0}%` }} />
              </span>
              <span className="num">男{stats.male} 女{stats.female}</span>
            </span>
          } />
          <StatCell label="世代" value={stats.genCount} sub={stats.total ? `第${stats.genMin}世 – 第${stats.genMax}世` : '尚未录入世代'} />
          <StatCell label="字辈" value={generationChars.length} sub={poem ? poem.replace(/ /g, '·') : '未配置'} />
          <StatCell label="图册" value={stats.approved} sub={stats.pending > 0 ? `${stats.pending} 张待审` : '全部已审核'} />
          <StatCell label="支系" value={stats.roots} sub="同源共祖 · 分支开枝" />
          <StatCell label="配偶" value={stats.spouses} sub="姻亲 · 独立成卡" />
        </div>

        {isAdmin && stats.pending > 0 && (
          <Link to={ROUTES.gallery} className="rise ui-card flex items-center gap-3 px-4 py-3 hover:border-gilt-400" style={{ '--d': '90ms' } as React.CSSProperties}>
            <span className="seal w-8 h-8 text-sm">审</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">有 {stats.pending} 张照片等待审核</p>
              <p className="text-xs text-slate-500">审核通过后会展示在家族图册中</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gilt-600" />
          </Link>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 items-start">
          <section className="rise ui-card" style={{ '--d': '120ms' } as React.CSSProperties}>
            <div className="ui-head">
              <Network className="w-4 h-4 text-cinnabar-600" />
              <h2 className="ui-title">世系分布</h2>
              <span className="hidden sm:inline text-[11px] text-slate-400">点击世代可在图谱中定位</span>
              <Link to={ROUTES.graph} className="ml-auto text-xs text-cinnabar-700 hover:underline flex items-center gap-1">图谱全图 <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="p-2 space-y-0.5">
              {membersLoading ? (
                <div className="h-24 flex items-center justify-center text-xs text-slate-400">加载中…</div>
              ) : genGroups.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-xs text-slate-400">暂无成员数据</div>
              ) : genGroups.map((group, index) => (
                <Link key={group.generation} to={`${ROUTES.graph}?focus=${group.firstId}`}
                  className="w-full flex items-center gap-2 h-7 px-1.5 rounded-md hover:bg-slate-50 transition-colors">
                  <span className="w-14 text-xs text-slate-600 num flex-shrink-0">第{group.generation}世</span>
                  <span className="seal w-5 h-5 text-[11px]">{group.char || '·'}</span>
                  <span className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <span className="block h-full rounded-full" style={{ width: `${(group.count / maxGen) * 100}%`, background: GEN_HUES[index % GEN_HUES.length] }} />
                  </span>
                  <span className="w-9 text-right text-xs text-slate-600 num flex-shrink-0">{group.count}人</span>
                </Link>
              ))}
            </div>
          </section>

          <div className="space-y-3">
            <section className="rise ui-card" style={{ '--d': '130ms' } as React.CSSProperties}>
              <div className="ui-head">
                <Cake className="w-4 h-4 text-cinnabar-600" />
                <h2 className="ui-title">生日提醒</h2>
                <span className="ml-auto text-[11px] text-slate-400">近一个月</span>
              </div>
              <div className="p-1.5 max-h-64 overflow-y-auto">
                {birthdayReminders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">近一个月暂无生日</div>
                ) : birthdayReminders.map(reminder => (
                  <Link key={reminder.member.id} to={`${ROUTES.graph}?focus=${reminder.member.id}`}
                    className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-cinnabar-50/70 transition-colors">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${genderTint(reminder.member.gender)}`}>{reminder.member.name.slice(-1)}</span>
                    <span className="w-20 truncate text-[13px] font-medium text-slate-800 flex-shrink-0">{reminder.member.name}</span>
                    <span className="flex-1 truncate text-xs text-slate-500">{reminder.label} · {reminder.date.slice(5).replace('-', '/')}</span>
                    <span className={`px-1.5 py-px rounded text-[10px] font-medium num flex-shrink-0 ${reminder.daysUntil === 0 ? 'bg-cinnabar-100 text-cinnabar-700' : 'bg-gilt-100 text-gilt-700'}`}>
                      {reminder.daysUntil === 0 ? '今天' : `${reminder.daysUntil}天后`}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rise ui-card" style={{ '--d': '140ms' } as React.CSSProperties}>
              <div className="ui-head"><Users className="w-4 h-4 text-cinnabar-600" /><h2 className="ui-title">最近更新</h2></div>
              <div className="p-1.5">
                {recentMembers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">暂无成员数据</div>
                ) : recentMembers.map(member => (
                  <Link key={member.id} to={`${ROUTES.graph}?focus=${member.id}`}
                    className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-cinnabar-50/70 transition-colors">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${genderTint(member.gender)}`}>{member.name.slice(-1)}</span>
                    <span className="w-20 truncate text-[13px] font-medium text-slate-800 flex-shrink-0">{member.name}</span>
                    <span className="px-1.5 py-px rounded bg-gilt-100 text-gilt-700 text-[10px] font-medium num flex-shrink-0">第{member.generation || '?'}世</span>
                    <span className="flex-1 truncate text-xs text-slate-500">{member.generation_char || '—'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  </Link>
                ))}
              </div>
              <Link to={ROUTES.members} className="mx-3 mb-3 mt-1 flex items-center justify-center gap-1 h-7 rounded-md border border-slate-200 text-xs text-slate-600 hover:border-cinnabar-300 hover:text-cinnabar-700">
                管理成员 <ArrowRight className="w-3 h-3" />
              </Link>
            </section>

            <section className="rise ui-card" style={{ '--d': '180ms' } as React.CSSProperties}>
              <div className="ui-head"><BookOpen className="w-4 h-4 text-cinnabar-600" /><h2 className="ui-title">家族资料</h2></div>
              <div className="p-2 space-y-1">
                {canEditContent && (
                  <Link to={ROUTES.generationChars} className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-slate-50">
                    <ScrollText className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700">字辈管理</span>
                    <span className="ml-auto text-xs text-slate-400 num">{generationChars.length} 世</span>
                  </Link>
                )}
                <Link to={ROUTES.gallery} className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-slate-50">
                  <Image className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700">家族图册</span>
                  <span className="ml-auto text-xs text-slate-400 num">{galleryLoading ? '…' : `${stats.approved} 张`}</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
