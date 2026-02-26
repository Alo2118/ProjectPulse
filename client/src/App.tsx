import { useEffect, lazy, Suspense, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useAuthInit } from '@hooks/useAuthInit'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

// Layouts (not lazy - needed immediately)
import AuthLayout from '@components/layout/AuthLayout'
import DashboardLayout from '@components/layout/DashboardLayout'

// Lazy-loaded pages
const LoginPage = lazy(() => import('@pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('@pages/dipendente/DashboardPage'))
const ProjectListPage = lazy(() => import('@pages/projects/ProjectListPage'))
const ProjectDetailPage = lazy(() => import('@pages/projects/ProjectDetailPage'))
const ProjectFormPage = lazy(() => import('@pages/projects/ProjectFormPage'))
const TaskListPage = lazy(() => import('@pages/tasks/TaskListPage'))
const TaskDetailPage = lazy(() => import('@pages/tasks/TaskDetailPage'))
const TaskFormPage = lazy(() => import('@pages/tasks/TaskFormPage'))
const TimeTrackingPage = lazy(() => import('@pages/time-tracking/TimeTrackingPage'))
const TeamTimePage = lazy(() => import('@pages/time-tracking/TeamTimePage'))
const RiskListPage = lazy(() => import('@pages/risks/RiskListPage'))
const RiskDetailPage = lazy(() => import('@pages/risks/RiskDetailPage'))
const RiskFormPage = lazy(() => import('@pages/risks/RiskFormPage'))
const UserInputListPage = lazy(() => import('@pages/inputs/UserInputListPage'))
const UserInputDetailPage = lazy(() => import('@pages/inputs/UserInputDetailPage'))
const DocumentListPage = lazy(() => import('@pages/documents/DocumentListPage'))
const DocumentDetailPage = lazy(() => import('@pages/documents/DocumentDetailPage'))
const DocumentFormPage = lazy(() => import('@pages/documents/DocumentFormPage'))
const UserListPage = lazy(() => import('@pages/users/UserListPage'))
const UserFormPage = lazy(() => import('@pages/users/UserFormPage'))
const ProfilePage = lazy(() => import('@pages/profile/ProfilePage'))
const AnalyticsPage = lazy(() => import('@pages/analytics/AnalyticsPage'))
const WeeklyReportPage = lazy(() => import('@pages/reports/WeeklyReportPage'))
const CalendarPage = lazy(() => import('@pages/calendar/CalendarPage'))
const NotFoundPage = lazy(() => import('@pages/NotFoundPage'))
const AuditTrailPage = lazy(() => import('@pages/audit/AuditTrailPage'))
const TemplateListPage = lazy(() => import('@pages/admin/TemplateListPage'))
const TemplateFormPage = lazy(() => import('@pages/admin/TemplateFormPage'))
const DepartmentListPage = lazy(() => import('@pages/admin/DepartmentListPage'))
const CustomFieldsPage = lazy(() => import('@pages/admin/CustomFieldsPage'))
const ImportPage = lazy(() => import('@pages/admin/ImportPage'))
const WorkflowEditorPage = lazy(() => import('@pages/admin/WorkflowEditorPage'))
const AutomationListPage = lazy(() => import('@pages/admin/AutomationListPage'))
const AutomationEditorPage = lazy(() => import('@pages/admin/AutomationEditorPage'))
const AcceptInvitationPage = lazy(() => import('@pages/auth/AcceptInvitationPage'))
const NotificationCenterPage = lazy(() => import('@pages/notifications/NotificationCenterPage'))
const PlanningDashboardPage = lazy(() => import('@pages/planning/PlanningDashboardPage'))
const PlanningWizardPage = lazy(() => import('@pages/planning/PlanningWizardPage'))
const MyDayPage = lazy(() => import('@pages/my-day/MyDayPage'))

/** Suspense fallback for lazy-loaded pages */
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
    </div>
  )
}

/** Error Boundary - catches render errors in child components */
interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error already captured in state via getDerivedStateFromError
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-app)' }}>
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Qualcosa è andato storto
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              Si è verificato un errore imprevisto nell'applicazione.
            </p>
            {this.state.error && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="btn-primary flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Ricarica Pagina
              </button>
              <Link to="/dashboard" className="btn-secondary flex items-center"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()
  const location = useLocation()

  // Listen for logout events and redirect immediately
  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate, location.pathname])

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AuthInitializer({ children }: { children: ReactNode }) {
  const { isInitialized, isValidating } = useAuthInit()

  if (!isInitialized || isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-app)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Verifica sessione...
          </span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

/** Redirect / to /my-day for dipendente, /dashboard for others */
function DefaultRedirect() {
  const { user } = useAuthStore()
  const target = user?.role === 'dipendente' ? '/my-day' : '/dashboard'
  return <Navigate to={target} replace />
}

function App() {
  return (
    <ErrorBoundary>
      <AuthInitializer>
        <Suspense fallback={<PageLoader />}>
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
              <Route path="/" element={<DefaultRedirect />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/my-day" element={<MyDayPage />} />
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
              {/* Redirect legacy standalone routes to unified task view with view mode param */}
              <Route path="/kanban" element={<Navigate to="/tasks?view=kanban" replace />} />
              <Route path="/gantt" element={<Navigate to="/tasks?view=gantt" replace />} />
              <Route path="/calendar" element={<CalendarPage />} />
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
              <Route path="/planning" element={<PlanningDashboardPage />} />
              <Route path="/planning/wizard" element={<PlanningWizardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/reports/weekly" element={<WeeklyReportPage />} />
              <Route path="/notifications" element={<NotificationCenterPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/users" element={<UserListPage />} />
              <Route path="/users/new" element={<UserFormPage />} />
              <Route path="/users/:id/edit" element={<UserFormPage />} />
              <Route path="/audit" element={<AuditTrailPage />} />
              <Route path="/admin/templates" element={<TemplateListPage />} />
              <Route path="/admin/templates/new" element={<TemplateFormPage />} />
              <Route path="/admin/templates/:id/edit" element={<TemplateFormPage />} />
              <Route path="/admin/departments" element={<DepartmentListPage />} />
              <Route path="/admin/custom-fields" element={<CustomFieldsPage />} />
              <Route path="/admin/import" element={<ImportPage />} />
              <Route path="/admin/workflows" element={<WorkflowEditorPage />} />
              <Route path="/admin/automations" element={<AutomationListPage />} />
              <Route path="/admin/automations/new" element={<AutomationEditorPage />} />
              <Route path="/admin/automations/:id/edit" element={<AutomationEditorPage />} />
            </Route>

            {/* Public invitation acceptance page - no auth required */}
            <Route path="/invite/:token" element={<AcceptInvitationPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthInitializer>
    </ErrorBoundary>
  )
}

export default App
