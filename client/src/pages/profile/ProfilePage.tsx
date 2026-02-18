import { useState } from 'react'
import { useAuthStore } from '@stores/authStore'
import { useUserStore } from '@stores/userStore'
import { USER_ROLE_LABELS } from '@/constants'
import { UserRole } from '@/types'
import { Save, Loader2, Eye, EyeOff, User, Shield } from 'lucide-react'

export default function ProfilePage() {
  const { user, updateUser: updateAuthUser } = useAuthStore()
  const { updateProfile, isLoading } = useUserStore()

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
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center ring-2 ring-primary-500/20">
          <span className="text-lg font-semibold text-white">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Il mio profilo
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Shield className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </div>

        {/* Role info - read only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ruolo
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-surface-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
            <User className="w-4 h-4" />
            <span>{roleLabel}</span>
            <span className="text-xs ml-auto">(non modificabile)</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
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
