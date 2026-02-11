import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useAuthInit } from '@hooks/useAuthInit'

// Layouts
import AuthLayout from '@components/layout/AuthLayout'
import DashboardLayout from '@components/layout/DashboardLayout'

// Auth Pages
import LoginPage from '@pages/auth/LoginPage'

// Dashboard Pages
import DashboardPage from '@pages/dipendente/DashboardPage'

// Projects Pages
import ProjectListPage from '@pages/projects/ProjectListPage'
import ProjectDetailPage from '@pages/projects/ProjectDetailPage'
import ProjectFormPage from '@pages/projects/ProjectFormPage'

// Tasks Pages
import TaskListPage from '@pages/tasks/TaskListPage'
import TaskDetailPage from '@pages/tasks/TaskDetailPage'
import TaskFormPage from '@pages/tasks/TaskFormPage'

// Time Tracking Pages
import TimeTrackingPage from '@pages/time-tracking/TimeTrackingPage'
import TeamTimePage from '@pages/time-tracking/TeamTimePage'

// Kanban Pages
import KanbanBoardPage from '@pages/kanban/KanbanBoardPage'

// Risks Pages
import RiskListPage from '@pages/risks/RiskListPage'
import RiskDetailPage from '@pages/risks/RiskDetailPage'
import RiskFormPage from '@pages/risks/RiskFormPage'

// User Inputs Pages
import UserInputListPage from '@pages/inputs/UserInputListPage'
import UserInputDetailPage from '@pages/inputs/UserInputDetailPage'

// Documents Pages
import DocumentListPage from '@pages/documents/DocumentListPage'
import DocumentDetailPage from '@pages/documents/DocumentDetailPage'
import DocumentFormPage from '@pages/documents/DocumentFormPage'

// Users Pages
import UserListPage from '@pages/users/UserListPage'
import UserFormPage from '@pages/users/UserFormPage'

// Profile Page
import ProfilePage from '@pages/profile/ProfilePage'

// Analytics Pages
import AnalyticsPage from '@pages/analytics/AnalyticsPage'

// Reports Pages
import WeeklyReportPage from '@pages/reports/WeeklyReportPage'

// Gantt Pages
import GanttPage from '@pages/gantt/GanttPage'

// Not Found
import NotFoundPage from '@pages/NotFoundPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()
  const location = useLocation()

  // Listen for logout events and redirect immediately
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login') {
      console.log('[Auth] User logged out, redirecting to login')
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate, location.pathname])

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { isInitialized, isValidating } = useAuthInit()

  if (!isInitialized || isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Verifica sessione...
          </span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function App() {
  return (
    <AuthInitializer>
      <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Dashboard Routes */}
      <Route
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/new" element={<ProjectFormPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
        <Route path="/tasks" element={<TaskListPage />} />
        <Route path="/tasks/new" element={<TaskFormPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
        <Route path="/tasks/:id/edit" element={<TaskFormPage />} />
        <Route path="/time-tracking" element={<TimeTrackingPage />} />
        <Route path="/team-time" element={<TeamTimePage />} />
        <Route path="/kanban" element={<KanbanBoardPage />} />
        <Route path="/gantt" element={<GanttPage />} />
        <Route path="/risks" element={<RiskListPage />} />
        <Route path="/risks/new" element={<RiskFormPage />} />
        <Route path="/risks/:id" element={<RiskDetailPage />} />
        <Route path="/risks/:id/edit" element={<RiskFormPage />} />
        <Route path="/inputs" element={<UserInputListPage />} />
        <Route path="/inputs/:id" element={<UserInputDetailPage />} />
        <Route path="/documents" element={<DocumentListPage />} />
        <Route path="/documents/new" element={<DocumentFormPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/documents/:id/edit" element={<DocumentFormPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reports/weekly" element={<WeeklyReportPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users" element={<UserListPage />} />
        <Route path="/users/new" element={<UserFormPage />} />
        <Route path="/users/:id/edit" element={<UserFormPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </AuthInitializer>
  )
}

export default App
