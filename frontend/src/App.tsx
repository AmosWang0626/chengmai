import React, { lazy, Suspense, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api, onAuthChange } from './api/client';
import { User } from './types';
import AdminRoute from './components/AdminRoute';
import ForcePasswordChange from './components/ForcePasswordChange';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardV2 = lazy(() => import('./pages/DashboardV2'));
const FamilyTree = lazy(() => import('./pages/FamilyTree'));
const FamilyTreeV2 = lazy(() => import('./pages/FamilyTreeV2'));
const FamilyTreeCanvas = lazy(() => import('./pages/FamilyTreeCanvas'));
const MemberList = lazy(() => import('./pages/MemberList'));
const MemberForm = lazy(() => import('./pages/MemberForm'));
const SimpleMemberForm = lazy(() => import('./pages/SimpleMemberForm'));
const BatchMemberForm = lazy(() => import('./pages/BatchMemberForm'));
const BatchEditMemberForm = lazy(() => import('./pages/BatchEditMemberForm'));
const AccountManagement = lazy(() => import('./pages/AccountManagement'));
const GenerationCharManagement = lazy(() => import('./pages/GenerationCharManagement'));
const Gallery = lazy(() => import('./pages/Gallery'));

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
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard-v2" /> : <LoginPage />}
        />
        <Route
          path="/dashboard"
          element={user ? <DashboardV2 user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard-v2"
          element={user ? <DashboardV2 user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/tree-canvas"
          element={user ? <FamilyTreeCanvas user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/tree"
          element={user ? <FamilyTree user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/tree-v2"
          element={user ? <FamilyTreeV2 user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/members"
          element={user ? <MemberList user={user} /> : <Navigate to="/login" />}
        />
        <Route
          path="/members/new"
          element={user ? <AdminRoute user={user} allowEditor><SimpleMemberForm user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/members/batch"
          element={user ? <AdminRoute user={user} allowEditor><BatchMemberForm user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/members/batch-edit"
          element={user ? <AdminRoute user={user} allowEditor><BatchEditMemberForm user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/members/edit/:id"
          element={user ? <AdminRoute user={user} allowEditor><MemberForm user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/accounts"
          element={user ? <AdminRoute user={user}><AccountManagement user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/generation-chars"
          element={user ? <AdminRoute user={user} allowEditor><GenerationCharManagement user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/gallery"
          element={user ? <Gallery user={user} /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={user ? "/dashboard-v2" : "/login"} />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;