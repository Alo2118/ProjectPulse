/**
 * Project Form Page - Create and edit projects
 * @module pages/projects/ProjectFormPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import api from '@services/api'
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  FolderPlus,
  Trash2,
} from 'lucide-react'
import { User } from '@/types'
import { PROJECT_STATUS_OPTIONS, PROJECT_PRIORITY_OPTIONS } from '@/constants'

// Zod validation schema
const projectSchema = z.object({
  name: z.string().min(3, 'Il nome deve avere almeno 3 caratteri').max(100, 'Il nome non può superare i 100 caratteri'),
  description: z.string().max(2000, 'La descrizione non può superare i 2000 caratteri').optional().or(z.literal('')),
  status: z.enum(['planning', 'design', 'verification', 'validation', 'transfer', 'maintenance', 'completed', 'on_hold', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high']),
  startDate: z.string().optional().or(z.literal('')),
  targetEndDate: z.string().optional().or(z.literal('')),
  budget: z.string().optional().or(z.literal('')),
  ownerId: z.string().uuid('Seleziona un responsabile valido'),
})

type ProjectFormData = z.infer<typeof projectSchema>

export default function ProjectFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentProject, isLoading: storeLoading, fetchProject, createProject, updateProject, deleteProject, clearCurrentProject } = useProjectStore()

  const [users, setUsers] = useState<User[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isEditMode = Boolean(id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      startDate: '',
      targetEndDate: '',
      budget: '',
      ownerId: user?.id || '',
    },
  })

  // Check permissions
  const canManageProjects = user?.role === 'admin' || user?.role === 'direzione'

  // Load users for owner select
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get<{ success: boolean; data: User[] }>('/users?isActive=true&limit=100')
        if (response.data.success !== false) {
          setUsers(response.data.data)
        }
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [])

  // Load project data if editing
  useEffect(() => {
    if (isEditMode && id) {
      fetchProject(id)
    }
    return () => clearCurrentProject()
  }, [id, isEditMode, fetchProject, clearCurrentProject])

  // Populate form when project is loaded
  useEffect(() => {
    if (isEditMode && currentProject) {
      reset({
        name: currentProject.name,
        description: currentProject.description || '',
        status: currentProject.status,
        priority: currentProject.priority,
        startDate: currentProject.startDate ? currentProject.startDate.split('T')[0] : '',
        targetEndDate: currentProject.targetEndDate ? currentProject.targetEndDate.split('T')[0] : '',
        budget: currentProject.budget != null ? String(currentProject.budget) : '',
        ownerId: currentProject.ownerId,
      })
    }
  }, [isEditMode, currentProject, reset])

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Prepare data for API - keep budget as string, backend will convert
      const submitData = {
        name: data.name,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        startDate: data.startDate || null,
        targetEndDate: data.targetEndDate || null,
        budget: data.budget || null,
        ownerId: data.ownerId,
      }

      if (isEditMode && id) {
        await updateProject(id, submitData)
        navigate(`/projects/${id}`)
      } else {
        const newProject = await createProject(submitData)
        navigate(`/projects/${newProject.id}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore durante il salvataggio'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setIsDeleting(true)
    try {
      await deleteProject(id)
      navigate('/projects')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore durante l\'eliminazione'
      setSubmitError(message)
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // Redirect if not authorized
  if (!canManageProjects) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Accesso non autorizzato
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Non hai i permessi per creare o modificare progetti.
        </p>
        <button onClick={() => navigate('/projects')} className="btn-primary">
          Torna ai Progetti
        </button>
      </div>
    )
  }

  // Loading state for edit mode
  if (isEditMode && storeLoading && !currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  // Project not found in edit mode
  if (isEditMode && !storeLoading && !currentProject) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Progetto non trovato
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Il progetto richiesto non esiste o è stato eliminato.
        </p>
        <button onClick={() => navigate('/projects')} className="btn-primary">
          Torna ai Progetti
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex items-center">
          <FolderPlus className="w-6 h-6 text-primary-500 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Modifica Progetto' : 'Nuovo Progetto'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        {/* Submit Error */}
        {submitError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400">{submitError}</p>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome Progetto <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className={`input ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Inserisci il nome del progetto"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descrizione
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={4}
            className={`input resize-none ${errors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Descrizione del progetto (opzionale)"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stato <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              {...register('status')}
              className={`input ${errors.status ? 'border-red-500 focus:ring-red-500' : ''}`}
            >
              {PROJECT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-500">{errors.status.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priorità <span className="text-red-500">*</span>
            </label>
            <select
              id="priority"
              {...register('priority')}
              className={`input ${errors.priority ? 'border-red-500 focus:ring-red-500' : ''}`}
            >
              {PROJECT_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.priority && (
              <p className="mt-1 text-sm text-red-500">{errors.priority.message}</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data Inizio
            </label>
            <input
              id="startDate"
              type="date"
              {...register('startDate')}
              className={`input ${errors.startDate ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-500">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="targetEndDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data Scadenza
            </label>
            <input
              id="targetEndDate"
              type="date"
              {...register('targetEndDate')}
              className={`input ${errors.targetEndDate ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.targetEndDate && (
              <p className="mt-1 text-sm text-red-500">{errors.targetEndDate.message}</p>
            )}
          </div>
        </div>

        {/* Owner and Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ownerId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Responsabile <span className="text-red-500">*</span>
            </label>
            <select
              id="ownerId"
              {...register('ownerId')}
              className={`input ${errors.ownerId ? 'border-red-500 focus:ring-red-500' : ''}`}
            >
              <option value="">Seleziona responsabile</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
            </select>
            {errors.ownerId && (
              <p className="mt-1 text-sm text-red-500">{errors.ownerId.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Budget
            </label>
            <input
              id="budget"
              type="text"
              {...register('budget')}
              className={`input ${errors.budget ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="es. 10000.00"
            />
            {errors.budget && (
              <p className="mt-1 text-sm text-red-500">{errors.budget.message}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          {isEditMode ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Elimina
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!isDirty && isEditMode)}
              className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Salva Modifiche' : 'Crea Progetto'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Conferma Eliminazione
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sei sicuro di voler eliminare il progetto <strong>{currentProject?.name}</strong>?
              Questa azione non può essere annullata.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Elimina
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
