import React, { lazy, Suspense, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { api, onAuthChange } from './api/client';
import { User } from './types';
import AdminRoute from './components/AdminRoute';
import ForcePasswordChange from './components/ForcePasswordChange';
import { FamilyDataProvider } from './hooks/FamilyDataProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { ROUTES, memberEditPath } from './routes';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TreeGraphPage = lazy(() => import('./pages/TreeGraphPage'));
const MemberList = lazy(() => import('./pages/MemberList'));
const MemberForm = lazy(() => import('./pages/MemberForm'));
const BatchMemberForm = lazy(() => import('./pages/BatchMemberForm'));
const BatchEditMemberForm = lazy(() => import('./pages/BatchEditMemberForm'));
const AccountManagement = lazy(() => import('./pages/AccountManagement'));
const GenerationCharManagement = lazy(() => import('./pages/GenerationCharManagement'));
const Gallery = lazy(() => import('./pages/Gallery'));

type Permission = 'auth' | 'editor' | 'admin';

function ProtectedRoute({ user, permission = 'auth', children }: {
  user: User | null;
  permission?: Permission;
  children: React.ReactNode;
}) {
  if (!user) return <Navigate to={ROUTES.login} replace />;
  if (permission === 'auth') return <>{children}</>;
  return <AdminRoute user={user} allowEditor={permission === 'editor'}>{children}</AdminRoute>;
}

function LegacyRedirect({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

function LegacyTreeCanvasRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  params.delete('mode');
  if (mode === 'fan' || mode === 'traditional') params.set('style', mode);
  const search = params.toString();
  return <Navigate to={`${ROUTES.graph}${search ? `?${search}` : ''}`} replace />;
}

function LegacyMemberEditRedirect() {
  const { id } = useParams();
  return <Navigate to={memberEditPath(Number(id))} replace />;
}

function MemberBatchRoute({ user }: { user: User }) {
  const location = useLocation();
  const action = new URLSearchParams(location.search).get('action');
  return action === 'edit' ? <BatchEditMemberForm user={user} /> : <BatchMemberForm user={user} />;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.restoreSession().then(u => {
      setUser(u);
      setLoading(false);
    });
    return onAuthChange(u => setUser(u));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinnabar-600"></div>
      </div>
    );
  }

  if (user?.password_change_required) {
    return <ForcePasswordChange username={user.username} />;
  }

  return (
    <ErrorBoundary>
      <FamilyDataProvider>
        <HashRouter>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-paper" role="status" aria-live="polite">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinnabar-600" aria-hidden="true" />
                <span className="sr-only">页面加载中…</span>
              </div>
            }
          >
            <Routes>
              <Route path={ROUTES.login} element={user ? <Navigate to={ROUTES.dashboard} /> : <LoginPage />} />
              <Route path={ROUTES.dashboard} element={<ProtectedRoute user={user}><DashboardPage user={user} /></ProtectedRoute>} />
              <Route path={ROUTES.graph} element={<ProtectedRoute user={user}><TreeGraphPage user={user} /></ProtectedRoute>} />
              <Route path={ROUTES.members} element={<ProtectedRoute user={user}><MemberList user={user} /></ProtectedRoute>} />
              <Route path={ROUTES.memberNew} element={<ProtectedRoute user={user} permission="editor"><MemberForm user={user} /></ProtectedRoute>} />
              <Route path={ROUTES.memberEdit} element={<ProtectedRoute user={user} permission="editor"><MemberForm user={user} /></ProtectedRoute>} />
              <Route path={ROUTES.memberBatch} element={<ProtectedRoute user={user} permission="editor"><MemberBatchRoute user={user!} /></ProtectedRoute>} />
              <Route path={ROUTES.accounts} element={<ProtectedRoute user={user} permission="admin"><AccountManagement user={user} /></ProtectedRoute>} />
              <Route path={ROUTES.generationChars} element={<ProtectedRoute user={user} permission="editor"><GenerationCharManagement user={user} /></ProtectedRoute>} />
              <Route path={ROUTES.gallery} element={<ProtectedRoute user={user}><Gallery user={user} /></ProtectedRoute>} />

              <Route path="/dashboard-v2" element={<LegacyRedirect to={ROUTES.dashboard} />} />
              <Route path="/tree-canvas" element={<LegacyTreeCanvasRedirect />} />
              <Route path="/tree" element={<LegacyRedirect to={`${ROUTES.members}?view=tree`} />} />
              <Route path="/tree-v2" element={<LegacyRedirect to={`${ROUTES.members}?view=generations`} />} />
              <Route path="/members/batch-edit" element={<LegacyRedirect to={`${ROUTES.memberBatch}?action=edit`} />} />
              <Route path="/members/edit/:id" element={<LegacyMemberEditRedirect />} />
              <Route path="*" element={<Navigate to={user ? ROUTES.dashboard : ROUTES.login} replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </FamilyDataProvider>
    </ErrorBoundary>
  );
}

export default App;
