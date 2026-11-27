import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import MemberBatchEditor from '../components/MemberBatchEditor';
import { ROUTES } from '../routes';

export default function BatchMemberForm({ user }: { user: User | null }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button type="button" onClick={() => navigate(ROUTES.members)}
          className="flex items-center gap-2 text-slate-600 hover:text-cinnabar-600 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          返回成员
        </button>

        <div className="ui-card p-3 sm:p-4">
          <h1 className="font-display text-xl font-bold text-slate-900 flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cinnabar-50 rounded-xl flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-cinnabar-600" />
            </div>
            批量添加家人
          </h1>
          <MemberBatchEditor user={user} onCancel={() => navigate(ROUTES.members)}
            onSaved={() => setTimeout(() => navigate(ROUTES.members), 300)} />
        </div>
      </div>
    </div>
  );
}
