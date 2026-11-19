import React, { useState } from 'react';
import { api } from '../api/client';
import { motion } from 'framer-motion';
import { Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="w-full max-w-sm">
        <div className="ui-card p-6">
          <div className="text-center mb-6">
            <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
              className="seal w-14 h-14 text-2xl mx-auto mb-3 shadow-card">承</motion.span>
            <h1 className="font-display text-xl font-bold text-slate-900 tracking-wide">承脉 · 世系传承</h1>
            <p className="text-xs text-slate-500 mt-1.5">记录家族传承，珍藏亲情记忆</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="ui-label">账号</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={email} onChange={e => setEmail(e.target.value)}
                  className="ui-input pl-8" placeholder="请输入账号" required />
              </div>
            </div>

            <div>
              <label className="ui-label">密码</label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="ui-input pl-8" placeholder="请输入密码" required />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="px-3 py-2 bg-cinnabar-50 text-cinnabar-700 rounded-lg text-xs border border-cinnabar-200">
                {error}
              </motion.div>
            )}

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={loading} className="ui-btn-primary w-full h-9">
              {loading ? '登录中...' : '登录'}
            </motion.button>
          </form>

          <p className="mt-5 text-center text-[11px] text-slate-400">请联系管理员获取账号</p>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400 font-display tracking-widest">
          朱砂为记 · 宣纸为承
        </p>
      </motion.div>
    </div>
  );
}