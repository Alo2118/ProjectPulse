/**
 * Convert To Task Modal - Convert user input to task
 * @module pages/inputs/ConvertToTaskModal
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { useUserInputStore } from '@stores/userInputStore'
import { useProjectStore } from '@stores/projectStore'
import { TaskPriority } from '@/types'
import { TASK_PRIORITY_OPTIONS } from '@/constants'
import api from '@services/api'

interface ConvertToTaskModalProps {
  isOpen: boolean
  onClose: () => void
  inputId: string
  inputTitle: string
  onSuccess?: () => void
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

export default function ConvertToTaskModal({
  isOpen,
  onClose,
  inputId,
  inputTitle,
  onSuccess,
}: ConvertToTaskModalProps) {
  const navigate = useNavigate()
  const { convertToTask, isLoading } = useUserInputStore()
  const { projects, fetchProjects } = useProjectStore()

  const [users, setUsers] = useState<UserOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    projectId: '',
    assigneeId: '',
    priority: 'medium' as TaskPriority,
    dueDate: '',
    estimatedHours: '',
    isStandalone: false,
  })

  useEffect(() => {
    if (isOpen) {
      fetchProjects()
      fetchUsers()
    }
  }, [isOpen])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const result = await convertToTask(inputId, {
        projectId: formData.isStandalone ? undefined : formData.projectId || undefined,
        assigneeId: formData.assigneeId || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate + 'T00:00:00.000Z').toISOString() : undefined,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      })

      setCreatedTaskId(result.task.id)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la conversione')
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
              Converti in Task
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Success state */}
          {createdTaskId ? (
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-base font-medium text-slate-900 dark:text-white">
                  Task creato con successo!
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  La segnalazione è stata convertita in task.
                </p>
              </div>
              <div className="flex gap-3 pt-2 w-full">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 btn-secondary"
                >
                  Chiudi
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/tasks/${createdTaskId}`)}
                  className="flex-1 btn-primary"
                >
                  Visualizza Task
                </button>
              </div>
            </div>
          ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-slate-400">Segnalazione:</p>
              <p className="font-medium text-slate-900 dark:text-white">{inputTitle}</p>
            </div>

            {/* Standalone checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isStandalone"
                checked={formData.isStandalone}
                onChange={(e) => setFormData({ ...formData, isStandalone: e.target.checked, projectId: '' })}
                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label htmlFor="isStandalone" className="text-sm text-slate-700 dark:text-slate-300">
                Task standalone (senza progetto)
              </label>
            </div>

            {/* Project */}
            {!formData.isStandalone && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Progetto
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="input"
                >
                  <option value="">Seleziona progetto (opzionale)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assegna a
              </label>
              <select
                value={formData.assigneeId}
                onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                className="input"
              >
                <option value="">Non assegnato</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Priorità
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  className="input"
                >
                  {TASK_PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Scadenza
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ore stimate
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                className="input"
                placeholder="es. 8"
              />
            </div>

            {/* Inline error */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

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
                  'Crea Task'
                )}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  )
}
