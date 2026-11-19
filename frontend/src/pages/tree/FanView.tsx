import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { User } from '../../types';
import { useFamilyMembers } from '../../hooks/useFamilyMembers';
import MemberPanel from '../../components/MemberPanel';
import { CNode, buildForest, descCount, usePanZoom } from './shared';

interface FanViewProps {
  user: User | null;
}

interface Sector {
  n: CNode;
  a0: number;
  a1: number;
  depth: number;
}

interface Band extends Sector {
  spouse: boolean;
}

const TAU = Math.PI * 2;
const FILL: Record<string, string> = { male: '#E4EDFB', female: '#FBE4EE', other: '#DEEDEA' };
const BAND = 16;   // 配偶"婚环"带厚度
const GAPR = 6;    // 环间留白

/* 扇形谱图：始祖为圆心、世代为环；配偶不再切走角度，而是环抱成员弧外侧的"婚环"带 */
const FanView: React.FC<FanViewProps> = ({ user }) => {
  const { members, loading, error } = useFamilyMembers(user?.id);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [rootId, setRootId] = useState<number | null>(null);
  const [ringW, setRingW] = useState(76);
  const [innerR, setInnerR] = useState(72);
  const [showSpouse, setShowSpouse] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [term, setTerm] = useState('');
  const [panel, setPanel] = useState<{ id: number; spouse: boolean } | null>(null);
  const initRef = useRef(false);

  const forest = useMemo(() => buildForest(members), [members]);
  const byId = useMemo(() => {
    const m = new Map<number, CNode>();
    const walk = (n: CNode) => { m.set(n.id, n); n.children.forEach(walk); };
    forest.forEach(walk);
    return m;
  }, [forest]);
  const root = (rootId && byId.get(rootId)) || forest[0];

  const pitch = ringW + (showSpouse ? BAND + GAPR : GAPR);
  const ring = useCallback((d: number) => ({
    ri: innerR + (d - 1) * pitch,
    ro: innerR + (d - 1) * pitch + ringW
  }), [innerR, pitch, ringW]);
  const bandOf = useCallback((d: number) => d === 0
    ? { ri: innerR - BAND - 6, ro: innerR - 6 }
    : { ri: ring(d).ro + 3, ro: ring(d).ro + 3 + BAND }, [innerR, ring]);

  const geo = useMemo(() => {
    if (!root) return { sectors: [] as Sector[], bands: [] as Band[], size: 0, cx: 0, cy: 0, maxDepth: 0 };
    const weight = (n: CNode): number =>
      collapsed.has(n.id) || !n.children.length ? 1 : n.children.reduce((s, c) => s + weight(c), 0);
    const sectors: Sector[] = [];
    const bands: Band[] = [];
    let maxDepth = 0;
    const walk = (n: CNode, a0: number, a1: number, depth: number) => {
      maxDepth = Math.max(maxDepth, depth);
      if (depth > 0) sectors.push({ n, a0, a1, depth });
      if (n.spouse_name && showSpouse) bands.push({ n, a0, a1, depth, spouse: true });
      if (!collapsed.has(n.id) && n.children.length) {
        const total = n.children.reduce((s, c) => s + weight(c), 0);
        let a = a0;
        for (const c of n.children) {
          const cs = (a1 - a0) * (weight(c) / total);
          walk(c, a, a + cs, depth + 1);
          a += cs;
        }
      }
    };
    walk(root, -Math.PI / 2, -Math.PI / 2 + TAU, 0);
    const size = 2 * (innerR + maxDepth * pitch + 96) + 48;
    return { sectors, bands, size, cx: size / 2, cy: size / 2, maxDepth };
  }, [root, collapsed, ringW, innerR, showSpouse, pitch]);
  const geoRef = useRef(geo);
  geoRef.current = geo;

  const getSize = useCallback(() => ({ w: geoRef.current.size || 1, h: geoRef.current.size || 1 }), []);
  const { view, setView, anim, dragging, viewportRef, zoomAt, centerOn, fit, onMouseDown } = usePanZoom(getSize, members.length > 0);

  const arcPath = (a0: number, a1: number, ri: number, ro: number) => {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (r: number, a: number) => `${geo.cx + r * Math.cos(a)} ${geo.cy + r * Math.sin(a)}`;
    return `M ${p(ro, a0)} A ${ro} ${ro} 0 ${large} 1 ${p(ro, a1)} L ${p(ri, a1)} A ${ri} ${ri} 0 ${large} 0 ${p(ri, a0)} Z`;
  };
  const midOf = (s: Sector, ri: number, ro: number) => {
    const am = (s.a0 + s.a1) / 2, rm = (ri + ro) / 2;
    return { am, rm, x: geo.cx + rm * Math.cos(am), y: geo.cy + rm * Math.sin(am) };
  };

  const q = term.trim().toLowerCase();
  const hits = useMemo(() => {
    if (!q) return [] as { s: Sector; spouse: boolean; ri: number; ro: number }[];
    const out: { s: Sector; spouse: boolean; ri: number; ro: number }[] = [];
    for (const s of geo.sectors) if (s.n.name.toLowerCase().includes(q)) out.push({ s, spouse: false, ...ring(s.depth) });
    for (const b of geo.bands) if (b.n.spouse_name!.toLowerCase().includes(q)) out.push({ s: b, spouse: true, ...bandOf(b.depth) });
    return out;
  }, [geo, q, ring, bandOf]);

  /* 标签：成员弧内放射书写；配偶婚环带内沿弧切向书写；放不下的统一引线外圈标注 */
  const labels = useMemo(() => {
    const internal: { key: string; x: number; y: number; deg: number; text: string; spouse: boolean; fs: number }[] = [];
    const ext: { key: string; ax: number; ay: number; ex: number; ey: number; side: number; text: string; spouse: boolean }[] = [];
    const fs = Math.min(18, Math.max(12, 9.5 / view.s));
    const fsSp = Math.min(fs, 11);
    if (!showLabels || !geo.sectors.length) return { internal, ext, rout: 0, fs };
    const rout = innerR + (geo.maxDepth - 1) * pitch + ringW + (showSpouse ? BAND + 3 : 0);
    const pushExt = (key: string, am: number, ro: number, text: string, spouse: boolean) => {
      const side = Math.cos(am) >= 0 ? 1 : -1;
      ext.push({
        key, side, text, spouse,
        ax: geo.cx + (ro + 2) * Math.cos(am),
        ay: geo.cy + (ro + 2) * Math.sin(am),
        ex: 0,
        ey: geo.cy + (rout + 16) * Math.sin(am)
      });
    };
    for (const s of geo.sectors) {
      const { ri, ro } = ring(s.depth);
      const c = midOf(s, ri, ro);
      const arcW = (s.a1 - s.a0) * c.rm;
      if (arcW >= fs * 0.95 && s.n.name.length * fs * 1.05 <= ro - ri - 4) {
        let deg = (c.am * 180) / Math.PI;
        if (Math.cos(c.am) < 0) deg += 180;
        internal.push({ key: `m${s.n.id}`, x: c.x, y: c.y, deg, text: s.n.name, spouse: false, fs });
      } else {
        pushExt(`m${s.n.id}`, c.am, ro, s.n.name, false);
      }
    }
    for (const b of geo.bands) {
      if (b.depth === 0) continue; // 根配偶名横排于婚环顶部
      const { ri, ro } = bandOf(b.depth);
      const c = midOf(b, ri, ro);
      const name = b.n.spouse_name!;
      const arcLen = (b.a1 - b.a0) * c.rm;
      if (arcLen >= name.length * fsSp * 0.95) {
        let deg = (c.am * 180) / Math.PI + 90;
        if (Math.cos(c.am) < 0) deg += 180;
        internal.push({ key: `s${b.n.id}`, x: c.x, y: c.y, deg, text: name, spouse: true, fs: fsSp });
      } else {
        pushExt(`s${b.n.id}`, c.am, ro, name, true);
      }
    }
    for (const side of [1, -1]) {
      const list = ext.filter(e => e.side === side).sort((a, b) => a.ey - b.ey);
      const maxY = geo.cy + rout + 60;
      for (let i = 1; i < list.length; i++) list[i].ey = Math.max(list[i].ey, list[i - 1].ey + fs + 2);
      if (list.length && list[list.length - 1].ey > maxY) {
        list[list.length - 1].ey = maxY;
        for (let i = list.length - 2; i >= 0; i--) list[i].ey = Math.min(list[i].ey, list[i + 1].ey - fs - 2);
      }
      for (const e of list) e.ex = geo.cx + side * (rout + 30);
    }
    return { internal, ext, rout, fs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, showLabels, ringW, innerR, view.s, pitch, showSpouse]);

  const location = useLocation();
  const focusParam = new URLSearchParams(location.search).get('focus');
  const focusId = focusParam ? Number(focusParam) : null;
  useEffect(() => {
    if (initRef.current || !geo.sectors.length) return;
    initRef.current = true;
    if (focusId && byId.has(focusId)) {
      const s = geo.sectors.find(x => x.n.id === focusId);
      if (s) {
        const { ri, ro } = ring(s.depth);
        const c = midOf(s, ri, ro);
        centerOn(c.x, c.y, 0);
        setPanel({ id: focusId, spouse: false });
        return;
      }
    }
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleFold = useCallback((id: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const reroot = (id: number | null) => {
    setRootId(id);
    setPanel(null);
    initRef.current = true;
    requestAnimationFrame(() => fit());
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !hits.length) return;
    const h = hits[0];
    const c = midOf(h.s, h.ri, h.ro);
    centerOn(c.x, c.y, 0);
  };

  const panelNode = panel ? byId.get(panel.id) : undefined;
  const panelArc = useMemo(() => {
    if (!panelNode || !panel) return null;
    if (panel.spouse) {
      const b = geo.bands.find(x => x.n.id === panelNode.id);
      return b ? { ...bandOf(b.depth), s: b } : null;
    }
    const s = geo.sectors.find(x => x.n.id === panelNode.id);
    return s ? { ...ring(s.depth), s } : null;
  }, [panelNode, panel, geo, ring, bandOf]);
  const gens = useMemo(() => new Set(members.map(m => m.generation).filter(Boolean)).size, [members]);
  const centerR = showSpouse ? innerR - BAND - 10 : innerR - 10;

  if (loading) {
    return (
      <div className="tc-root items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cinnabar-600"></div>
      </div>
    );
  }

  return (
    <div className="tc-root">
      <div className="tc-bar">
        <span className="tc-stats">{members.length} 人 · {gens} 世代 · 根：{root?.name || '—'}</span>
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
          <button onClick={() => setCollapsed(new Set())}>全部展开</button>
        </div>
      </div>
      <div className="tc-bar2">
        <label>环宽
          <input type="range" min={44} max={110} value={ringW} onChange={e => setRingW(+e.target.value)} />
          <span className="val">{ringW}</span>
        </label>
        <label>内径
          <input type="range" min={48} max={110} value={innerR} onChange={e => setInnerR(+e.target.value)} />
          <span className="val">{innerR}</span>
        </label>
        <label><input type="checkbox" checked={showSpouse} onChange={e => setShowSpouse(e.target.checked)} />配偶婚环</label>
        <label><input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} />姓名标签</label>
        {rootId && (
          <span className="tc-rootchip">
            以 {root?.name} 为根
            <button onClick={() => reroot(null)}>重置</button>
          </span>
        )}
        {!rootId && <span className="tc-rootchip hintchip">双击任意弧段可以其为根重排</span>}
      </div>

      {error && <div className="px-4 py-2 text-sm text-cinnabar-700 bg-cinnabar-50 border-b border-cinnabar-100">{error}</div>}

      {!root ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">暂无家谱数据</div>
      ) : (
        <div ref={viewportRef} className={`tc-viewport${dragging ? ' dragging' : ''}`} onMouseDown={onMouseDown}>
          <div className={`tc-world${anim ? ' anim' : ''}`}
            style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.s})` }}>
            <svg className="tc-lines" width={geo.size} height={geo.size}>
              {Array.from({ length: geo.maxDepth }, (_, i) => i + 1).map(d => (
                <g key={d}>
                  <circle cx={geo.cx} cy={geo.cy} r={ring(d).ri} fill="none" stroke="#EAE7DF" strokeDasharray="3 5" />
                  <text x={geo.cx + 4} y={geo.cy - ring(d).ri - 4} fontSize={10} fill="#98948A"
                    stroke="#FFFDF8" strokeWidth={3} paintOrder="stroke">第{(root.generation || 1) + d - 1}世</text>
                </g>
              ))}

              {/* 配偶婚环：环抱成员弧外侧的整跨度环带 */}
              {geo.bands.map(b => {
                const { ri, ro } = bandOf(b.depth);
                const sel = panel?.id === b.n.id && panel.spouse;
                const hit = !!q && b.n.spouse_name!.toLowerCase().includes(q);
                const c = midOf(b, ri, ro);
                return (
                  <g key={`band-${b.n.id}`}>
                    <path d={arcPath(b.a0, b.a1, ri, ro)} className="fan-sector" data-stop-pan
                      fill={sel ? '#F4C8BC' : hit ? '#F6ECC9' : '#F9E3E6'}
                      stroke={sel ? '#B93A26' : hit ? '#C9972C' : '#FFFDF8'}
                      strokeWidth={sel || hit ? 2.5 : 1.2}
                      onClick={() => setPanel({ id: b.n.id, spouse: true })} />
                    {(b.a1 - b.a0) > 0.05 && (
                      <text x={geo.cx + (ro - 4) * Math.cos(c.am)} y={geo.cy + (ro - 4) * Math.sin(c.am) + 2}
                        textAnchor="middle" fontSize={6.5} fill="#D2543C" pointerEvents="none">♥</text>
                    )}
                  </g>
                );
              })}

              {/* 成员弧：完整角度，子女不再被配偶切分 */}
              {geo.sectors.map(s => {
                const { ri, ro } = ring(s.depth);
                const sel = panel?.id === s.n.id && !panel.spouse;
                const hit = !!q && s.n.name.toLowerCase().includes(q);
                return (
                  <path key={`sec-${s.n.id}`} d={arcPath(s.a0, s.a1, ri, ro)}
                    className="fan-sector" data-stop-pan
                    fill={FILL[s.n.gender || 'other']}
                    stroke={sel ? '#B93A26' : hit ? '#C9972C' : '#FFFDF8'}
                    strokeWidth={sel || hit ? 3 : 1.5}
                    onClick={() => setPanel({ id: s.n.id, spouse: false })}
                    onDoubleClick={() => reroot(s.n.id)} />
                );
              })}

              {labels.internal.map(l => (
                <text key={l.key} className="fan-label" x={l.x} y={l.y}
                  transform={`rotate(${l.deg} ${l.x} ${l.y})`}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={l.fs} fill={l.spouse ? '#9A2E1E' : '#2E2C26'}>
                  {l.text}
                </text>
              ))}
              {labels.ext.map(e => (
                <g key={e.key} className="fan-label">
                  <path d={`M ${e.ax} ${e.ay} L ${geo.cx + e.side * (labels.rout + 12)} ${e.ey} L ${e.ex - e.side * 4} ${e.ey}`}
                    fill="none" stroke="#B4B0A5" strokeWidth={Math.max(0.8, 1 / view.s)} />
                  <circle cx={e.ax} cy={e.ay} r={Math.max(1.2, 1.6 / view.s)} fill={e.spouse ? '#D2543C' : '#98948A'} />
                  <text x={e.ex} y={e.ey + labels.fs * 0.3} textAnchor={e.side === 1 ? 'start' : 'end'}
                    fontSize={labels.fs} fill={e.spouse ? '#9A2E1E' : '#2E2C26'}>
                    {e.text}
                  </text>
                </g>
              ))}

              {/* 圆心：始祖 + 根配偶婚环 */}
              {showSpouse && root.spouse_name && (
                <g>
                  <path d={arcPath(-Math.PI / 2, -Math.PI / 2 + TAU - 0.0001, bandOf(0).ri, bandOf(0).ro)}
                    className="fan-sector" data-stop-pan fill="#F9E3E6" stroke="#FFFDF8" strokeWidth={1.2}
                    onClick={() => setPanel({ id: root.id, spouse: true })} />
                  {showLabels && (
                    <text className="fan-label" x={geo.cx} y={geo.cy - (bandOf(0).ri + bandOf(0).ro) / 2 + 3.5}
                      textAnchor="middle" fontSize={Math.min(labels.fs, 10.5)} fill="#9A2E1E">
                      {root.spouse_name}
                    </text>
                  )}
                </g>
              )}
              <circle cx={geo.cx} cy={geo.cy} r={centerR} fill="#B93A26" className="fan-sector" data-stop-pan
                onClick={() => setPanel({ id: root.id, spouse: false })}
                onDoubleClick={() => rootId && reroot(null)} />
              <text x={geo.cx} y={geo.cy - 2} textAnchor="middle" fontSize={Math.min(17, centerR * 0.42)} fill="#FFFDF8"
                fontFamily='"Songti SC","STSong","Noto Serif SC",serif' fontWeight={700} pointerEvents="none">
                {root.name}
              </text>
              <text x={geo.cx} y={geo.cy + 14} textAnchor="middle" fontSize={8.5} fill="#FAE4DE" pointerEvents="none">
                第{root.generation || '?'}世 · {descCount(root)} 后代
              </text>
            </svg>
          </div>
          <div className="tc-hint">拖拽平移 · 滚轮缩放 · 单击看详情 · 双击换根 · 外圈粉环为配偶</div>
        </div>
      )}

      {panelNode && (
        <MemberPanel node={panelNode} isSpouse={panel!.spouse} collapsed={collapsed.has(panelNode.id)}
          onClose={() => setPanel(null)}
          onCenter={() => {
            if (panelArc) {
              const c = midOf(panelArc.s, panelArc.ri, panelArc.ro);
              centerOn(c.x, c.y, 0);
            } else {
              centerOn(geo.cx, geo.cy, 0);
            }
          }}
          onFold={() => toggleFold(panelNode.id)} />
      )}
    </div>
  );
};

export default FanView;