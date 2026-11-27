import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Plus, Edit2, Trash2, Eye, EyeOff, Save, X, BookOpen } from 'lucide-react';
import { api } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { ConfirmDialog, InlineNotice } from '../components/Feedback';
import { useFamilyMembers } from '../hooks/useFamilyMembers';

interface GenerationChar {
  id: number;
  generation: number;
  char: string;
  hidden: boolean;
  created_at: string | null;
}

interface GenerationCharManagementProps {
  user: User | null;
}

export default function GenerationCharManagement({ user }: GenerationCharManagementProps) {
  const [chars, setChars] = useState<GenerationChar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ generation: 1, char: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ generation: 1, char: '' });
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GenerationChar | null>(null);
  const { refresh: refreshFamily } = useFamilyMembers(user?.id);

  const fetchChars = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const data = await api.getGenerationChars();
      setChars(data || []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '获取字辈数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChars();
  }, []);

  const handleToggleHidden = async (id: number, currentHidden: boolean) => {
    setError('');
    try {
      await api.updateGenerationChar(id, { hidden: !currentHidden });
      setChars(prev => prev.map(c => c.id === id ? { ...c, hidden: !currentHidden } : c));
      void refreshFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换隐藏状态失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setError('');
    try {
      await api.deleteGenerationChar(deleteTarget.id);
      setChars(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      void refreshFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除字辈失败');
    }
  };

  const handleEdit = (char: GenerationChar) => {
    setEditingId(char.id);
    setEditForm({ generation: char.generation, char: char.char });
  };

  const handleSaveEdit = async () => {
    if (!editForm.char.trim()) {
      setError('字辈不能为空');
      return;
    }
    setError('');
    try {
      await api.updateGenerationChar(editingId!, { generation: editForm.generation, char: editForm.char.trim() });
      setChars(prev => prev.map(c => c.id === editingId ? { ...c, generation: editForm.generation, char: editForm.char.trim() } : c));
      setEditingId(null);
      void refreshFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存编辑失败');
    }
  };

  const handleAdd = async () => {
    if (!addForm.char.trim()) {
      setError('字辈不能为空');
      return;
    }
    setError('');
    try {
      const data = await api.createGenerationChar({ generation: addForm.generation, char: addForm.char.trim(), hidden: false });
      setChars(prev => [...prev, data].sort((a, b) => a.generation - b.generation));
      setIsAdding(false);
      setAddForm({ generation: 1, char: '' });
      void refreshFamily();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加字辈失败');
    }
  };

  const visibleChars = showHidden ? chars : chars.filter(c => !c.hidden);
  const hiddenCount = chars.filter(c => c.hidden).length;

  return (
    <Layout user={user} title="字辈管理">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ui-card p-3 sm:p-4"
      >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-cinnabar-50 rounded-xl flex items-center justify-center">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-cinnabar-600" />
              </div>
              字辈管理
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHidden(!showHidden)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs sm:text-sm text-slate-600 hover:text-cinnabar-600 transition-colors"
              >
                {showHidden ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                {showHidden ? '隐藏已隐藏' : '显示全部'}
                {hiddenCount > 0 && <span className="ui-chip bg-slate-200 text-slate-600">{hiddenCount}</span>}
              </button>
              <button
                onClick={() => {
                  setAddForm({ generation: (chars.length ? Math.max(...chars.map(c => c.generation)) : 0) + 1, char: '' });
                  setIsAdding(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-cinnabar-600 text-paper-card rounded-lg hover:bg-cinnabar-700 transition-colors text-xs sm:text-sm"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                新增
              </button>
            </div>
          </div>

          {loadError && <div className="mb-4"><InlineNotice message={loadError} onRetry={() => void fetchChars()} /></div>}
          {error && (
            <div role="alert" className="mb-4 px-3 py-2 bg-cinnabar-50 text-cinnabar-700 rounded-lg text-xs border border-cinnabar-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-cinnabar-600">加载中...</div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {isAdding && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-cinnabar-50 rounded-xl p-4 mb-4"
                  >
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="ui-label">辈份</label>
                        <input
                          type="number"
                          min={1}
                          value={addForm.generation}
                          onChange={e => setAddForm({ ...addForm, generation: parseInt(e.target.value) || 1 })}
                          className="ui-input"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="ui-label">字辈</label>
                        <input
                          type="text"
                          value={addForm.char}
                          onChange={e => setAddForm({ ...addForm, char: e.target.value })}
                          placeholder="输入字辈"
                          className="ui-input"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          onClick={handleAdd}
                          disabled={!addForm.char.trim()}
                          className="px-4 py-2 bg-cinnabar-600 text-paper-card rounded-lg hover:bg-cinnabar-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" />
                          保存
                        </button>
                        <button
                          onClick={() => { setIsAdding(false); setAddForm({ generation: 1, char: '' }); }}
                          className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 gap-2">
                {visibleChars.map((char) => (
                  <motion.div
                    key={char.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-all ${
                      char.hidden ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-paper-card border-slate-200 hover:border-cinnabar-300'
                    }`}
                  >
                    {editingId === char.id ? (
                      <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:gap-3">
                        <input
                          type="number"
                          min={1}
                          value={editForm.generation}
                          onChange={e => setEditForm({ ...editForm, generation: parseInt(e.target.value) || 1 })}
                          className="ui-input w-20 h-7 px-2 text-xs"
                        />
                        <input
                          type="text"
                          value={editForm.char}
                          onChange={e => setEditForm({ ...editForm, char: e.target.value })}
                          className="ui-input flex-1 h-7 px-2 text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-500">第{char.generation}世</span>
                          <span className="text-lg font-bold text-cinnabar-700">{char.char}</span>
                          <span className="text-sm text-slate-400">字辈</span>
                          {char.hidden && (
                            <span className="text-xs bg-slate-200 text-slate-500 px-1.5 py-px rounded">已隐藏</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleHidden(char.id, char.hidden)}
                            className={`p-2 rounded-lg transition-colors ${
                              char.hidden ? 'text-slate-400 hover:text-cinnabar-600 hover:bg-cinnabar-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                            }`}
                            title={char.hidden ? '显示' : '隐藏'}
                          >
                            {char.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEdit(char)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(char)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>

              {visibleChars.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>暂无字辈数据</p>
                  <p className="text-sm mt-1">点击上方"新增"按钮添加字辈</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      <ConfirmDialog open={deleteTarget !== null} title="删除字辈"
        message={`确定要删除第${deleteTarget?.generation ?? ''}世「${deleteTarget?.char ?? ''}」字辈吗？`}
        confirmText="删除" onConfirm={() => void handleDelete()} onCancel={() => setDeleteTarget(null)} />
    </Layout>
  );
}
