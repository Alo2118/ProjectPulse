import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { Skeleton } from '@/components/ui/skeleton'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import LoginPage from '@/pages/auth/LoginPage'
import HomePage from '@/pages/home/HomePage'

const ProjectListPage = lazy(() => import('@/pages/projects/ProjectListPage'))
const ProjectDetailPage = lazy(() => import('@/pages/projects/ProjectDetailPage'))
const ProjectFormPage = lazy(() => import('@/pages/projects/ProjectFormPage'))
const TaskListPage = lazy(() => import('@/pages/tasks/TaskListPage'))
const TaskDetailPage = lazy(() => import('@/pages/tasks/TaskDetailPage'))
const TaskFormPage = lazy(() => import('@/pages/tasks/TaskFormPage'))
const TimeTrackingPage = lazy(() => import('@/pages/time-tracking/TimeTrackingPage'))
const UserInputListPage = lazy(() => import('@/pages/inputs/UserInputListPage'))
const UserInputDetailPage = lazy(() => import('@/pages/inputs/UserInputDetailPage'))
const RiskListPage = lazy(() => import('@/pages/risks/RiskListPage'))
const RiskDetailPage = lazy(() => import('@/pages/risks/RiskDetailPage'))
const RiskFormPage = lazy(() => import('@/pages/risks/RiskFormPage'))
const DocumentListPage = lazy(() => import('@/pages/documents/DocumentListPage'))
const DocumentDetailPage = lazy(() => import('@/pages/documents/DocumentDetailPage'))
const DocumentFormPage = lazy(() => import('@/pages/documents/DocumentFormPage'))
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage'))
const PlanningDashboardPage = lazy(() => import('@/pages/planning/PlanningDashboardPage'))
const PlanningWizardPage = lazy(() => import('@/pages/planning/PlanningWizardPage'))
const WeeklyReportPage = lazy(() => import('@/pages/reports/WeeklyReportPage'))
const UserListPage = lazy(() => import('@/pages/admin/UserListPage'))
const UserFormPage = lazy(() => import('@/pages/admin/UserFormPage'))
const UserDetailPage = lazy(() => import('@/pages/admin/UserDetailPage'))
const DepartmentListPage = lazy(() => import('@/pages/admin/DepartmentListPage'))
const AdminConfigPage = lazy(() => import('@/pages/admin/AdminConfigPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))
const AcceptInvitationPage = lazy(() => import('@/pages/auth/AcceptInvitationPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="space-y-4 w-full max-w-md p-8">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useCurrentUser()

  if (isLoading) return <PageLoader />
  if (!user || isError) return <Navigate to="/login" replace />

  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<AcceptInvitationPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/projects" element={<ProjectListPage />} />
                  <Route path="/projects/new" element={<ProjectFormPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />
                  <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
                  <Route path="/tasks" element={<TaskListPage />} />
                  <Route path="/tasks/new" element={<TaskFormPage />} />
                  <Route path="/tasks/:id" element={<TaskDetailPage />} />
                  <Route path="/tasks/:id/edit" element={<TaskFormPage />} />
                  <Route path="/time-tracking" element={<TimeTrackingPage />} />
                  <Route path="/inputs" element={<UserInputListPage />} />
                  <Route path="/inputs/:id" element={<UserInputDetailPage />} />
                  <Route path="/risks" element={<RiskListPage />} />
                  <Route path="/risks/new" element={<RiskFormPage />} />
                  <Route path="/risks/:id" element={<RiskDetailPage />} />
                  <Route path="/risks/:id/edit" element={<RiskFormPage />} />
                  <Route path="/documents" element={<DocumentListPage />} />
                  <Route path="/documents/new" element={<DocumentFormPage />} />
                  <Route path="/documents/:id" element={<DocumentDetailPage />} />
                  <Route path="/documents/:id/edit" element={<DocumentFormPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/planning" element={<PlanningDashboardPage />} />
                  <Route path="/planning/wizard" element={<PlanningWizardPage />} />
                  <Route path="/reports" element={<WeeklyReportPage />} />
                  <Route path="/admin/users" element={<UserListPage />} />
                  <Route path="/admin/users/new" element={<UserFormPage />} />
                  <Route path="/admin/users/:id" element={<UserDetailPage />} />
                  <Route path="/admin/users/:id/edit" element={<UserFormPage />} />
                  <Route path="/admin/departments" element={<DepartmentListPage />} />
                  <Route path="/admin/config" element={<AdminConfigPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
