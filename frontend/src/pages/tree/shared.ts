import { useState, useEffect, useRef, useCallback, MouseEvent as ReactMouseEvent } from 'react';
import { FamilyMember } from '../../types';

export interface CNode extends FamilyMember {
  children: CNode[];
  x: number;
  y: number;
  subW: number;
}

export interface LayoutOpts {
  cw: number; ch: number; sw: number; sh: number;
  mgap: number; gap: number; level: number; rootgap: number; pad: number;
  mirror?: boolean;
}

export const unitWidth = (n: CNode, o: LayoutOpts) => o.cw + (n.spouse_name ? o.mgap + o.sw : 0);
export const descCount = (n: CNode): number => n.children.reduce((s, c) => s + 1 + descCount(c), 0);
const byRank = (a: CNode, b: CNode) =>
  (a.family_rank || 0) - (b.family_rank || 0) || a.name.localeCompare(b.name, 'zh');

export const genderClass = (g: FamilyMember['gender']) => g === 'male' ? 'male' : g === 'female' ? 'female' : 'other';
export const genderTint = (g: FamilyMember['gender']) =>
  g === 'male' ? 'bg-blue-100 text-blue-700' : g === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-qing-100 text-qing-700';
export const genderSym = (g: FamilyMember['gender']) => g === 'male' ? '♂' : g === 'female' ? '♀' : '○';
const year = (d: string | null) => d ? String(d).slice(0, 4) : '';
export const yearsText = (b: string | null, d: string | null) => {
  const by = year(b), dy = year(d);
  if (by && dy) return `${by} – ${dy}`;
  if (by) return `${by} –`;
  if (dy) return `– ${dy}`;
  return '生卒未知';
};

export function buildForest(members: FamilyMember[]): CNode[] {
  const byId = new Map<number, CNode>(members.map(m => [m.id, { ...m, children: [], x: 0, y: 0, subW: 0 }]));
  const roots: CNode[] = [];
  for (const n of byId.values()) {
    const parent = n.parent_id ? byId.get(n.parent_id) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  for (const n of byId.values()) n.children.sort(byRank);
  roots.sort(byRank);
  return roots;
}

/* tidy tree：夫妻为单元，子树宽自底向上；mirror 用于谱页右起阅读 */
export function layoutTree(roots: CNode[], collapsed: Set<number>, o: LayoutOpts) {
  let maxDepth = 0;
  const measure = (n: CNode): void => {
    const uw = unitWidth(n, o);
    if (collapsed.has(n.id) || !n.children.length) { n.subW = uw; return; }
    n.children.forEach(measure);
    const kidsW = n.children.reduce((s, c) => s + c.subW, 0) + o.gap * (n.children.length - 1);
    n.subW = Math.max(uw, kidsW);
  };
  const place = (n: CNode, left: number, depth: number): void => {
    maxDepth = Math.max(maxDepth, depth);
    n.y = o.pad + depth * o.level;
    const uw = unitWidth(n, o);
    if (collapsed.has(n.id) || !n.children.length) {
      n.x = left + (n.subW - uw) / 2;
      return;
    }
    const kidsW = n.children.reduce((s, c) => s + c.subW, 0) + o.gap * (n.children.length - 1);
    let cx = left + (n.subW - kidsW) / 2;
    for (const c of n.children) { place(c, cx, depth + 1); cx += c.subW + o.gap; }
    const first = n.children[0], last = n.children[n.children.length - 1];
    n.x = (first.x + unitWidth(first, o) / 2 + last.x + unitWidth(last, o) / 2) / 2 - uw / 2;
  };
  roots.forEach(measure);
  let left = o.pad;
  for (const r of roots) { place(r, left, 0); left += r.subW + o.rootgap; }
  const worldW = left - o.rootgap + o.pad;
  const worldH = o.pad * 2 + maxDepth * o.level + o.ch;
  if (o.mirror) {
    const flip = (n: CNode) => { n.x = worldW - n.x - unitWidth(n, o); n.children.forEach(flip); };
    roots.forEach(flip);
  }
  return { worldW, worldH };
}

export interface View { x: number; y: number; s: number }

/* 画布通用平移缩放：滚轮/拖拽/单指平移/双指捏合 */
export function usePanZoom(getSize: () => { w: number; h: number }, ready: boolean) {
  const [view, setView] = useState<View>({ x: 0, y: 0, s: 1 });
  const [anim, setAnim] = useState(false);
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const dragRef = useRef<{ mx: number; my: number; vx: number; vy: number } | null>(null);
  const touchRef = useRef<{ mode: 'pan'; mx: number; my: number; vx: number; vy: number } | { mode: 'pinch'; dist: number } | null>(null);
  const animTimer = useRef<number | undefined>(undefined);

  const pulse = useCallback(() => {
    setAnim(true);
    window.clearTimeout(animTimer.current);
    animTimer.current = window.setTimeout(() => setAnim(false), 420);
  }, []);
  useEffect(() => () => window.clearTimeout(animTimer.current), []);

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setView(v => {
      const ns = Math.min(3, Math.max(0.05, v.s * factor));
      return { s: ns, x: px - (px - v.x) * (ns / v.s), y: py - (py - v.y) * (ns / v.s) };
    });
  }, []);

  const centerOn = useCallback((x: number, y: number, minScale = 0.7) => {
    const vp = viewportRef.current;
    if (!vp) return;
    setView(v => {
      const s = v.s < minScale ? 0.9 : v.s;
      return { s, x: vp.clientWidth / 2 - x * s, y: vp.clientHeight / 2 - y * s };
    });
    pulse();
  }, [pulse]);

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const { w, h } = getSize();
    const s = Math.min((vp.clientWidth - 40) / w, (vp.clientHeight - 40) / h, 1);
    setView({ s, x: (vp.clientWidth - w * s) / 2, y: (vp.clientHeight - h * s) / 2 });
    pulse();
  }, [getSize, pulse]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 0.89);
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const v = viewRef.current;
        touchRef.current = { mode: 'pan', mx: t.clientX, my: t.clientY, vx: v.x, vy: v.y };
      } else if (e.touches.length === 2) {
        const [a, b] = e.touches;
        touchRef.current = { mode: 'pinch', dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
      }
    };
    const onMove = (e: TouchEvent) => {
      const t = touchRef.current;
      if (!t) return;
      e.preventDefault();
      if (t.mode === 'pan' && e.touches.length === 1) {
        const p = e.touches[0];
        setView(v => ({ ...v, x: t.vx + p.clientX - t.mx, y: t.vy + p.clientY - t.my }));
      } else if (t.mode === 'pinch' && e.touches.length === 2) {
        const [a, b] = e.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const r = vp.getBoundingClientRect();
        zoomAt((a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top, dist / t.dist);
        t.dist = dist;
      }
    };
    const onEnd = () => { touchRef.current = null; };
    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('touchstart', onStart, { passive: true });
    vp.addEventListener('touchmove', onMove, { passive: false });
    vp.addEventListener('touchend', onEnd);
    return () => {
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('touchstart', onStart);
      vp.removeEventListener('touchmove', onMove);
      vp.removeEventListener('touchend', onEnd);
    };
  }, [zoomAt, ready]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setView(v => ({ ...v, x: d.vx + e.clientX - d.mx, y: d.vy + e.clientY - d.my }));
    };
    const up = () => { dragRef.current = null; setDragging(false); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  const onMouseDown = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-stop-pan]')) return;
    dragRef.current = { mx: e.clientX, my: e.clientY, vx: view.x, vy: view.y };
    setDragging(true);
  };

  return { view, setView, anim, dragging, viewportRef, zoomAt, centerOn, fit, onMouseDown };
}