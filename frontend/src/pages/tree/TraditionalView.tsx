import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronsUp, ChevronsDown } from 'lucide-react';
import { User } from '../../types';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import MemberPanel from '../../components/MemberPanel';
import { CNode, buildForest, layoutTree, unitWidth, descCount, genderSym, LayoutOpts, usePanZoom } from './shared';

interface TraditionalViewProps {
  user: User | null;
}

const yearsShort = (b: string | null, d: string | null) => {
  const y = (s: string | null) => s ? String(s).slice(0, 4) : '';
  const by = y(b), dy = y(d);
  if (by && dy) return `${by}–${dy}`;
  if (by) return `${by}–`;
  if (dy) return `–${dy}`;
  return '';
};

/* 传统图谱：谱页吊线为主体（竖排右起、墨线吊挂、印章题签），
   融合世系画布的夫妻双卡信息（婚线♥、生卒、性别、卡框）与折叠/详情/搜索能力 */
const TraditionalView: React.FC<TraditionalViewProps> = ({ user }) => {
  const { members, loading, error, generationChars } = useFamilyMembers(user?.id);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [font, setFont] = useState(15);
  const [gap, setGap] = useState(26);
  const [level, setLevel] = useState(250);
  const [showSpouse, setShowSpouse] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [frame, setFrame] = useState(true);
  const [term, setTerm] = useState('');
  const [panel, setPanel] = useState<{ id: string; spouse: boolean } | null>(null);
  const initRef = useRef(false);
  const pendingFocus = useRef<string | null>(null);

  const CW = 76, CH = 190, SW = 56, SH = 170, MGAP = 12, PAD = 70;
  const opts: LayoutOpts = useMemo(() => ({
    cw: CW, ch: CH, sw: showSpouse ? SW : 0, sh: SH, mgap: showSpouse ? MGAP : 0,
    gap, level, rootgap: 60, pad: PAD, mirror: true
  }), [showSpouse, gap, level]);
  const unitW = useCallback((n: CNode) => unitWidth(n, opts), [opts]);

  const placed = useMemo(() => {
    const roots = buildForest(members);
    const byId = new Map<string, CNode>();
    const collect = (n: CNode) => { byId.set(n.id, n); n.children.forEach(collect); };
    roots.forEach(collect);
    return { roots, byId, ...layoutTree(roots, collapsed, opts) };
  }, [members, collapsed, opts]);
  const placedRef = useRef(placed);
  placedRef.current = placed;

  const visible = useMemo(() => {
    const out: CNode[] = [];
    const walk = (n: CNode) => { out.push(n); if (!collapsed.has(n.id)) n.children.forEach(walk); };
    placed.roots.forEach(walk);
    return out;
  }, [placed, collapsed]);

  const getSize = useCallback(() => ({ w: placedRef.current.worldW, h: placedRef.current.worldH }), []);
  const { view, setView, anim, dragging, viewportRef, zoomAt, centerOn, fit, onMouseDown } = usePanZoom(getSize, members.length > 0);

  const q = term.trim().toLowerCase();
  const hits = useMemo(() => {
    if (!q) return [] as { n: CNode; spouse: boolean }[];
    const out: { n: CNode; spouse: boolean }[] = [];
    for (const n of visible) {
      if (n.name.toLowerCase().includes(q)) out.push({ n, spouse: false });
      if (showSpouse && n.spouse_name && n.spouse_name.toLowerCase().includes(q)) out.push({ n, spouse: true });
    }
    return out;
  }, [visible, q, showSpouse]);

  const memberX = (n: CNode) => n.x + (showSpouse && n.spouse_name ? SW + MGAP : 0);

  const location = useLocation();
  const focusId = new URLSearchParams(location.search).get('focus');
  useEffect(() => {
    if (initRef.current || !placed.roots.length) return;
    const vp = viewportRef.current;
    if (!vp) return;
    initRef.current = true;
    const target = focusId ? placed.byId.get(focusId) : undefined;
    if (target) {
      centerOn(memberX(target) + CW / 2, target.y + CH / 2, 0);
      setPanel({ id: target.id, spouse: false });
      return;
    }
    const r = placed.roots[0];
    const s = 0.9;
    setView({ s, x: vp.clientWidth * 0.78 - (r.x + unitW(r) / 2) * s, y: 50 - r.y * s });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  /* 折叠/展开后布局宽度剧变：重定位到操作节点，避免视口落在空白区 */
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const n = placed.byId.get(id);
    if (!n) return;
    centerOn(memberX(n) + CW / 2, n.y + CH / 2, 0.7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleFold = useCallback((id: string) => {
    pendingFocus.current = id;
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* 整支操作：含该节点与全部后代 */
  const descIds = useCallback((n: CNode): string[] => n.children.flatMap(c => [c.id, ...descIds(c)]), []);
  const collapseSubtree = useCallback((id: string) => {
    const n = placedRef.current.byId.get(id);
    if (!n) return;
    pendingFocus.current = id;
    setCollapsed(prev => new Set([...prev, id, ...descIds(n)]));
  }, [descIds]);
  const expandSubtree = useCallback((id: string) => {
    const n = placedRef.current.byId.get(id);
    if (!n) return;
    const remove = new Set([id, ...descIds(n)]);
    pendingFocus.current = id;
    setCollapsed(prev => new Set([...prev].filter(x => !remove.has(x))));
  }, [descIds]);
  const collapseAllNodes = useCallback(() => {
    const ids = new Set<string>();
    placedRef.current.byId.forEach(n => { if (n.children.length) ids.add(n.id); });
    pendingFocus.current = placedRef.current.roots[0]?.id ?? null;
    setCollapsed(ids);
  }, []);
  const expandAllNodes = useCallback(() => {
    pendingFocus.current = placedRef.current.roots[0]?.id ?? null;
    setCollapsed(new Set());
  }, []);

  /* 整支状态：子树全折 / 全展 / 混合（叶子无后代，空真） */
  const fullyCollapsed = useCallback((n: CNode): boolean =>
    !n.children.length || (collapsed.has(n.id) && n.children.every(fullyCollapsed)), [collapsed]);
  const fullyExpanded = useCallback((n: CNode): boolean =>
    !collapsed.has(n.id) && n.children.every(fullyExpanded), [collapsed]);

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !hits.length) return;
    const h = hits[0];
    const x = h.spouse ? h.n.x + SW / 2 : memberX(h.n) + CW / 2;
    centerOn(x, h.n.y + CH / 2, 0);
  };

  const charOf = (gen: number | null) => generationChars.find(c => c.generation === gen)?.char || '';
  const rows = useMemo(() => {
    const ys = new Map<number, number>();
    visible.forEach(n => { if (!ys.has(n.generation || 0)) ys.set(n.generation || 0, n.y); });
    return [...ys.entries()].sort((a, b) => a[0] - b[0]);
  }, [visible]);

  const worldJsx = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const cols: React.ReactNode[] = [];
    for (const n of visible) {
      const mx = memberX(n);
      const ux = n.x + unitW(n) / 2;
      const hasSp = showSpouse && !!n.spouse_name;
      const isCollapsed = collapsed.has(n.id);
      const hitM = !!q && n.name.toLowerCase().includes(q);
      const selM = panel?.id === n.id && !panel.spouse;

      /* 婚线：朱砂实线 + ♥（融合画布语义），子女自婚姻中点吊挂 */
      if (hasSp) {
        lines.push(
          <line key={`${n.id}-m`} x1={n.x + SW} y1={n.y + 40} x2={mx} y2={n.y + 40}
            stroke="#D2543C" strokeWidth={1.5} strokeLinecap="round" />,
          <text key={`${n.id}-h`} x={n.x + SW + MGAP / 2} y={n.y + 43.5} textAnchor="middle" fontSize={9} fill="#D2543C">♥</text>
        );
      }

      cols.push(
        <div key={n.id} data-stop-pan
          className={`sc-col${frame ? ' sc-frame' : ''}${hitM ? ' hit' : ''}${selM ? ' selected' : ''}`}
          style={{ left: mx, top: n.y, width: CW, height: CH }}
          onClick={() => setPanel({ id: n.id, spouse: false })}>
          <span className="seal" style={{ width: 22, height: 22, fontSize: 12 }}>{charOf(n.generation) || '·'}</span>
          <span className="sc-texts">
            <span className="sc-name" style={{ fontSize: font }}>{n.name}</span>
            <span className="sc-sub">{genderSym(n.gender)}{n.death_date ? '·故' : ''}</span>
            {showNotes && <span className="sc-sub">行{n.sibling_rank || n.family_rank || '—'}</span>}
            <span className="sc-sub">{yearsShort(n.birth_date, n.death_date) || '生卒未知'}</span>
          </span>
          {n.children.length > 0 && (
            <span className="sc-foldset" data-stop-pan>
              <button className={`sc-mini${fullyCollapsed(n) ? ' on' : ''}`}
                title="折叠整支（含全部后代）"
                onClick={e => { e.stopPropagation(); collapseSubtree(n.id); }}>
                <ChevronsUp className="w-3 h-3" />
              </button>
              <button className={`tc-fold sc-fold${isCollapsed ? ' closed' : ''}`}
                title={isCollapsed ? '展开此代' : '折叠此代'}
                onClick={e => { e.stopPropagation(); toggleFold(n.id); }}>
                {isCollapsed ? `+${descCount(n)}` : '−'}
              </button>
              <button className={`sc-mini${fullyExpanded(n) ? ' on' : ''}`}
                title="展开整支（含全部后代）"
                onClick={e => { e.stopPropagation(); expandSubtree(n.id); }}>
                <ChevronsDown className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      );

      if (hasSp) {
        const hitS = !!q && n.spouse_name!.toLowerCase().includes(q);
        const selS = panel?.id === n.id && panel.spouse;
        cols.push(
          <div key={`${n.id}-sp`} data-stop-pan
            className={`sc-col sc-sp${hitS ? ' hit' : ''}${selS ? ' selected' : ''}`}
            style={{ left: n.x, top: n.y + (CH - SH) / 2, width: SW, height: SH }}
            onClick={() => setPanel({ id: n.id, spouse: true })}>
            <span className="sc-sp-tag">配</span>
            <span className="sc-texts">
              <span className="sc-name" style={{ fontSize: font - 1 }}>{n.spouse_name}</span>
              {showNotes && n.spouse_origin && <span className="sc-sub">{n.spouse_origin}</span>}
              <span className="sc-sub">{yearsShort(n.spouse_birth_date, n.spouse_death_date) || '—'}</span>
            </span>
          </div>
        );
      }

      if (!isCollapsed && n.children.length) {
        const busY = n.children[0].y - 26;
        const startY = n.y + CH;
        const centers = n.children.map(c => c.x + unitW(c) / 2);
        const ds = [`M ${ux} ${startY} L ${ux} ${busY}`];
        if (n.children.length > 1) ds.push(`M ${Math.min(...centers)} ${busY} L ${Math.max(...centers)} ${busY}`);
        n.children.forEach((c, i) => ds.push(`M ${centers[i]} ${busY} L ${centers[i]} ${c.y}`));
        ds.forEach((d, i) => lines.push(
          <path key={`${n.id}-b${i}`} d={d} fill="none" stroke="#57544B" strokeWidth={1.4} strokeLinecap="round" />
        ));
      }
    }
    return { lines, cols };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, collapsed, q, panel, showSpouse, showNotes, frame, font, toggleFold, collapseSubtree, expandSubtree, fullyCollapsed, fullyExpanded, opts]);

  const panelNode = panel ? placed.byId.get(panel.id) : undefined;

  if (loading) {
    return (
      <div className="tc-root items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cinnabar-600"></div>
      </div>
    );
  }

  return (
    <div className="tc-root sc-root">
      <div className="tc-bar">
        <span className="tc-stats">{members.length} 人 · 右起长幼 · 竖排谱页</span>
        <div className="tc-search">
          <input type="text" placeholder="搜索姓名，回车定位" value={term}
            onChange={e => setTerm(e.target.value)} onKeyDown={onSearchKey} />
          <span className="tc-hitcount">{q ? `${hits.length} 人` : ''}</span>
        </div>
        <div className="tc-ctl">
          <button title="缩小" onClick={() => {
            const vp = viewportRef.current;
            if (vp) zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, 0.83);
          }}>−</button>
          <span className="tc-zoom">{Math.round(view.s * 100)}%</span>
          <button title="放大" onClick={() => {
            const vp = viewportRef.current;
            if (vp) zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, 1.2);
          }}>＋</button>
          <button onClick={fit}>适应全图</button>
          <button onClick={collapseAllNodes}>全部折叠</button>
          <button onClick={expandAllNodes}>全部展开</button>
        </div>
      </div>
      <div className="tc-bar2">
        <label>字号
          <input type="range" min={12} max={20} value={font} onChange={e => setFont(+e.target.value)} />
          <span className="val">{font}</span>
        </label>
        <label>列距
          <input type="range" min={12} max={60} value={gap} onChange={e => setGap(+e.target.value)} />
          <span className="val">{gap}</span>
        </label>
        <label>行距
          <input type="range" min={200} max={330} value={level} onChange={e => setLevel(+e.target.value)} />
          <span className="val">{level}</span>
        </label>
        <label><input type="checkbox" checked={showSpouse} onChange={e => setShowSpouse(e.target.checked)} />配偶柱</label>
        <label><input type="checkbox" checked={showNotes} onChange={e => setShowNotes(e.target.checked)} />排行注记</label>
        <label><input type="checkbox" checked={frame} onChange={e => setFrame(e.target.checked)} />卡框</label>
      </div>

      {error && <div className="px-4 py-2 text-sm text-cinnabar-700 bg-cinnabar-50 border-b border-cinnabar-100">{error}</div>}

      {members.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">暂无家谱数据</div>
      ) : (
        <div ref={viewportRef} className={`tc-viewport${dragging ? ' dragging' : ''}`} onMouseDown={onMouseDown}>
          <div className={`tc-world${anim ? ' anim' : ''}`}
            style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.s})` }}>
            <svg className="tc-lines" width={placed.worldW} height={placed.worldH}>
              {rows.map(([gen, y]) => (
                <g key={gen}>
                  <line x1={PAD - 30} y1={y - 16} x2={placed.worldW - PAD + 30} y2={y - 16} stroke="#EAE7DF" strokeDasharray="2 6" />
                  <text x={placed.worldW - PAD + 34} y={y + 12} fontSize={11} fill="#98948A"
                    fontFamily='"Songti SC","STSong","Noto Serif SC",serif'>第{gen}世</text>
                </g>
              ))}
              {worldJsx.lines}
            </svg>
            <div className="tc-cards">{worldJsx.cols}</div>
          </div>
          <div className="tc-hint">拖拽平移 · 滚轮缩放 · 点击谱柱看详情 · 圆钮折单代 · 双箭折/展整支</div>
        </div>
      )}

      {panelNode && (
        <MemberPanel node={panelNode} isSpouse={panel!.spouse} collapsed={collapsed.has(panelNode.id)}
          onClose={() => setPanel(null)}
          onCenter={() => centerOn(memberX(panelNode) + CW / 2, panelNode.y + CH / 2, 0)}
          onFold={() => toggleFold(panelNode.id)} />
      )}
    </div>
  );
};

export default TraditionalView;