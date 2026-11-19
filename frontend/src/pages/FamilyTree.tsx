import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { useUserRole } from '../hooks/useUserRole';
import { TreeNode } from '../types';
import Layout from '../components/Layout';
import {
  ChevronDown, ChevronRight,
  ZoomIn, ZoomOut, Maximize2, Search, GitBranch, Edit2
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface FamilyTreeProps {
  user: User | null;
}

interface TreeViewNode {
  id: number;
  node: TreeNode;
  level: number;
  isExpanded: boolean;
  hasChildren: boolean;
  path: number[];
}

const genderTint = (g: string | null) =>
  g === 'male' ? 'bg-blue-100 text-blue-700' : g === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-qing-100 text-qing-700';
const genderSym = (g: string | null) => g === 'male' ? '♂' : g === 'female' ? '♀' : '○';

const FamilyTree: React.FC<FamilyTreeProps> = ({ user }) => {
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);
  const [showRootSelector, setShowRootSelector] = useState(false);
  const { tree, members, loading } = useFamilyMembers(user?.id, selectedRootId);
  const { isAdmin } = useUserRole(user?.id);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [scale, setScale] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedNode, setHighlightedNode] = useState<number | null>(null);
  const initRef = useRef(false);

  /* 切换起点时重新初始化展开状态 */
  useEffect(() => {
    initRef.current = false;
    setExpandedNodes(new Set());
  }, [selectedRootId]);

  /* 仅首次（或换起点后）展开两层；tree 每次渲染都是新数组，不能用它做重复初始化判断，
     否则折叠清空后会被立即重新展开 */
  useEffect(() => {
    if (!initRef.current && tree.length > 0) {
      initRef.current = true;
      setExpandedNodes(new Set(tree.flatMap(n => [n.id, ...n.children.map(c => c.id)])));
    }
  }, [tree]);

  const rootCandidates = useMemo(() =>
    [...members].sort((a, b) => (a.generation || 0) - (b.generation || 0) || a.name.localeCompare(b.name, 'zh')),
    [members]);

  const toggleNode = (nodeId: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<number>();
    const collect = (nodes: TreeNode[]) => nodes.forEach(n => { all.add(n.id); collect(n.children); });
    collect(tree);
    setExpandedNodes(all);
  };
  const collapseAll = () => setExpandedNodes(new Set());

  const findNodePath = (nodes: TreeNode[], targetId: number, currentPath: number[] = []): number[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) return [...currentPath, node.id];
      const found = findNodePath(node.children, targetId, [...currentPath, node.id]);
      if (found) return found;
    }
    return null;
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      const found = members.find(m => m.name.toLowerCase().includes(term.toLowerCase()));
      if (found) {
        setHighlightedNode(found.id);
        const path = findNodePath(tree, found.id);
        if (path) setExpandedNodes(prev => new Set([...prev, ...path]));
      }
    } else {
      setHighlightedNode(null);
    }
  };

  const buildTreeView = useCallback((nodes: TreeNode[], level = 0, path: number[] = []): TreeViewNode[] => {
    const result: TreeViewNode[] = [];
    nodes.forEach(node => {
      const hasChildren = node.children.length > 0;
      const isExpanded = expandedNodes.has(node.id);
      result.push({ id: node.id, node, level, isExpanded, hasChildren, path: [...path, node.id] });
      if (isExpanded && hasChildren) result.push(...buildTreeView(node.children, level + 1, [...path, node.id]));
    });
    return result;
  }, [expandedNodes]);

  const treeViewData = useMemo(() => buildTreeView(tree), [tree, buildTreeView]);

  if (loading) {
    return (
      <Layout user={user} title="世系列表">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cinnabar-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} title="世系列表">
      <div className="max-w-[1400px] mx-auto space-y-3">
        <div className="rise ui-card p-2 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="搜索姓名，自动展开路径" value={searchTerm}
              onChange={e => handleSearch(e.target.value)} className="ui-input h-8 pl-8" />
          </div>

          <div className="relative">
            <button onClick={() => setShowRootSelector(v => !v)} className="ui-btn-outline h-8">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="max-w-[100px] truncate">{selectedRootId ? members.find(m => m.id === selectedRootId)?.name || '选择起点' : '显示全部'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRootSelector ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showRootSelector && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="ui-menu absolute top-full left-0 mt-1 w-60 z-50 max-h-64 overflow-auto">
                  <button onClick={() => { setSelectedRootId(null); setShowRootSelector(false); setExpandedNodes(new Set()); }}
                    className={`ui-menu-item ${!selectedRootId ? 'active' : ''}`}>
                    显示全部家人
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {rootCandidates.map(member => (
                    <button key={member.id}
                      onClick={() => { setSelectedRootId(member.id); setShowRootSelector(false); setExpandedNodes(new Set([member.id])); }}
                      className={`ui-menu-item ${selectedRootId === member.id ? 'active' : ''}`}>
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${genderTint(member.gender)}`}>{member.name.slice(-1)}</span>
                      <span className="flex-1 truncate">{member.name}</span>
                      <span className="text-[11px] text-slate-400 num">第{member.generation}世</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-1.5">
            <button onClick={expandAll} className="ui-btn-outline h-8"><ChevronDown className="w-3.5 h-3.5" /><span className="hidden sm:inline">展开</span></button>
            <button onClick={collapseAll} className="ui-btn-outline h-8"><ChevronRight className="w-3.5 h-3.5" /><span className="hidden sm:inline">折叠</span></button>
          </div>

          <div className="ml-auto flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-paper-card">
            <button onClick={() => setScale(p => Math.max(p - 0.1, 0.5))} className="ui-icon-btn"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="px-1 text-xs font-medium text-slate-600 min-w-[40px] text-center num">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(p => Math.min(p + 0.1, 2))} className="ui-icon-btn"><ZoomIn className="w-3.5 h-3.5" /></button>
            <button onClick={() => setScale(1)} className="ui-icon-btn" title="重置"><Maximize2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {showRootSelector && <div className="fixed inset-0 z-40" onClick={() => setShowRootSelector(false)} />}

        <div className="rise ui-card overflow-auto" style={{ height: 'calc(100vh - 210px)', '--d': '80ms' } as React.CSSProperties}>
          {tree.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
              <span className="seal w-12 h-12 text-xl">谱</span>
              <p className="text-sm">暂无家谱数据</p>
              <Link to="/members/new" className="ui-btn-primary">添加第一位家人</Link>
            </div>
          ) : (
            <div className="inline-block min-w-full p-2" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <div className="space-y-0.5">
                {treeViewData.map((item, index) => {
                  const isHighlighted = highlightedNode === item.id;
                  const indent = item.level * (window.innerWidth < 640 ? 18 : 30);
                  const n = item.node;
                  return (
                    <motion.div key={`${item.id}-${index}`}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.18, delay: Math.min(index * 0.012, 0.3) }}
                      className={`flex items-center gap-2 h-10 px-2 rounded-lg border transition-colors ${item.hasChildren ? 'cursor-pointer' : ''} ${
                        isHighlighted ? 'bg-gilt-50 border-gilt-400 shadow-card' : 'bg-paper-card border-slate-100 hover:border-cinnabar-300 hover:bg-cinnabar-50/50'
                      }`}
                      style={{ marginLeft: `${indent}px` }}
                      onClick={() => item.hasChildren && toggleNode(item.id)}>
                      {item.level > 0 && <span className="w-3 border-t border-slate-200 flex-shrink-0" />}
                      {item.hasChildren ? (
                        <button onClick={e => { e.stopPropagation(); toggleNode(item.id); }} className="ui-icon-btn w-5 h-5 flex-shrink-0">
                          {item.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      ) : <span className="w-5 flex-shrink-0" />}

                      <span className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${genderTint(n.gender)}`}>
                        {n.name.slice(-1)}
                      </span>
                      <span className="text-[13px] font-semibold text-slate-800 truncate">{n.name}</span>
                      <span className="text-[11px] text-slate-400 flex-shrink-0">{genderSym(n.gender)}</span>
                      <span className="ui-chip bg-gilt-100 text-gilt-700 num">第{n.generation}世</span>
                      {n.generation_char && <span className="ui-chip bg-cinnabar-50 text-cinnabar-700">{n.generation_char}</span>}
                      {item.hasChildren && <span className="ui-chip bg-qing-100 text-qing-700 num hidden sm:inline-flex">{n.children.length} 子嗣</span>}

                      {n.spouse_name && (
                        <span className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-dashed border-slate-300 bg-paper flex-shrink-0">
                          <span className="text-[9px] text-slate-400">配</span>
                          <span className="text-xs font-medium text-slate-600 font-display">{n.spouse_name}</span>
                          {n.spouse_origin && <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{n.spouse_origin}</span>}
                        </span>
                      )}

                      {isAdmin && (
                        <Link to={`/members/edit/${item.id}`} className="ui-icon-btn ml-auto flex-shrink-0" title="编辑" onClick={e => e.stopPropagation()}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FamilyTree;