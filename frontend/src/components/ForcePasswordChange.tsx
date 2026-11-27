import React, { useState } from 'react';
import { Lock, Key } from 'lucide-react';
import { api } from '../api/client';

interface ForcePasswordChangeProps {
  username: string;
}

export default function ForcePasswordChange({ username }: ForcePasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!currentPassword) {
      setError('请输入当前密码');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-paper-card rounded-xl shadow-lift w-full max-w-md p-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-5 h-5 text-cinnabar-600" />
          <h2 className="text-lg font-bold text-slate-800">请修改初始密码</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">账号 {username} 仍在使用初始密码，修改后才能继续使用。</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="ui-label" htmlFor="current-password">当前密码</label>
            <input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="ui-input" autoComplete="current-password" required />
          </div>
          <div>
            <label className="ui-label" htmlFor="new-password">新密码</label>
            <input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="ui-input" placeholder="至少 6 位" autoComplete="new-password" minLength={6} required />
          </div>
          <div>
            <label className="ui-label" htmlFor="confirm-password">确认新密码</label>
            <input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="ui-input" autoComplete="new-password" minLength={6} required />
          </div>
          {error && <div className="px-3 py-2 bg-cinnabar-50 text-cinnabar-700 rounded-lg text-xs border border-cinnabar-200">{error}</div>}
          <button type="submit" disabled={loading} className="ui-btn-primary w-full h-9">
            <Key className="w-4 h-4" />{loading ? '保存中…' : '修改并继续'}
          </button>
        </form>
      </div>
    </div>
  );
}
