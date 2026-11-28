import React, { useEffect, useRef, useState } from 'react';
import { Download, FileJson, FileImage, FileText, Loader2 } from 'lucide-react';
import type { FamilyMember, GenerationChar } from '../types';
import { exportTree } from '../pages/tree/treeExport';
import type { TreeExportFormat } from '../pages/tree/treeExport';

interface TreeExportMenuProps {
  mode: 'fan' | 'traditional';
  members: FamilyMember[];
  generationChars: GenerationChar[];
  rootMemberId: number | null;
  collapsedIds: Set<number>;
  showSpouse: boolean;
  showNotes: boolean;
  title?: string;
}

const formats: Array<{ id: TreeExportFormat; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'json', label: 'JSON', icon: FileJson },
  { id: 'svg', label: 'SVG', icon: FileText },
  { id: 'png', label: '高清 PNG', icon: FileImage },
  { id: 'pdf', label: 'PDF', icon: FileText },
];

export const TreeExportMenu: React.FC<TreeExportMenuProps> = ({
  mode, members, generationChars, rootMemberId, collapsedIds, showSpouse, showNotes, title = '承脉家谱',
}) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [scope, setScope] = useState<'branch' | 'all'>(rootMemberId === null ? 'all' : 'branch');
  const [includeCollapsed, setIncludeCollapsed] = useState(false);
  const [includeSpouse, setIncludeSpouse] = useState(showSpouse);
  const [includeNotes, setIncludeNotes] = useState(showNotes);
  const [hideGuides, setHideGuides] = useState(false);
  const [busy, setBusy] = useState<TreeExportFormat | null>(null);
  const [error, setError] = useState('');

  useEffect(() => setIncludeSpouse(showSpouse), [showSpouse]);
  useEffect(() => setIncludeNotes(showNotes), [showNotes]);
  useEffect(() => {
    if (rootMemberId === null) setScope('all');
  }, [rootMemberId]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && detailsRef.current?.open) detailsRef.current.open = false;
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const run = async (format: TreeExportFormat) => {
    if (busy) return;
    setBusy(format);
    setError('');
    try {
      await exportTree({
        mode,
        members,
        generationChars,
        rootMemberId: scope === 'branch' ? rootMemberId : null,
        collapsedIds,
        includeCollapsed,
        showSpouse: includeSpouse,
        showNotes: includeNotes,
        showGuides: mode !== 'fan' || !hideGuides,
        title,
      }, format);
      if (detailsRef.current) detailsRef.current.open = false;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导出失败，请重试');
    } finally {
      setBusy(null);
    }
  };

  return (
    <details ref={detailsRef} className="tc-export">
      <summary aria-label="导出家谱">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        导出
      </summary>
      <div className="tc-export-panel">
        <div className="tc-export-title">导出家谱</div>
        <label className="tc-export-field">
          范围
          <select value={scope} onChange={event => setScope(event.target.value as 'branch' | 'all')}>
            {rootMemberId !== null && <option value="branch">当前分支</option>}
            <option value="all">整个家谱</option>
          </select>
        </label>
        <label className="tc-export-check"><input type="checkbox" checked={includeCollapsed} onChange={event => setIncludeCollapsed(event.target.checked)} />包含折叠后代</label>
        <label className="tc-export-check"><input type="checkbox" checked={includeSpouse} onChange={event => setIncludeSpouse(event.target.checked)} />显示配偶</label>
        <label className="tc-export-check"><input type="checkbox" checked={includeNotes} onChange={event => setIncludeNotes(event.target.checked)} />显示备注与排行</label>
        {mode === 'fan' && <label className="tc-export-check"><input type="checkbox" checked={hideGuides} onChange={event => setHideGuides(event.target.checked)} />隐藏辅助线（无圈线、外框与引线）</label>}
        <div className="tc-export-formats">
          {formats.map(format => {
            const Icon = format.icon;
            return (
              <button key={format.id} type="button" disabled={!members.length || busy !== null} onClick={() => void run(format.id)}>
                <Icon className="w-3.5 h-3.5" />{busy === format.id ? '生成中' : format.label}
              </button>
            );
          })}
        </div>
        <p className="tc-export-hint">SVG 适合无损编辑；PNG/PDF 会按图谱尺寸自动控制分辨率。{mode === 'fan' && hideGuides ? ' 当前导出不含辅助线。' : ''}</p>
        {error && <p className="tc-export-error" role="alert">{error}</p>}
      </div>
    </details>
  );
};

export default TreeExportMenu;
