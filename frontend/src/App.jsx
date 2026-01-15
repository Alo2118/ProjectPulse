import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { canAccessUserManagement, canAccessTemplates } from './utils/permissions';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import DipendenteDashboard from './pages/DipendenteDashboard';
import DirezioneDashboard from './pages/DirezioneDashboard';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import GanttPage from './pages/GanttPage';
import CalendarPage from './pages/CalendarPage';
import UserManagementPage from './pages/UserManagementPage';
import TimeTrackingPage from './pages/TimeTrackingPage';
import InboxPage from './pages/InboxPage';
import TemplateManagerPage from './pages/TemplateManagerPage';

function PrivateRoute({ children, requirePermission = null }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Caricamento...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check specific permission if required
  if (requirePermission && !requirePermission(user)) {
    return <Navigate to="/" />;
  }

  return children;
}

function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto lg:ml-0">
        {children}
      </main>
    </div>
  );
}

function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === 'direzione') {
    return <DirezioneDashboard />;
  }

  return <DipendenteDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppLayout>
                  <DashboardRouter />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <PrivateRoute>
                <AppLayout>
                  <ProjectsPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <PrivateRoute>
                <AppLayout>
                  <ProjectDetailPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/gantt"
            element={
              <PrivateRoute>
                <AppLayout>
                  <GanttPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <PrivateRoute>
                <AppLayout>
                  <CalendarPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/time-tracking"
            element={
              <PrivateRoute requirePermission={(user) => user?.role !== 'direzione'}>
                <AppLayout>
                  <TimeTrackingPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <PrivateRoute>
                <AppLayout>
                  <InboxPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute requirePermission={canAccessUserManagement}>
                <AppLayout>
                  <UserManagementPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <PrivateRoute requirePermission={canAccessTemplates}>
                <AppLayout>
                  <TemplateManagerPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
