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
import { useTemplateStore } from '@stores/templateStore'
import api from '@services/api'
import {
  Loader2,
  Save,
  AlertCircle,
  Trash2,
  LayoutTemplate,
  ChevronDown,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { User } from '@/types'
import { PROJECT_STATUS_OPTIONS, PROJECT_PRIORITY_OPTIONS } from '@/constants'
import { DetailPageHeader } from '@/components/common/DetailPageHeader'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

// Zod validation schema (templateId optional, only used at creation)
const projectSchema = z.object({
  templateId: z.string().uuid().optional().or(z.literal('')),

  name: z.string().min(3, 'Il nome deve avere almeno 3 caratteri').max(100, 'Il nome non può superare i 100 caratteri'),
  description: z.string().max(2000, 'La descrizione non può superare i 2000 caratteri').optional().or(z.literal('')),
  status: z.enum(['planning', 'design', 'verification', 'validation', 'transfer', 'maintenance', 'completed', 'on_hold', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
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
  const { templates, fetchTemplates } = useTemplateStore()

  const [users, setUsers] = useState<User[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const isEditMode = Boolean(id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      templateId: '',
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

  // Check permissions - all authenticated users can manage projects (dipendente only own)
  const canManageProjects = !!user
  const isDipendente = user?.role === 'dipendente'

  // Load templates on create mode
  useEffect(() => {
    if (!isEditMode) {
      fetchTemplates(false)
    }
  }, [isEditMode, fetchTemplates])

  // Load users for owner select
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get<{ success: boolean; data: User[] }>('/users?isActive=true&limit=100')
        if (response.data.success) {
          setUsers(response.data.data)
        }
      } catch {
        // silently ignore
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
      const submitData = {
        name: data.name,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        startDate: data.startDate || null,
        targetEndDate: data.targetEndDate || null,
        budget: data.budget || null,
        ownerId: data.ownerId,
        ...(!isEditMode && data.templateId ? { templateId: data.templateId } : {}),
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
  const isOwnProject = !isEditMode || !currentProject || currentProject.ownerId === user?.id
  if (!canManageProjects || (isDipendente && isEditMode && currentProject && !isOwnProject)) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
          Accesso non autorizzato
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          Non hai i permessi per creare o modificare questo progetto.
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex gap-2">
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="flex items-center gap-4">
          <div className="skeleton w-10 h-10 rounded-lg" />
          <div className="skeleton h-7 w-48" />
        </div>
        <div className="card p-6 space-y-4">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-32 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Project not found in edit mode
  if (isEditMode && !storeLoading && !currentProject) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
          Progetto non trovato
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          Il progetto richiesto non esiste o è stato eliminato.
        </p>
        <button onClick={() => navigate('/projects')} className="btn-primary">
          Torna ai Progetti
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <DetailPageHeader
        title={isEditMode ? 'Modifica Progetto' : 'Nuovo Progetto'}
        backTo="/projects"
      />

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card p-6 space-y-6">

          {/* Submit Error */}
          {submitError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          {/* Template selector (create mode only) */}
          {!isEditMode && templates.length > 0 && (
            <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
              <label
                htmlFor="templateId"
                className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                <LayoutTemplate className="w-4 h-4 text-cyan-400" />
                Usa template <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
              </label>
              <select
                id="templateId"
                {...register('templateId')}
                className="input"
              >
                <option value="">— Nessun template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.phases.length > 0 ? ` (${t.phases.length} fasi)` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Il template precompila la struttura del progetto con fasi e configurazioni predefinite
              </p>
            </div>
          )}

          {/* ── Essential fields ── */}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome Progetto <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="Inserisci il nome del progetto"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Descrizione <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={4}
              className={`input resize-none ${errors.description ? 'input-error' : ''}`}
              placeholder="Descrizione del progetto (opzionale)"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
            )}
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Stato <span className="text-red-400">*</span>
              </label>
              <select
                id="status"
                {...register('status')}
                className={`input ${errors.status ? 'input-error' : ''}`}
              >
                {PROJECT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-400">{errors.status.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priorità <span className="text-red-400">*</span>
              </label>
              <select
                id="priority"
                {...register('priority')}
                className={`input ${errors.priority ? 'input-error' : ''}`}
              >
                {PROJECT_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-red-400">{errors.priority.message}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data Inizio <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                </span>
              </label>
              <input
                id="startDate"
                type="date"
                {...register('startDate')}
                className={`input ${errors.startDate ? 'input-error' : ''}`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-400">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="targetEndDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data Scadenza <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                </span>
              </label>
              <input
                id="targetEndDate"
                type="date"
                {...register('targetEndDate')}
                className={`input ${errors.targetEndDate ? 'input-error' : ''}`}
              />
              {errors.targetEndDate && (
                <p className="mt-1 text-sm text-red-400">{errors.targetEndDate.message}</p>
              )}
            </div>
          </div>

          {/* Owner */}
          <div>
            <label htmlFor="ownerId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Responsabile <span className="text-red-400">*</span>
            </label>
            <select
              id="ownerId"
              {...register('ownerId')}
              disabled={isDipendente}
              className={`input ${errors.ownerId ? 'input-error' : ''} ${isDipendente ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="">Seleziona responsabile</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email})
                </option>
              ))}
            </select>
            {isDipendente && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Sei automaticamente il responsabile del progetto
              </p>
            )}
            {errors.ownerId && (
              <p className="mt-1 text-sm text-red-400">{errors.ownerId.message}</p>
            )}
          </div>

          {/* ── Opzioni avanzate (collapsible) ── */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between text-xs uppercase tracking-widest
              font-medium text-slate-500 dark:text-slate-400
              border-b border-slate-200 dark:border-cyan-500/15 pb-2 pt-1
              hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Opzioni avanzate
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>

          {showAdvanced && (
            <div className="pt-1">
              <label htmlFor="budget" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Budget <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
              </label>
              <input
                id="budget"
                type="text"
                {...register('budget')}
                className={`input ${errors.budget ? 'input-error' : ''}`}
                placeholder="es. 10000.00"
              />
              {errors.budget && (
                <p className="mt-1 text-sm text-red-400">{errors.budget.message}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-cyan-500/10">
            {isEditMode ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 dark:text-red-400
                  hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Elimina
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-tertiary"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!isDirty && isEditMode)}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditMode ? 'Salva Modifiche' : 'Crea Progetto'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        title="Conferma Eliminazione"
        message="Sei sicuro di voler eliminare il progetto"
        itemName={currentProject?.name}
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
