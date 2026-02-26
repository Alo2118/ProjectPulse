/**
 * Convert To Project Modal - Convert user input to project
 * @module pages/inputs/ConvertToProjectModal
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader2 } from 'lucide-react'
import { useUserInputStore } from '@stores/userInputStore'
import { PROJECT_PRIORITY_OPTIONS } from '@/constants'
import api from '@services/api'

interface ConvertToProjectModalProps {
  isOpen: boolean
  onClose: () => void
  inputId: string
  inputTitle: string
  inputDescription: string | null
  onSuccess?: () => void
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

export default function ConvertToProjectModal({
  isOpen,
  onClose,
  inputId,
  inputTitle,
  inputDescription,
  onSuccess,
}: ConvertToProjectModalProps) {
  const navigate = useNavigate()
  const { convertToProject, isLoading } = useUserInputStore()

  const [users, setUsers] = useState<UserOption[]>([])
  const [formData, setFormData] = useState({
    name: inputTitle,
    description: inputDescription || '',
    ownerId: '',
    priority: 'medium',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setFormData({
        name: inputTitle,
        description: inputDescription || '',
        ownerId: '',
        priority: 'medium',
      })
    }
  }, [isOpen, inputTitle, inputDescription])

  const fetchUsers = async () => {
    try {
      const response = await api.get<{ success: boolean; data: UserOption[] }>('/users')
      if (response.data.success) {
        setUsers(response.data.data)
      }
    } catch {
      // silently ignore
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Il nome è obbligatorio'
    }
    if (!formData.ownerId) {
      newErrors.ownerId = 'Il responsabile è obbligatorio'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const result = await convertToProject(inputId, {
        name: formData.name,
        description: formData.description,
        ownerId: formData.ownerId,
        priority: formData.priority,
      })

      // project created
      onSuccess?.()

      // Navigate to new project
      if (window.confirm('Vuoi visualizzare il progetto creato?')) {
        navigate(`/projects/${result.project.id}`)
      }
    } catch {
      // error
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        <div className="relative w-full max-w-lg modal-panel">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Converti in Progetto
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome Progetto *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`input ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Nome del progetto"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="input"
                placeholder="Descrizione del progetto..."
              />
            </div>

            {/* Owner */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Responsabile *
              </label>
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className={`input ${errors.ownerId ? 'border-red-500' : ''}`}
              >
                <option value="">Seleziona responsabile</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
              {errors.ownerId && <p className="mt-1 text-sm text-red-500">{errors.ownerId}</p>}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priorità
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input"
              >
                {PROJECT_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button type="button" onClick={onClose} className="btn-secondary">
                Annulla
              </button>
              <button type="submit" disabled={isLoading} className="btn-primary">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conversione...
                  </>
                ) : (
                  'Crea Progetto'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
