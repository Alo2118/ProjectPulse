import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { canAccessUserManagement, canAccessTemplates } from './utils/permissions';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import DipendenteDashboard from './pages/DipendenteDashboard';
import DirezioneDashboard from './pages/DirezioneDashboard';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';

// Lazy load heavy pages to reduce initial bundle
const GanttPage = lazy(() => import('./pages/GanttPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const TimeTrackingPage = lazy(() => import('./pages/TimeTrackingPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const TemplateManagerPage = lazy(() => import('./pages/TemplateManagerPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));

function PrivateRoute({ children, requirePermission = null }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-auto lg:ml-64">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-cyan-300">Caricamento...</div>
            </div>
          }
        >
          {children}
        </Suspense>
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
      <ThemeProvider>
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
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <AppLayout>
                  <ReportsPage />
                </AppLayout>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
