import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-app)' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>ProjectPulse</h1>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
            Sistema di gestione progetti ISO 13485
          </p>
        </div>
        <div className="card p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
