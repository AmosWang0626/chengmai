import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, UserPlus, Mail, Shield, AlertCircle, X, CheckCircle, Edit2, Save, UserCog, Lock, Key } from 'lucide-react';

type UserRole = 'admin' | 'editor' | 'viewer';

interface AccountManagementProps {
  user: User | null;
}

interface UserAccount {
  id: number;
  username: string;
  created_at: string;
  role: UserRole;
}

export default function AccountManagement({ user }: AccountManagementProps) {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [currentPassword, setCurrentPassword] = useState('');
  const [changePasswordNew, setChangePasswordNew] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchAccounts = async () => {
    try {
      const users = await api.getUsers();
      const formattedAccounts = (users || []).map(u => ({
        id: u.id,
        username: u.username || '',
        created_at: u.created_at || '',
        role: (u.role === 'admin' || u.role === 'editor' ? u.role : 'viewer') as UserRole,
      }));
      setAccounts(formattedAccounts);
    } catch (err) {
      console.error('获取账号失败:', err);
      setError('获取账号列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');
    setSuccess('');

    if (newEmail.length < 4) {
      setError('账号长度至少4位');
      setCreateLoading(false);
      return;
    }

    try {
      await api.createUser(newEmail, newPassword, newRole);
      setSuccess('账号创建成功');
      setNewEmail('');
      setNewPassword('');
      setNewRole('viewer');
      setShowCreateModal(false);
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建账号失败');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    setEditLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.updateUserRole(editingAccount.id, editRole);
      setSuccess('账号信息更新成功');
      setShowEditModal(false);
      setEditingAccount(null);
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新账号失败');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = (account: UserAccount) => {
    setEditingAccount(account);
    setEditRole(account.role);
    setShowEditModal(true);
  };

  const openChangePasswordModal = () => {
    setCurrentPassword('');
    setChangePasswordNew('');
    setConfirmPassword('');
    setShowChangePasswordModal(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordLoading(true);
    setError('');
    setSuccess('');

    if (!currentPassword.trim()) {
      setError('请输入当前密码');
      setChangePasswordLoading(false);
      return;
    }

    if (changePasswordNew.length < 6) {
      setError('新密码长度至少6位');
      setChangePasswordLoading(false);
      return;
    }

    if (changePasswordNew !== confirmPassword) {
      setError('两次输入的新密码不一致');
      setChangePasswordLoading(false);
      return;
    }

    try {
      await api.changePassword(currentPassword, changePasswordNew);
      setSuccess('密码修改成功');
      setShowChangePasswordModal(false);
      setCurrentPassword('');
      setChangePasswordNew('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改密码失败');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleDeleteAccount = async (id: number) => {
    try {
      await api.deleteUser(id);
      setAccounts(accounts.filter(a => a.id !== id));
      setDeleteConfirmId(null);
      setSuccess('账号删除成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除账号失败');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getRoleLabel = (role: UserRole) => {
    if (role === 'admin') return '管理员';
    if (role === 'editor') return '编辑';
    return '普通用户';
  };

  const getRoleColor = (role: UserRole) => {
    if (role === 'admin') return 'bg-cinnabar-50 text-cinnabar-700';
    if (role === 'editor') return 'bg-gilt-100 text-gilt-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <Layout user={user} title="账号管理">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900">账号管理</h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">管理系统登录账号及权限</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openChangePasswordModal}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-card border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">修改密码</span>
              <span className="sm:hidden">改密</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-cinnabar-600 text-paper-card rounded-xl hover:bg-cinnabar-700 transition-colors shadow-lg shadow-violet-200"
            >
              <UserPlus className="w-4 h-4" />
              创建账号
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 移动端卡片列表 */}
        <div className="block sm:hidden space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cinnabar-600 mx-auto"></div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 ui-card">
              <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>暂无账号</p>
            </div>
          ) : (
            accounts.map((account) => (
              <div key={account.id} className="ui-card p-4">
                <div className="flex items-start gap-3">
                  <div className={`ui-avatar w-10 h-10 ${getRoleColor(account.role)}`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{account.username}</span>
                      {account.id === user?.id && (
                        <span className="px-1.5 py-px bg-cinnabar-50 text-cinnabar-700 rounded text-[11px]">
                          我
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className={`px-1.5 py-px rounded ${getRoleColor(account.role)}`}>
                        {getRoleLabel(account.role)}
                      </span>
                      <span>{formatDate(account.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => openEditModal(account)}
                        className="flex-1 py-2 text-center text-cinnabar-600 hover:bg-cinnabar-50 rounded-lg transition-colors text-sm"
                      >
                        编辑
                      </button>
                      {account.id !== user?.id && (
                        <button
                          onClick={() => setDeleteConfirmId(account.id)}
                          className="flex-1 py-2 text-center text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 桌面端表格 */}
        <div className="hidden sm:block ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">账号</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">角色</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-700">创建时间</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cinnabar-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>暂无账号</p>
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`ui-avatar w-10 h-10 ${getRoleColor(account.role)}`}>
                            <Mail className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-slate-900">{account.username}</span>
                          {account.id === user?.id && (
                            <span className="px-1.5 py-px bg-cinnabar-50 text-cinnabar-700 rounded text-[11px]">
                              当前账号
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded text-[11px] font-medium ${getRoleColor(account.role)}`}>
                          {getRoleLabel(account.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(account.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(account)}
                            className="p-2 text-slate-400 hover:text-cinnabar-600 hover:bg-cinnabar-50 rounded-lg transition-colors"
                            title="编辑账号"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          {account.id !== user?.id && (
                            <button
                              onClick={() => setDeleteConfirmId(account.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除账号"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-paper-card rounded-xl shadow-lift w-full max-w-md overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-cinnabar-600" />
                    创建新账号
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateAccount} className="p-4 space-y-3">
                  <div>
                    <label className="ui-label">
                      账号
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cinnabar-100 focus:border-transparent outline-none transition-all"
                        placeholder="请输入账号（至少4位）"
                        minLength={4}
                        required
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">账号长度至少4位，支持任意字符</p>
                  </div>

                  <div>
                    <label className="ui-label">
                      密码
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="ui-input"
                      placeholder="请输入密码（至少6位）"
                      minLength={6}
                      required
                    />
                  </div>

                  <div>
                    <label className="ui-label">
                      角色
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewRole('viewer')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-[13px] ${
                          newRole === 'viewer'
                            ? 'border-violet-500 bg-cinnabar-50 text-cinnabar-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium">普通用户</div>
                        <div className="text-xs text-slate-500 mt-1">仅可查看</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRole('editor')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-[13px] ${
                          newRole === 'editor'
                            ? 'border-violet-500 bg-cinnabar-50 text-cinnabar-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium">编辑</div>
                        <div className="text-xs text-slate-500 mt-1">维护成员与字辈</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRole('admin')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-[13px] ${
                          newRole === 'admin'
                            ? 'border-violet-500 bg-cinnabar-50 text-cinnabar-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium">管理员</div>
                        <div className="text-xs text-slate-500 mt-1">可编辑管理</div>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="ui-btn-outline flex-1 h-9"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="ui-btn-primary flex-1 h-9"
                    >
                      {createLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          创建中...
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          创建账号
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEditModal && editingAccount && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-paper-card rounded-xl shadow-lift w-full max-w-md overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <UserCog className="w-6 h-6 text-cinnabar-600" />
                    编辑账号
                  </h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleEditAccount} className="p-4 space-y-3">
                  <div>
                    <label className="ui-label">
                      账号
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={editingAccount.username}
                        disabled
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="ui-label">
                      角色
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setEditRole('viewer')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-[13px] ${
                          editRole === 'viewer'
                            ? 'border-violet-500 bg-cinnabar-50 text-cinnabar-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium">普通用户</div>
                        <div className="text-xs text-slate-500 mt-1">仅可查看</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditRole('editor')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-[13px] ${
                          editRole === 'editor'
                            ? 'border-violet-500 bg-cinnabar-50 text-cinnabar-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium">编辑</div>
                        <div className="text-xs text-slate-500 mt-1">维护成员与字辈</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditRole('admin')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all text-[13px] ${
                          editRole === 'admin'
                            ? 'border-violet-500 bg-cinnabar-50 text-cinnabar-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium">管理员</div>
                        <div className="text-xs text-slate-500 mt-1">可编辑管理</div>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="ui-btn-outline flex-1 h-9"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="ui-btn-primary flex-1 h-9"
                    >
                      {editLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          保存修改
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteConfirmId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setDeleteConfirmId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-paper-card rounded-xl shadow-lift w-full max-w-sm p-4"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 mb-2">确认删除</h3>
                  <p className="text-slate-500 mb-6">
                    确定要删除该账号吗？此操作不可恢复。
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="ui-btn-outline flex-1 h-9"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(deleteConfirmId)}
                      className="ui-btn flex-1 h-9 bg-red-600 text-paper-card hover:bg-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showChangePasswordModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowChangePasswordModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-paper-card rounded-xl shadow-lift w-full max-w-md overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-cinnabar-600" />
                    修改密码
                  </h2>
                  <button
                    onClick={() => setShowChangePasswordModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleChangePassword} className="p-4 space-y-3">
                  <div>
                    <label className="ui-label">
                      当前密码
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="ui-input"
                      placeholder="请输入当前密码"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div>
                    <label className="ui-label">
                      新密码
                    </label>
                    <input
                      type="password"
                      value={changePasswordNew}
                      onChange={(e) => setChangePasswordNew(e.target.value)}
                      className="ui-input"
                      placeholder="请输入新密码（至少6位）"
                      minLength={6}
                      required
                    />
                  </div>

                  <div>
                    <label className="ui-label">
                      确认新密码
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="ui-input"
                      placeholder="请再次输入新密码"
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowChangePasswordModal(false)}
                      className="ui-btn-outline flex-1 h-9"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={changePasswordLoading}
                      className="ui-btn-primary flex-1 h-9"
                    >
                      {changePasswordLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          确认修改
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
