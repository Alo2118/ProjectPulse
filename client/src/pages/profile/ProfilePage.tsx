import { useState } from 'react'
import { useAuthStore } from '@stores/authStore'
import { useUserStore } from '@stores/userStore'
import { useThemeStore } from '@stores/themeStore'
import { USER_ROLE_LABELS } from '@/constants'
import { UserRole } from '@/types'
import { Save, Loader2, Eye, EyeOff, User, Shield, Monitor, Palette, Building2 } from 'lucide-react'

const themes = [
  {
    id: 'tech-hud' as const,
    name: 'TECH-HUD',
    description: 'Stile JARVIS — neon, glow, HUD decorations',
    icon: Monitor,
    colors: ['#06b6d4', '#0f172a', '#8b5cf6', '#10b981'],
  },
  {
    id: 'basic' as const,
    name: 'BASIC',
    description: 'Pulito e moderno — ispirato ad Asana',
    icon: Palette,
    colors: ['#f06a6a', '#ffffff', '#7c3aed', '#16a34a'],
  },
  {
    id: 'classic' as const,
    name: 'CLASSIC',
    description: 'Professionale — stile Office 365 / Teams',
    icon: Building2,
    colors: ['#0078d4', '#f3f2f1', '#8764b8', '#107c10'],
  },
]

export default function ProfilePage() {
  const { user, updateUser: updateAuthUser } = useAuthStore()
  const { updateProfile, isLoading } = useUserStore()
  const { themeStyle, setThemeStyle } = useThemeStore()

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'Nome obbligatorio'
    if (!formData.lastName.trim()) newErrors.lastName = 'Cognome obbligatorio'
    if (!formData.email.trim()) {
      newErrors.email = 'Email obbligatoria'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email non valida'
    }
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'La password deve avere almeno 8 caratteri'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    setSuccessMessage('')
    try {
      const updateData: Record<string, string> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      }
      if (formData.password) {
        updateData.password = formData.password
      }

      const updatedUser = await updateProfile(updateData)

      // Update the auth store with the new data
      updateAuthUser({
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
      })

      setFormData((prev) => ({ ...prev, password: '' }))
      setSuccessMessage('Profilo aggiornato con successo')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch {
      // error already in store
    } finally {
      setIsSaving(false)
    }
  }

  const roleLabel = user?.role
    ? USER_ROLE_LABELS[user.role as UserRole] || user.role
    : ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            boxShadow: '0 0 0 2px var(--accent-primary-bg)',
          }}>
          <span className="text-lg font-semibold text-white">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </div>
        <div>
          <h1 className="page-title">
            Il mio profilo
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* Theme selector */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-label)' }}>
          Tema interfaccia
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((t) => {
            const isSelected = themeStyle === t.id
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeStyle(t.id)}
                className="relative p-4 text-left transition-all duration-200"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  backgroundColor: isSelected ? 'var(--accent-primary-bg)' : 'transparent',
                }}
              >
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <Icon className="w-6 h-6 mb-2" style={{ color: t.colors[0] }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>
                  {t.name}
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {t.description}
                </p>
                <div className="flex gap-1.5 mt-3">
                  {t.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border"
                      style={{
                        backgroundColor: color,
                        borderColor: color === '#ffffff' || color === '#f3f2f1' ? '#e5e7eb' : color,
                      }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={`input ${errors.firstName ? 'border-red-500' : ''}`}
            />
            {errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Cognome *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className={`input ${errors.lastName ? 'border-red-500' : ''}`}
            />
            {errors.lastName && (
              <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`input ${errors.email ? 'border-red-500' : ''}`}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nuova password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`input pr-10 ${errors.password ? 'border-red-500' : ''}`}
              placeholder="Lascia vuoto per non modificare"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>

        {/* Role info - read only */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Ruolo
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500 dark:text-slate-400">
            <User className="w-4 h-4" />
            <span>{roleLabel}</span>
            <span className="text-xs ml-auto">(non modificabile)</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <button type="submit" disabled={isSaving || isLoading} className="btn-primary flex items-center">
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salva Modifiche
          </button>
        </div>
      </form>
    </div>
  )
}
