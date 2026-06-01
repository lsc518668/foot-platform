import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuthStore } from './stores/adminAuthStore';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MatchesPage from './pages/MatchesPage';
import TeamsPage from './pages/TeamsPage';
import OddsPage from './pages/OddsPage';
import UsersPage from './pages/UsersPage';
import SettlementsPage from './pages/SettlementsPage';
import BetsPage from './pages/BetsPage';
import ConfigPage from './pages/ConfigPage';
import AuditLogPage from './pages/AuditLogPage';
import AdminNewsPage from './pages/NewsPage';

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const { init } = useAdminAuthStore();
  useEffect(() => { init(); }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedAdminRoute>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/matches" element={<MatchesPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/odds" element={<OddsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settlements" element={<SettlementsPage />} />
                <Route path="/bets" element={<BetsPage />} />
                <Route path="/config" element={<ConfigPage />} />
                <Route path="/audit" element={<AuditLogPage />} />
                <Route path="/admin-news" element={<AdminNewsPage />} />
              </Routes>
            </AdminLayout>
          </ProtectedAdminRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
