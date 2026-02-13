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
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  CheckSquare,
  Trash2,
  Target,
  ListTodo,
} from 'lucide-react'
import { User, Project, Tag } from '@/types'
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS, TASK_TYPE_OPTIONS } from '@/constants'
import TaskSearchSelect from '@components/TaskSearchSelect'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import RecurrenceSettings from '@components/tasks/RecurrenceSettings'
import TagInput from '@components/tags/TagInput'
import { useTagStore } from '@stores/tagStore'

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
  assignToSubtasks: z.boolean().default(false),
})

type TaskFormData = z.infer<typeof taskSchema>

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
  const [taskTags, setTaskTags] = useState<Tag[]>([])
  const { fetchEntityTags, assignTag: storeAssignTag } = useTagStore()

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

  // Load users for assignee select
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get<{ success: boolean; data: User[] }>('/users?limit=100')
        if (response.data.success !== false) {
          setUsers(response.data.data)
        }
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [])

  // Load projects for project select
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await api.get<{ success: boolean; data: Project[] }>('/projects?limit=100')
        if (response.data.success !== false) {
          setProjects(response.data.data)
        }
      } catch (error) {
        console.error('Failed to load projects:', error)
      }
    }
    loadProjects()
  }, [])

  // Clear project/parent when toggling standalone
  useEffect(() => {
    if (isStandalone) {
      setValue('projectId', '')
      setValue('parentTaskId', '')
    }
  }, [isStandalone, setValue])

  // Handle taskType changes - milestone cannot have parent, subtask must have parent
  useEffect(() => {
    if (selectedTaskType === 'milestone') {
      // Milestone cannot have a parent task
      setValue('parentTaskId', '')
    }
  }, [selectedTaskType, setValue])

  // Auto-set taskType based on parentTaskId
  useEffect(() => {
    if (selectedParentTaskId && selectedTaskType === 'milestone') {
      // If user selects a parent but is milestone, change to task
      setValue('taskType', 'task')
    }
  }, [selectedParentTaskId, selectedTaskType, setValue])

  // Clear parent task when project changes (parent must belong to same project)
  useEffect(() => {
    // Only reset if not in initial load (edit mode populates both at once)
    if (!isEditMode || currentTask) {
      setValue('parentTaskId', '')
    }
  }, [selectedProjectId, setValue, isEditMode, currentTask])

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
      })
    }
  }, [isEditMode, currentTask, reset])

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Prepare data for API - convert estimatedHours to number
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
        assignToSubtasks: data.assignToSubtasks,
      }

      if (!data.isStandalone && data.projectId) {
        submitData.projectId = data.projectId
      }
      if (data.parentTaskId) {
        submitData.parentTaskId = data.parentTaskId
      }

      // Debug logging
      console.log('Submitting task:', {
        isStandalone: data.isStandalone,
        taskType: data.taskType,
        projectId: data.projectId,
        parentTaskId: data.parentTaskId,
        title: data.title,
        submitData,
      })

      if (isEditMode && id) {
        await updateTask(id, submitData)
        navigate(`/tasks/${id}`)
      } else {
        const newTask = await createTask(submitData)
        // Assign selected tags to newly created task
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
      console.error('Task save error:', message, error)
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

  // Loading state for edit mode - show before permission check
  if (isEditMode && storeLoading && !currentTask) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  // Task not found in edit mode
  if (isEditMode && !storeLoading && !currentTask) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Task non trovato
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Il task richiesto non esiste o è stato eliminato.
        </p>
        <button onClick={() => navigate('/tasks')} className="btn-primary">
          Torna ai Task
        </button>
      </div>
    )
  }

  // Redirect if not authorized (check after task is loaded for edit mode)
  if (!canManageTasks) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Accesso non autorizzato
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Non hai i permessi per creare o modificare task.
        </p>
        <button onClick={() => navigate('/tasks')} className="btn-primary">
          Torna ai Task
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
          {selectedTaskType === 'milestone' ? (
            <Target className="w-6 h-6 text-amber-500 mr-3" />
          ) : selectedTaskType === 'subtask' ? (
            <ListTodo className="w-6 h-6 text-gray-500 mr-3" />
          ) : (
            <CheckSquare className="w-6 h-6 text-primary-500 mr-3" />
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditMode
              ? `Modifica ${selectedTaskType === 'milestone' ? 'Milestone' : selectedTaskType === 'subtask' ? 'Subtask' : 'Task'}`
              : `${selectedTaskType === 'milestone' ? 'Nuova Milestone' : selectedTaskType === 'subtask' ? 'Nuovo Subtask' : 'Nuovo Task'}`
            }
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

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Titolo <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            className={`input ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Inserisci il titolo del task"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
          )}
        </div>

        {/* Task Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {TASK_TYPE_OPTIONS.map((option) => {
              const isSelected = selectedTaskType === option.value
              const isDisabled = option.value === 'milestone' && Boolean(selectedParentTaskId)
              return (
                <label
                  key={option.value}
                  className={`
                    flex-1 min-w-[140px] p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                  <span className={`block font-medium ${isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                    {option.label}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {option.description}
                  </span>
                </label>
              )
            })}
          </div>
          {selectedTaskType === 'milestone' && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Le milestone non possono avere time entries diretti. Il tempo è calcolato dalle task figlie.
            </p>
          )}
        </div>

        {/* Standalone Toggle */}
        <div className="flex items-center gap-3">
          <input
            id="isStandalone"
            type="checkbox"
            {...register('isStandalone')}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="isStandalone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Task standalone (senza progetto)
          </label>
        </div>

        {/* Project */}
        {!isStandalone && (
          <div>
            <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Progetto
            </label>
            <select
              id="projectId"
              {...register('projectId')}
              className={`input ${errors.projectId ? 'border-red-500 focus:ring-red-500' : ''}`}
            >
              <option value="">Seleziona progetto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="mt-1 text-sm text-red-500">{errors.projectId.message}</p>
            )}
          </div>
        )}

        {/* Parent Task - hidden for milestones */}
        {!isStandalone && selectedTaskType !== 'milestone' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Task/Milestone Padre
            </label>
            <TaskSearchSelect
              value={watch('parentTaskId') || ''}
              onChange={(taskId) => setValue('parentTaskId', taskId, { shouldDirty: true })}
              placeholder={selectedProjectId ? 'Cerca task o milestone nel progetto...' : 'Seleziona prima un progetto...'}
              projectId={selectedProjectId || undefined}
              disabled={!selectedProjectId}
              excludeTaskId={isEditMode ? id : undefined}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {selectedProjectId
                ? 'Lascia vuoto per un elemento root del progetto. Seleziona una milestone per raggruppare.'
                : 'Seleziona un progetto per vedere i task disponibili'}
            </p>
          </div>
        )}

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
            placeholder="Descrizione del task (opzionale)"
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
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priorità <span className="text-red-500">*</span>
            </label>
            <select
              id="priority"
              {...register('priority')}
              className={`input ${errors.priority ? 'border-red-500 focus:ring-red-500' : ''}`}
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

        {/* Dates and Estimated Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data Fine
            </label>
            <input
              id="dueDate"
              type="date"
              {...register('dueDate')}
              className={`input ${errors.dueDate ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.dueDate && (
              <p className="mt-1 text-sm text-red-500">{errors.dueDate.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ore Stimate
            </label>
            <input
              id="estimatedHours"
              type="number"
              step="0.5"
              min="0"
              {...register('estimatedHours')}
              className={`input ${errors.estimatedHours ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="es. 8"
            />
            {errors.estimatedHours && (
              <p className="mt-1 text-sm text-red-500">{errors.estimatedHours.message}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
          Le date determinano la posizione del task nel Gantt chart
        </p>

        {/* Assignee */}
        <div>
          <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Assegnato a
          </label>
          <select
            id="assigneeId"
            {...register('assigneeId')}
            className={`input ${errors.assigneeId ? 'border-red-500 focus:ring-red-500' : ''}`}
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
          {/* Show checkbox to assign to subtasks only in edit mode with subtasks */}
          {isEditMode && currentTask && currentTask._count && currentTask._count.subtasks > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <input
                id="assignToSubtasks"
                type="checkbox"
                {...register('assignToSubtasks')}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="assignToSubtasks" className="text-sm text-gray-600 dark:text-gray-400">
                Assegna anche alle subtask ({currentTask._count.subtasks} subtask dirette, include tutti i livelli)
              </label>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tag
          </label>
          <TagInput
            entityType="task"
            entityId={isEditMode ? id ?? null : null}
            value={taskTags}
            onChange={setTaskTags}
          />
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
                  {isEditMode
                    ? 'Salva Modifiche'
                    : `Crea ${selectedTaskType === 'milestone' ? 'Milestone' : selectedTaskType === 'subtask' ? 'Subtask' : 'Task'}`
                  }
                </>
              )}
            </button>
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
