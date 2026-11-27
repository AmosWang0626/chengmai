import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function readIdSet(value: string | null): Set<number> {
  if (!value) return new Set();
  return new Set(value.split(',')
    .map(Number)
    .filter(id => Number.isSafeInteger(id) && id > 0));
}

export function readPositiveId(value: string | null): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function useTreeUrlState(values: {
  rootId?: number | null;
  collapsed: Set<number>;
  term: string;
  focusId?: number | null;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = [...values.collapsed].sort((a, b) => a - b).join(',');
  const rootId = values.rootId ?? null;
  const focusId = values.focusId ?? null;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const next: Record<string, string> = {
      collapsed,
      q: values.term.trim(),
      root: rootId === null ? '' : String(rootId),
      focus: focusId === null ? '' : String(focusId),
    };
    const changed = Object.entries(next).some(([key, value]) => (params.get(key) || '') !== value);
    if (!changed) return;
    Object.keys(next).forEach(key => {
      if (next[key]) params.set(key, next[key]);
      else params.delete(key);
    });
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
  }, [collapsed, focusId, location.pathname, location.search, navigate, rootId, values.term]);
}
