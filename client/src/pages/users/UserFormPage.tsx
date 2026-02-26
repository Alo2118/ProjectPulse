/**
 * User Form Page - Create/edit user (admin only)
 * @module pages/users/UserFormPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserStore } from '@stores/userStore'
import { ArrowLeft, Loader2, Save, Eye, EyeOff } from 'lucide-react'
import { USER_ROLE_OPTIONS } from '@/constants'
import { UserRole } from '@/types'
import { Breadcrumb } from '@/components/common/Breadcrumb'

export default function UserFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const { currentUser, isLoading, fetchUser, createUser, updateUser, clearCurrentUser } =
    useUserStore()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'dipendente' as UserRole,
    isActive: true,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (id) {
      fetchUser(id)
    }
    return () => clearCurrentUser()
  }, [id, fetchUser, clearCurrentUser])

  useEffect(() => {
    if (isEditing && currentUser) {
      setFormData({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        password: '',
        role: (currentUser.role as UserRole) || 'dipendente',
        isActive: currentUser.isActive !== false,
      })
    }
  }, [isEditing, currentUser])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'Nome obbligatorio'
    if (!formData.lastName.trim()) newErrors.lastName = 'Cognome obbligatorio'
    if (!formData.email.trim()) {
      newErrors.email = 'Email obbligatoria'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email non valida'
    }
    if (!isEditing && !formData.password) {
      newErrors.password = 'Password obbligatoria'
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'La password deve avere almeno 8 caratteri'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      if (isEditing && id) {
        const updateData: Record<string, unknown> = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
        }
        if (formData.password) {
          updateData.password = formData.password
        }
        await updateUser(id, updateData as Parameters<typeof updateUser>[1])
      } else {
        await createUser({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        })
      }
      navigate('/users')
    } catch {
      // error already in store
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing && isLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Utenti', href: '/users' },
          { label: isEditing ? 'Modifica Utente' : 'Nuovo Utente' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="page-title">
          {isEditing ? 'Modifica Utente' : 'Nuovo Utente'}
        </h1>
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
              placeholder="Mario"
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
              placeholder="Rossi"
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
            placeholder="mario.rossi@example.com"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Password {isEditing ? '(lascia vuoto per non modificare)' : '*'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`input pr-10 ${errors.password ? 'border-red-500' : ''}`}
              placeholder={isEditing ? 'Nuova password...' : 'Almeno 8 caratteri'}
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

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Ruolo *
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            className="input"
          >
            {USER_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {isEditing && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Utente attivo
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={() => navigate('/users')} className="btn-secondary">
            Annulla
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary flex items-center">
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? 'Salva Modifiche' : 'Crea Utente'}
          </button>
        </div>
      </form>
    </div>
  )
}
