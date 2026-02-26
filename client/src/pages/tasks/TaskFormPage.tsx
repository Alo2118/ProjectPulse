/**
 * Task Form Page - Create and edit tasks
 * @module pages/tasks/TaskFormPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTaskStore } from '@stores/taskStore'
import { useAuthStore } from '@stores/authStore'
import api from '@services/api'
import {
  Loader2,
  Save,
  AlertCircle,
  CheckSquare,
  Trash2,
  Target,
  ListTodo,
  Info,
  Settings2,
  FolderTree,
  Users,
  Calendar,
  Tag,
  ChevronDown,
} from 'lucide-react'
import { User, Project, Tag as TagType } from '@/types'
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS, TASK_TYPE_OPTIONS } from '@/constants'
import TaskSearchSelect from '@components/TaskSearchSelect'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import RecurrenceSettings from '@components/tasks/RecurrenceSettings'
import TagInput from '@components/tags/TagInput'
import { useTagStore } from '@stores/tagStore'
import { useDepartmentStore } from '@stores/departmentStore'
import { DetailPageHeader } from '@/components/common/DetailPageHeader'
import { CustomFieldsSection } from '@/components/tasks/CustomFieldsSection'

// Zod validation schema
const taskSchema = z.object({
  title: z.string().min(3, 'Il titolo deve avere almeno 3 caratteri').max(200, 'Il titolo non può superare i 200 caratteri'),
  description: z.string().max(5000, 'La descrizione non può superare i 5000 caratteri').optional().or(z.literal('')),
  taskType: z.enum(['milestone', 'task', 'subtask']),
  status: z.enum(['todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: z.string().optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
  estimatedHours: z.string().optional().or(z.literal('')),
  isStandalone: z.boolean().default(false),
  projectId: z.string().optional().or(z.literal('')),
  parentTaskId: z.string().optional().or(z.literal('')),
  assigneeId: z.string().optional().or(z.literal('')),
  departmentId: z.string().optional().or(z.literal('')),
  assignToSubtasks: z.boolean().default(false),
  isRecurring: z.boolean().optional(),
  blockedReason: z.string().optional().or(z.literal('')),
  recurrencePattern: z.string().optional().or(z.literal('')),
  position: z.string().optional().or(z.literal('')),
})

type TaskFormData = z.infer<typeof taskSchema>

// Map taskType to display label (Italian, grammatically correct)
function getTypeLabel(taskType: string): string {
  if (taskType === 'milestone') return 'Milestone'
  if (taskType === 'subtask') return 'Subtask'
  return 'Task'
}

// Map taskType to Italian article for "Nuova/Nuovo"
function getCreateLabel(taskType: string): string {
  if (taskType === 'milestone') return 'Nuova Milestone'
  if (taskType === 'subtask') return 'Nuovo Subtask'
  return 'Nuovo Task'
}

export default function TaskFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentTask, isLoading: storeLoading, fetchTask, createTask, updateTask, deleteTask, clearCurrentTask } = useTaskStore()

  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [taskTags, setTaskTags] = useState<TagType[]>([])
  const [inheritedFromParent, setInheritedFromParent] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { fetchEntityTags, assignTag: storeAssignTag } = useTagStore()
  const { departments, fetchDepartments } = useDepartmentStore()

  const isEditMode = Boolean(id)
  const preselectedProjectId = searchParams.get('projectId') || ''
  const preselectedParentTaskId = searchParams.get('parentTaskId') || ''

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      taskType: preselectedParentTaskId ? 'subtask' : 'task',
      status: 'todo',
      priority: 'medium',
      startDate: '',
      dueDate: '',
      estimatedHours: '',
      isStandalone: !preselectedProjectId && !preselectedParentTaskId,
      projectId: preselectedProjectId,
      parentTaskId: preselectedParentTaskId,
      assigneeId: '',
      departmentId: '',
      assignToSubtasks: false,
    },
  })

  const isStandalone = watch('isStandalone')
  const selectedProjectId = watch('projectId')
  const selectedTaskType = watch('taskType')
  const selectedParentTaskId = watch('parentTaskId')

  // Check permissions - everyone can create, edit requires ownership or privileged role
  const isPrivilegedRole = user?.role === 'admin' || user?.role === 'direzione'
  const isTaskOwner = isEditMode && currentTask && (
    currentTask.assigneeId === user?.id || currentTask.createdById === user?.id
  )
  const canManageTasks = !isEditMode || isPrivilegedRole || isTaskOwner

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Load departments
  useEffect(() => { fetchDepartments() }, [fetchDepartments])

  // Load users for assignee select
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get<{ success: boolean; data: User[] }>('/users?limit=100')
        if (response.data.success) {
          setUsers(response.data.data)
        }
      } catch {
        // silently ignore
      }
    }
    loadUsers()
  }, [])

  // Load projects for project select
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.get<{ success: boolean; data: Project[] }>('/projects?limit=100')
        if (response.data.success) {
          setProjects(response.data.data)
        }
      } catch {
        // silently ignore
      }
    }
    loadProjects()
  }, [])

  // Clear project when toggling standalone (keep parentTaskId — standalone tasks can have parents)
  useEffect(() => {
    if (isStandalone) {
      setValue('projectId', '')
    }
  }, [isStandalone, setValue])

  // Handle taskType changes - milestone cannot have parent, subtask must have parent
  useEffect(() => {
    if (selectedTaskType === 'milestone') {
      setValue('parentTaskId', '')
    }
  }, [selectedTaskType, setValue])

  // Auto-set taskType based on parentTaskId
  useEffect(() => {
    if (selectedParentTaskId && selectedTaskType === 'milestone') {
      setValue('taskType', 'task')
    }
  }, [selectedParentTaskId, selectedTaskType, setValue])

  // Load task data if editing
  useEffect(() => {
    if (isEditMode && id) {
      fetchTask(id)
    }
    return () => clearCurrentTask()
  }, [id, isEditMode, fetchTask, clearCurrentTask])

  // Load tags when editing
  useEffect(() => {
    if (isEditMode && id) {
      fetchEntityTags('task', id).then(setTaskTags)
    }
  }, [isEditMode, id, fetchEntityTags])

  // Pre-fill form fields from parent task when creating a subtask
  useEffect(() => {
    if (isEditMode || !preselectedParentTaskId) return

    const fetchParentAndInherit = async () => {
      try {
        const response = await api.get<{ success: boolean; data: Record<string, unknown> }>(
          `/tasks/${preselectedParentTaskId}`
        )
        if (!response.data.success) return

        const parent = response.data.data
        let didInherit = false

        if (!watch('assigneeId') && parent.assigneeId) {
          setValue('assigneeId', parent.assigneeId as string, { shouldDirty: false })
          didInherit = true
        }
        if (!watch('departmentId') && parent.departmentId) {
          setValue('departmentId', parent.departmentId as string, { shouldDirty: false })
          didInherit = true
        }
        if (parent.priority) {
          setValue('priority', parent.priority as 'low' | 'medium' | 'high' | 'critical', { shouldDirty: false })
          didInherit = true
        }
        if (!watch('startDate') && parent.startDate) {
          const dateStr = (parent.startDate as string).split('T')[0]
          setValue('startDate', dateStr, { shouldDirty: false })
          didInherit = true
        }
        if (!watch('dueDate') && parent.dueDate) {
          const dateStr = (parent.dueDate as string).split('T')[0]
          setValue('dueDate', dateStr, { shouldDirty: false })
          didInherit = true
        }

        if (didInherit) {
          setInheritedFromParent(true)
        }
      } catch {
        // Silent failure — do not block form usage if parent fetch fails
      }
    }

    fetchParentAndInherit()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, preselectedParentTaskId])

  // Populate form when task is loaded
  useEffect(() => {
    if (isEditMode && currentTask) {
      reset({
        title: currentTask.title,
        description: currentTask.description || '',
        taskType: currentTask.taskType || 'task',
        status: currentTask.status,
        priority: currentTask.priority,
        startDate: currentTask.startDate ? currentTask.startDate.split('T')[0] : '',
        dueDate: currentTask.dueDate ? currentTask.dueDate.split('T')[0] : '',
        estimatedHours: currentTask.estimatedHours != null ? String(currentTask.estimatedHours) : '',
        isStandalone: !currentTask.projectId,
        projectId: currentTask.projectId || '',
        parentTaskId: currentTask.parentTaskId || '',
        assigneeId: currentTask.assigneeId || '',
        departmentId: currentTask.departmentId || '',
      })
    }
  }, [isEditMode, currentTask, reset])

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const estimatedHoursValue = data.estimatedHours ? parseFloat(data.estimatedHours) : null
      const submitData: Record<string, unknown> = {
        title: data.title,
        description: data.description || null,
        taskType: data.taskType,
        status: data.status,
        priority: data.priority,
        startDate: data.startDate || null,
        dueDate: data.dueDate || null,
        estimatedHours: estimatedHoursValue && !isNaN(estimatedHoursValue) ? estimatedHoursValue : null,
        assigneeId: data.assigneeId || null,
        departmentId: data.departmentId || null,
        assignToSubtasks: data.assignToSubtasks,
      }

      if (!data.isStandalone && data.projectId) {
        submitData.projectId = data.projectId
      }
      if (data.parentTaskId) {
        submitData.parentTaskId = data.parentTaskId
      }

      if (isEditMode && id) {
        await updateTask(id, submitData)
        navigate(`/tasks/${id}`)
      } else {
        const newTask = await createTask(submitData)
        for (const tag of taskTags) {
          try {
            await storeAssignTag(tag.id, 'task', newTask.id)
          } catch {
            // ignore duplicate assignments
          }
        }
        navigate(`/tasks/${newTask.id}`)
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
      await deleteTask(id)
      navigate('/tasks')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore durante l\'eliminazione'
      setSubmitError(message)
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // Loading state — skeleton layout
  if (isEditMode && storeLoading && !currentTask) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb skeleton */}
        <div className="flex gap-2">
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-4 w-32" />
        </div>
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="skeleton w-10 h-10 rounded-lg" />
          <div className="skeleton h-7 w-48" />
        </div>
        {/* Body skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6 space-y-4">
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-40 w-full" />
            </div>
          </div>
          <div className="card p-5 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Task not found in edit mode
  if (isEditMode && !storeLoading && !currentTask) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Task non trovato
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          Il task richiesto non esiste o è stato eliminato.
        </p>
        <button onClick={() => navigate('/tasks')} className="btn-primary">
          Torna ai Task
        </button>
      </div>
    )
  }

  // Redirect if not authorized
  if (!canManageTasks) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Accesso non autorizzato
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          Non hai i permessi per creare o modificare task.
        </p>
        <button onClick={() => navigate('/tasks')} className="btn-primary">
          Torna ai Task
        </button>
      </div>
    )
  }

  const typeLabel = getTypeLabel(selectedTaskType)

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <DetailPageHeader
        title={isEditMode ? `Modifica ${typeLabel}` : getCreateLabel(selectedTaskType)}
        subtitle={isEditMode && currentTask?.code ? currentTask.code : undefined}
        backTo="/tasks"
      />

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column: Content ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 space-y-5">
              {/* Error banner */}
              {submitError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 dark:text-red-400">{submitError}</p>
                </div>
              )}

              {/* Parent inheritance banner */}
              {inheritedFromParent && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Alcuni campi sono stati pre-compilati dal task padre. Puoi modificarli liberamente.</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Titolo <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  className={`input ${errors.title ? 'input-error' : ''}`}
                  placeholder="Inserisci il titolo del task"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descrizione{' '}
                  <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={10}
                  className={`input resize-none ${errors.description ? 'input-error' : ''}`}
                  placeholder="Descrizione del task (opzionale)"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Custom Fields - only in edit mode */}
            {isEditMode && currentTask?.id && (
              <CustomFieldsSection
                taskId={currentTask.id}
                projectId={selectedProjectId || null}
                readOnly={false}
              />
            )}
          </div>

          {/* ── Right column: Configuration ── */}
          <div className="lg:col-span-1">
            <div className="card p-5 space-y-5">

              {/* Task Type — horizontal selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TASK_TYPE_OPTIONS.map((option) => {
                    const isSelected = selectedTaskType === option.value
                    const isDisabled = option.value === 'milestone' && Boolean(selectedParentTaskId)
                    return (
                      <label
                        key={option.value}
                        title={option.description}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 cursor-pointer transition-all
                          ${isSelected
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 ring-1 ring-cyan-500/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }
                          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <input
                          type="radio"
                          {...register('taskType')}
                          value={option.value}
                          disabled={isDisabled}
                          className="sr-only"
                        />
                        {option.value === 'milestone' && (
                          <Target
                            className={`w-5 h-5 ${isSelected ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`}
                          />
                        )}
                        {option.value === 'task' && (
                          <CheckSquare
                            className={`w-5 h-5 ${isSelected ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`}
                          />
                        )}
                        {option.value === 'subtask' && (
                          <ListTodo
                            className={`w-5 h-5 ${isSelected ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`}
                          />
                        )}
                        <span
                          className={`text-xs font-medium ${isSelected ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                          {option.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
                {selectedTaskType === 'milestone' && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Le milestone non possono avere time entries diretti. Il tempo è calcolato dalle task figlie.
                  </p>
                )}
              </div>

              {/* ── Section: Stato e Priorità ── */}
              <div className="form-section-header flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5" />
                Stato e Priorità
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Stato <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="status"
                    {...register('status')}
                    className={`input ${errors.status ? 'input-error' : ''}`}
                  >
                    {TASK_STATUS_OPTIONS.map((option) => (
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
                  <label htmlFor="priority" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priorità <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="priority"
                    {...register('priority')}
                    className={`input ${errors.priority ? 'input-error' : ''}`}
                  >
                    {TASK_PRIORITY_OPTIONS.map((option) => (
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

              {/* ── Section: Organizzazione ── */}
              <div className="form-section-header flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5" />
                Organizzazione
              </div>

              {/* Standalone Toggle */}
              <div className="flex items-center gap-3">
                <input
                  id="isStandalone"
                  type="checkbox"
                  {...register('isStandalone')}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="isStandalone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Task standalone (senza progetto)
                </label>
              </div>

              {/* Project */}
              {!isStandalone && (
                <div>
                  <label htmlFor="projectId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Progetto{' '}
                    <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                  </label>
                  <select
                    id="projectId"
                    value={selectedProjectId || ''}
                    onChange={(e) => {
                      setValue('projectId', e.target.value, { shouldDirty: true })
                      setValue('parentTaskId', '')
                    }}
                    className={`input ${errors.projectId ? 'input-error' : ''}`}
                  >
                    <option value="">Seleziona progetto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.projectId && (
                    <p className="mt-1 text-sm text-red-500">{errors.projectId.message}</p>
                  )}
                </div>
              )}

              {/* ── Section: Assegnazione ── */}
              <div className="form-section-header flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Assegnazione
              </div>

              {/* Assignee */}
              <div>
                <label htmlFor="assigneeId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assegnato a{' '}
                  <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                </label>
                <select
                  id="assigneeId"
                  {...register('assigneeId')}
                  className={`input ${errors.assigneeId ? 'input-error' : ''}`}
                >
                  <option value="">Non assegnato</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
                {errors.assigneeId && (
                  <p className="mt-1 text-sm text-red-500">{errors.assigneeId.message}</p>
                )}
                {/* Assign to subtasks checkbox — edit mode only when subtasks exist */}
                {isEditMode && currentTask && currentTask._count && currentTask._count.subtasks > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      id="assignToSubtasks"
                      type="checkbox"
                      {...register('assignToSubtasks')}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor="assignToSubtasks" className="text-sm text-slate-600 dark:text-slate-400">
                      Assegna anche alle subtask ({currentTask._count.subtasks} subtask dirette, include tutti i livelli)
                    </label>
                  </div>
                )}
              </div>

              {/* ── Section: Tempistiche ── */}
              <div className="form-section-header flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Tempistiche
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Data Inizio{' '}
                      <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      {...register('startDate')}
                      className={`input ${errors.startDate ? 'input-error' : ''}`}
                    />
                    {errors.startDate && (
                      <p className="mt-1 text-sm text-red-500">{errors.startDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Data Fine{' '}
                      <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                    </label>
                    <input
                      id="dueDate"
                      type="date"
                      {...register('dueDate')}
                      className={`input ${errors.dueDate ? 'input-error' : ''}`}
                    />
                    {errors.dueDate && (
                      <p className="mt-1 text-sm text-red-500">{errors.dueDate.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="estimatedHours" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ore Stimate{' '}
                    <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                  </label>
                  <input
                    id="estimatedHours"
                    type="number"
                    step="0.5"
                    min="0"
                    {...register('estimatedHours')}
                    className={`input ${errors.estimatedHours ? 'input-error' : ''}`}
                    placeholder="es. 8"
                  />
                  {errors.estimatedHours && (
                    <p className="mt-1 text-sm text-red-500">{errors.estimatedHours.message}</p>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Le date determinano la posizione del task nel Gantt chart
                </p>
              </div>

              {/* ── Opzioni Avanzate (collapsible) ── */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between text-xs uppercase tracking-widest
                  font-medium text-slate-500 dark:text-slate-400
                  border-b border-slate-200 dark:border-cyan-500/15 pb-2 pt-1
                  hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  Opzioni avanzate
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                />
              </button>

              {showAdvanced && (
                <div className="space-y-5 pt-1">
                  {/* Task padre — hidden for milestones */}
                  {selectedTaskType !== 'milestone' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Task/Milestone Padre{' '}
                        <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                      </label>
                      <TaskSearchSelect
                        value={watch('parentTaskId') || ''}
                        onChange={(taskId) => setValue('parentTaskId', taskId, { shouldDirty: true })}
                        placeholder="Cerca task o milestone padre..."
                        projectId={selectedProjectId || undefined}
                        excludeTaskId={isEditMode ? id : undefined}
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {selectedProjectId
                          ? 'Lascia vuoto per un elemento root del progetto.'
                          : 'Lascia vuoto per un task root.'}
                      </p>
                    </div>
                  )}

                  {/* Department */}
                  <div>
                    <label htmlFor="departmentId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Reparto Esecutore{' '}
                      <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                    </label>
                    <select
                      id="departmentId"
                      {...register('departmentId')}
                      className="input"
                    >
                      <option value="">Nessun reparto</option>
                      {departments
                        .filter((d) => d.isActive)
                        .map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Tag */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        Tag{' '}
                        <span className="text-slate-400 dark:text-slate-500 font-normal">(opzionale)</span>
                      </span>
                    </label>
                    <TagInput
                      entityType="task"
                      entityId={isEditMode ? id ?? null : null}
                      value={taskTags}
                      onChange={setTaskTags}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sticky Action Bar ── */}
        <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/50 dark:border-cyan-500/10 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            {/* Left: Delete (edit mode only) */}
            {isEditMode ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Elimina
              </button>
            ) : (
              <div />
            )}

            {/* Right: Cancel + Save */}
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
                    {isEditMode
                      ? 'Salva Modifiche'
                      : `Crea ${typeLabel}`
                    }
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Recurrence Settings - Only in edit mode */}
      {isEditMode && id && (
        <div className="mt-6">
          <RecurrenceSettings
            taskId={id}
            isRecurring={currentTask?.isRecurring}
            recurrencePattern={currentTask?.recurrencePattern}
            onSave={() => {
              fetchTask(id)
            }}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        title="Conferma Eliminazione"
        message="Sei sicuro di voler eliminare il task"
        itemName={currentTask?.title}
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
