import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api, onAuthChange } from './api/client';
import { User } from './types';
import LoginPage from './pages/LoginPage';
import DashboardV2 from './pages/DashboardV2';
import FamilyTree from './pages/FamilyTree';
import FamilyTreeV2 from './pages/FamilyTreeV2';
import FamilyTreeCanvas from './pages/FamilyTreeCanvas';
import MemberList from './pages/MemberList';
import MemberForm from './pages/MemberForm';
import SimpleMemberForm from './pages/SimpleMemberForm';
import BatchMemberForm from './pages/BatchMemberForm';
import BatchEditMemberForm from './pages/BatchEditMemberForm';
import AccountManagement from './pages/AccountManagement';
import GenerationCharManagement from './pages/GenerationCharManagement';
import Gallery from './pages/Gallery';
import AdminRoute from './components/AdminRoute';

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

  return (
    <HashRouter>
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
          element={user ? <AdminRoute user={user}><SimpleMemberForm user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/members/batch"
          element={user ? <AdminRoute user={user}><BatchMemberForm user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/members/batch-edit"
          element={user ? <AdminRoute user={user}><BatchEditMemberForm user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/members/edit/:id"
          element={user ? <AdminRoute user={user}><MemberForm user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/accounts"
          element={user ? <AdminRoute user={user}><AccountManagement user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/generation-chars"
          element={user ? <AdminRoute user={user}><GenerationCharManagement user={user} /></AdminRoute> : <Navigate to="/login" />}
        />
        <Route
          path="/gallery"
          element={user ? <Gallery user={user} /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={user ? "/dashboard-v2" : "/login"} />} />
      </Routes>
    </HashRouter>
  );
}

export default App;