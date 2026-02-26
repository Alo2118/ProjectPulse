/**
 * Task Detail Page - Two-column layout with metadata sidebar
 * @module pages/tasks/TaskDetailPage
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from '@stores/toastStore'
import { useTaskStore } from '@stores/taskStore'
import { useAuthStore } from '@stores/authStore'
import { useTimerToggle } from '@hooks/useTimerToggle'
import { useTaskTreeStore } from '@stores/taskTreeStore'
import api from '@services/api'
import {
  Calendar,
  User,
  Clock,
  Play,
  Square,
  Edit2,
  FolderKanban,
  AlertCircle,
  GitBranch,
  MessageSquare,
  ExternalLink,
  Timer,
  StickyNote,
  Paperclip,
  AlertTriangle,
  Target,
  CheckSquare,
  ListTodo,
  Repeat2,
  Copy,
  Check,
  History,
  Loader2,
  Tag as TagIcon,
} from 'lucide-react'
import { Comment, TaskStatus, Note, Attachment, Tag } from '@/types'
import { StatusIcon } from '@/components/ui/StatusIcon'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ChecklistSection } from '@/components/tasks/ChecklistSection'
import { CustomFieldsSection } from '@/components/tasks/CustomFieldsSection'
import { CommentSection } from '@/components/tasks/CommentSection'
import { TaskTreeView } from '@/components/reports/TaskTreeView'
import { BlockedReasonModal } from '@/components/tasks/BlockedReasonModal'
import { NoteSection } from '@/components/common/NoteSection'
import { AttachmentSection } from '@/components/common/AttachmentSection'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { DetailPageHeader } from '@/components/common/DetailPageHeader'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { DepartmentBadge } from '@/components/ui/DepartmentBadge'
import {
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
} from '@/constants'
import { useTagStore } from '@stores/tagStore'
import { useWorkflowStore } from '@stores/workflowStore'
import TagList from '@components/tags/TagList'
import WorkflowStepper from '@components/tasks/WorkflowStepper'
import ActivityFeed from '@components/common/ActivityFeed'
import StatusTimeline from '@components/tasks/StatusTimeline'
import { formatDate, formatDateRelative, formatHoursFromDecimal } from '@utils/dateFormatters'
import { useTaskRoom } from '@hooks/useTaskRoom'

function formatHours(value: number | null | undefined): string {
  return formatHoursFromDecimal(value)
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function TaskDetailSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb skeleton */}
      <div className="flex gap-2 items-center">
        <div className="skeleton h-4 w-16 rounded" />
        <div className="skeleton h-4 w-4 rounded" />
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-4 w-4 rounded" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>

      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="skeleton w-9 h-9 rounded-lg" />
        <div className="flex-1">
          <div className="skeleton h-7 w-64 rounded-lg" />
          <div className="skeleton h-4 w-32 mt-1 rounded" />
        </div>
        <div className="flex gap-1.5">
          <div className="skeleton w-9 h-9 rounded-lg" />
          <div className="skeleton w-9 h-9 rounded-lg" />
          <div className="skeleton w-9 h-9 rounded-lg" />
          <div className="skeleton w-9 h-9 rounded-lg" />
        </div>
      </div>

      {/* Two-column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="skeleton w-9 h-9 rounded-lg" />
              <div className="skeleton h-4 w-24 rounded" />
            </div>
            <div className="skeleton h-7 w-3/4 rounded-lg" />
            <div className="skeleton h-4 w-full mt-3 rounded" />
            <div className="skeleton h-4 w-2/3 mt-2 rounded" />
          </div>
          <div className="card p-4">
            <div className="flex gap-3 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-8 w-20 rounded-lg" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-4 w-full rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar skeleton */}
        <div className="lg:col-span-1">
          <div className="card p-4 space-y-0">
            {/* Stepper skeleton */}
            <div className="flex gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700/50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="skeleton w-7 h-7 rounded-full" />
                  {i < 3 && <div className="skeleton h-0.5 w-8 rounded" />}
                </div>
              ))}
            </div>
            {/* Meta rows skeleton */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex justify-between py-2.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentTask, isLoading, fetchTask, changeTaskStatus, clearCurrentTask, cloneTask } = useTaskStore()
  const { canTrackTime, handleTimerToggle: timerToggleById, runningTimerTaskId } = useTimerToggle()
  const { treeData } = useTaskTreeStore()
  const { fetchProjectWorkflow, getAvailableTransitions, getStatusLabel } = useWorkflowStore()

  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [taskTags, setTaskTags] = useState<Tag[]>([])
  const { fetchEntityTags } = useTagStore()
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isCloning, setIsCloning] = useState(false)

  useEffect(() => {
    if (id) {
      fetchTask(id)
      loadComments(id)
      loadNotes(id)
      loadAttachments(id)
      fetchEntityTags('task', id).then(setTaskTags)
    }
    return () => clearCurrentTask()
  }, [id, fetchTask, clearCurrentTask, fetchEntityTags])

  // Fetch project workflow for dynamic status transitions
  useEffect(() => {
    if (currentTask?.projectId) {
      fetchProjectWorkflow(currentTask.projectId)
    }
  }, [currentTask?.projectId, fetchProjectWorkflow])

  const loadComments = async (taskId: string) => {
    setCommentsLoading(true)
    try {
      const response = await api.get<{ success: boolean; data: Comment[] }>(
        `/comments/task/${taskId}`
      )
      if (response.data.success) {
        setComments(response.data.data)
      }
    } catch {
      toast.error('Errore', 'Impossibile caricare i commenti')
    } finally {
      setCommentsLoading(false)
    }
  }

  const loadNotes = async (taskId: string) => {
    setNotesLoading(true)
    try {
      const response = await api.get<{ success: boolean; data: Note[] }>(
        `/notes/task/${taskId}`
      )
      if (response.data.success) {
        setNotes(response.data.data)
      }
    } catch {
      toast.error('Errore', 'Impossibile caricare le note')
    } finally {
      setNotesLoading(false)
    }
  }

  const loadAttachments = async (taskId: string) => {
    setAttachmentsLoading(true)
    try {
      const response = await api.get<{ success: boolean; data: Attachment[] }>(
        `/attachments/task/${taskId}`
      )
      if (response.data.success) {
        setAttachments(response.data.data)
      }
    } catch {
      toast.error('Errore', 'Impossibile caricare gli allegati')
    } finally {
      setAttachmentsLoading(false)
    }
  }

  const handleStatusChange = useCallback(
    async (newStatus: TaskStatus) => {
      if (!id) return

      if (newStatus === 'blocked') {
        setPendingStatus(newStatus)
        setShowBlockedModal(true)
        return
      }

      try {
        await changeTaskStatus(id, newStatus)
      } catch {
        // silently ignore
      }
    },
    [id, changeTaskStatus]
  )

  const handleBlockedConfirm = useCallback(
    async (reason: string) => {
      if (!id || !pendingStatus) return

      setIsChangingStatus(true)
      try {
        await changeTaskStatus(id, pendingStatus, reason)
        setShowBlockedModal(false)
        setPendingStatus(null)
      } catch {
        // silently ignore
      } finally {
        setIsChangingStatus(false)
      }
    },
    [id, pendingStatus, changeTaskStatus]
  )

  const handleBlockedCancel = useCallback(() => {
    setShowBlockedModal(false)
    setPendingStatus(null)
  }, [])

  const handleTimerToggle = useCallback(async () => {
    if (!id) return
    await timerToggleById(id)
  }, [id, timerToggleById])

  const handleSubtaskTimerToggle = useCallback(
    async (taskId: string) => {
      await timerToggleById(taskId)
    },
    [timerToggleById]
  )

  const handleCommentAdded = useCallback((comment: Comment) => {
    setComments((prev) => [comment, ...prev])
  }, [])

  const handleCommentDeleted = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }, [])

  // Real-time comment handlers — called by useTaskRoom when another user
  // creates, edits, or deletes a comment on this task.
  const handleRealtimeCommentCreated = useCallback(({ comment }: { comment: Comment; taskId: string }) => {
    // Guard against duplicates (the author's own action already updated state via handleCommentAdded)
    setComments((prev) =>
      prev.some((c) => c.id === comment.id) ? prev : [comment, ...prev]
    )
  }, [])

  const handleRealtimeCommentUpdated = useCallback(({ comment }: { comment: Comment; taskId: string }) => {
    setComments((prev) =>
      prev.map((c) => (c.id === comment.id ? comment : c))
    )
  }, [])

  const handleRealtimeCommentDeleted = useCallback(({ commentId }: { commentId: string; taskId: string }) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }, [])

  // Join the task socket room to receive real-time comment updates from other users
  useTaskRoom(id, {
    onCommentCreated: handleRealtimeCommentCreated,
    onCommentUpdated: handleRealtimeCommentUpdated,
    onCommentDeleted: handleRealtimeCommentDeleted,
  })

  const handleNoteAdded = useCallback((note: Note) => {
    setNotes((prev) => [note, ...prev])
  }, [])

  const handleNoteDeleted = useCallback((noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }, [])

  const handleAttachmentAdded = useCallback((attachment: Attachment) => {
    setAttachments((prev) => [attachment, ...prev])
  }, [])

  const handleAttachmentDeleted = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }, [])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      toast.success('Link copiato', 'Il link al task è stato copiato negli appunti.')
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error('Errore', 'Impossibile copiare il link.')
    }
  }, [])

  const handleCloneTask = useCallback(async () => {
    if (!id) return
    setIsCloning(true)
    try {
      const cloned = await cloneTask(id, false)
      toast.success('Task duplicato', `Creato "${cloned.title}"`)
      navigate(`/tasks/${cloned.id}`)
    } catch {
      // Error toast already shown in store
    } finally {
      setIsCloning(false)
    }
  }, [id, cloneTask, navigate])

  // ── Derived state ─────────────────────────────────────────────────────────

  const isCreator = currentTask?.createdById === user?.id
  const isAssignee = currentTask?.assignee?.id === user?.id
  const isTaskOwner = isCreator || isAssignee
  const canEdit = user?.role === 'admin' || user?.role === 'direzione' || isTaskOwner
  const isTimerRunning = runningTimerTaskId === id

  const estimatedHours = currentTask?.estimatedHours ?? 0
  const actualHours = currentTask?.actualHours ?? 0
  const hoursProgress = estimatedHours > 0 ? Math.min((actualHours / estimatedHours) * 100, 100) : 0
  const isOverBudget = actualHours > estimatedHours && estimatedHours > 0

  const daysUntilDeadline = currentTask?.dueDate
    ? Math.ceil((new Date(currentTask.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const isFinished = currentTask?.status === 'done' || currentTask?.status === 'cancelled'
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0 && !isFinished
  const isDueSoon = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 2 && !isFinished

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading && !currentTask) {
    return <TaskDetailSkeleton />
  }

  if (!currentTask) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Task non trovato</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          Il task richiesto non esiste o è stato eliminato.
        </p>
        <button onClick={() => navigate('/tasks')} className="btn-primary">
          Torna ai Task
        </button>
      </div>
    )
  }

  // ── Task type icon config ──────────────────────────────────────────────────

  const taskTypeIcon = currentTask.taskType === 'milestone'
    ? { icon: Target, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' }
    : currentTask.taskType === 'subtask'
      ? { icon: ListTodo, bg: 'bg-slate-100 dark:bg-slate-700', color: 'text-slate-600 dark:text-slate-400' }
      : { icon: CheckSquare, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' }

  const TaskTypeIconComponent = taskTypeIcon.icon
  const projectId = currentTask.projectId ?? null

  // ── Status transitions ────────────────────────────────────────────────────

  const effectiveProjectId = projectId ?? ''
  const transitions = (canEdit || isAssignee) && currentTask.status !== 'cancelled'
    ? getAvailableTransitions(effectiveProjectId, currentTask.status)
    : []

  const subtaskCount = treeData?.subtasks?.length ?? 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Breadcrumb ── */}
      <Breadcrumb
        items={[
          { label: 'Task', href: '/tasks' },
          ...(currentTask.project
            ? [{ label: currentTask.project.name, href: `/projects/${currentTask.project.id}` }]
            : []),
          ...(currentTask.parentTask
            ? [{ label: currentTask.parentTask.title || currentTask.parentTask.code, href: `/tasks/${currentTask.parentTask.id}` }]
            : []),
          { label: currentTask.title },
        ]}
      />

      {/* ── Page Header with icon-button actions ── */}
      <DetailPageHeader title="Dettagli Task" subtitle={currentTask.code}>
        {/* Timer button — colored, icon-only on mobile */}
        {canTrackTime && currentTask.taskType !== 'milestone' && (
          <button
            onClick={handleTimerToggle}
            title={isTimerRunning ? 'Ferma timer' : 'Avvia timer'}
            className={`flex items-center gap-1.5 px-2.5 py-2 text-sm rounded-lg font-medium transition-all duration-200 active:scale-95 ${
              isTimerRunning
                ? 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500'
                : 'bg-cyan-500 text-white hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500'
            }`}
          >
            {isTimerRunning ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isTimerRunning ? 'Stop' : 'Timer'}
            </span>
            {isTimerRunning && (
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            )}
          </button>
        )}

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          title="Copia link al task"
          className={`btn-icon ${isCopied ? 'text-green-600 dark:text-green-400' : ''}`}
        >
          {isCopied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>

        {/* Duplicate */}
        <button
          onClick={handleCloneTask}
          disabled={isCloning}
          title="Duplica task"
          className="btn-icon disabled:opacity-50"
        >
          {isCloning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Copy className="w-4 h-4 rotate-[15deg]" />
          )}
        </button>

        {/* Edit */}
        {canEdit && (
          <button
            onClick={() => navigate(`/tasks/${id}/edit`)}
            title="Modifica task"
            className="btn-icon"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </DetailPageHeader>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ════════════════ LEFT COLUMN ════════════════ */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Title card ── */}
          <div className="card p-5">
            {/* Type badge + code */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg flex-shrink-0 ${taskTypeIcon.bg}`}>
                <TaskTypeIconComponent className={`w-4 h-4 ${taskTypeIcon.color}`} />
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${TASK_TYPE_COLORS[currentTask.taskType || 'task']}`}>
                {TASK_TYPE_LABELS[currentTask.taskType || 'task']}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{currentTask.code}</span>
            </div>

            {/* Title + recurring badge */}
            <div className="flex items-start gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {currentTask.title}
              </h2>
              {currentTask.isRecurring && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium flex-shrink-0 mt-0.5">
                  <Repeat2 className="w-3 h-3" />
                  Ricorrente
                </span>
              )}
            </div>

            {/* Description */}
            <div className="mt-3">
              {currentTask.description ? (
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {currentTask.description}
                </p>
              ) : canEdit ? (
                <button
                  onClick={() => navigate(`/tasks/${id}/edit`)}
                  className="text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
                >
                  + Aggiungi descrizione
                </button>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">Nessuna descrizione</p>
              )}
            </div>

            {/* Milestone info banner */}
            {currentTask.taskType === 'milestone' && (
              <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Target className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">
                    Questa milestone raccoglie task figlie. Il tempo e l'avanzamento sono calcolati automaticamente.
                  </span>
                </div>
              </div>
            )}

            {/* Blocked reason banner */}
            {currentTask.status === 'blocked' && currentTask.blockedReason && (
              <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Motivo del blocco</h4>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">
                      {currentTask.blockedReason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Checklist ── */}
          {currentTask.taskType !== 'milestone' && (
            <ChecklistSection taskId={currentTask.id} readOnly={!canEdit} />
          )}

          {/* ── Custom Fields ── */}
          <CustomFieldsSection
            taskId={currentTask.id}
            projectId={currentTask.projectId}
            readOnly={!canEdit}
          />

          {/* ── Subtask section ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '100ms' }}>
            <div className="hud-panel-header mb-4">
              <span>Subtask</span>
              {subtaskCount > 0 && (
                <span className="text-xs text-cyan-400 font-mono ml-1">({subtaskCount})</span>
              )}
            </div>
            {canEdit && (
              <div className="flex justify-end mb-3">
                <Link
                  to={`/tasks/new?parentTaskId=${id}&projectId=${currentTask.projectId || ''}`}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  + Aggiungi subtask
                </Link>
              </div>
            )}
            <TaskTreeView
              parentTaskId={id}
              mode="compact"
              showSummary={false}
              showControls={false}
              showFilters={false}
              canTrackTime={canTrackTime}
              onTimerToggle={handleSubtaskTimerToggle}
              runningTimerId={runningTimerTaskId}
            />
          </div>

          {/* ── Comments ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '150ms' }}>
            <div className="hud-panel-header mb-4">
              <span>Commenti</span>
              {comments.length > 0 && (
                <span className="text-xs text-cyan-400 font-mono ml-1">({comments.length})</span>
              )}
            </div>
            <CommentSection
              taskId={id || ''}
              comments={comments}
              currentUser={user}
              isLoading={commentsLoading}
              onCommentAdded={handleCommentAdded}
              onCommentDeleted={handleCommentDeleted}
            />
          </div>

          {/* ── Notes (collapsible) ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '200ms' }}>
            <CollapsibleSection
              title={`Note${notes.length > 0 ? ` (${notes.length})` : ''}`}
              icon={StickyNote}
              defaultExpanded={notes.length > 0}
              borderTop={false}
            >
              <NoteSection
                entityType="task"
                entityId={id || ''}
                notes={notes}
                currentUser={user}
                isLoading={notesLoading}
                onNoteAdded={handleNoteAdded}
                onNoteDeleted={handleNoteDeleted}
                showInternalToggle={user?.role === 'admin' || user?.role === 'direzione'}
              />
            </CollapsibleSection>
          </div>

          {/* ── Attachments (collapsible) ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '250ms' }}>
            <CollapsibleSection
              title={`Allegati${attachments.length > 0 ? ` (${attachments.length})` : ''}`}
              icon={Paperclip}
              defaultExpanded={attachments.length > 0}
              borderTop={false}
            >
              <AttachmentSection
                entityType="task"
                entityId={id || ''}
                attachments={attachments}
                currentUser={user}
                isLoading={attachmentsLoading}
                onAttachmentAdded={handleAttachmentAdded}
                onAttachmentDeleted={handleAttachmentDeleted}
              />
            </CollapsibleSection>
          </div>

          {/* ── Activity (collapsible) ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '300ms' }}>
            <CollapsibleSection
              title="Attivita'"
              icon={History}
              defaultExpanded={false}
              borderTop={false}
            >
              <div className="space-y-4">
                <StatusTimeline entityId={id!} projectId={projectId} />
                <ActivityFeed entityType="task" entityId={id!} />
              </div>
            </CollapsibleSection>
          </div>
        </div>

        {/* ════════════════ RIGHT SIDEBAR ════════════════ */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 space-y-4">
            <div className="card p-4">

              {/* ── Workflow Stepper ── */}
              <div className="pb-3 mb-1 border-b border-slate-100 dark:border-slate-700/50 overflow-x-auto scrollbar-hide">
                <WorkflowStepper currentStatus={currentTask.status} projectId={projectId} />
              </div>

              {/* ── Current status + transitions ── */}
              <div className="py-2.5 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusIcon type="taskStatus" value={currentTask.status} size="sm" showLabel />
                  {transitions.length > 0 && (
                    <span className="text-slate-300 dark:text-slate-600 text-xs">→</span>
                  )}
                  {transitions.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status as TaskStatus)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full transition-colors bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <StatusIcon type="taskStatus" value={status} size="sm" />
                      <span>{getStatusLabel(effectiveProjectId, status)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Priorità ── */}
              <div className="meta-row">
                <span className="meta-row-label">
                  <AlertCircle className="w-4 h-4" />
                  Priorità
                </span>
                <span className="meta-row-value">
                  <StatusIcon type="taskPriority" value={currentTask.priority} size="sm" showLabel />
                </span>
              </div>

              {/* ── Assegnato ── */}
              <div className="meta-row">
                <span className="meta-row-label">
                  <User className="w-4 h-4" />
                  Assegnato
                </span>
                <span className="meta-row-value">
                  {currentTask.assignee
                    ? `${currentTask.assignee.firstName} ${currentTask.assignee.lastName}`
                    : <span className="text-slate-400 dark:text-slate-500 font-normal">—</span>
                  }
                </span>
              </div>

              {/* ── Reparto ── */}
              {currentTask.department && (
                <div className="meta-row">
                  <span className="meta-row-label">
                    <FolderKanban className="w-4 h-4" />
                    Reparto
                  </span>
                  <span className="meta-row-value">
                    <DepartmentBadge department={currentTask.department} size="sm" />
                  </span>
                </div>
              )}

              {/* ── Data Inizio ── */}
              <div className="meta-row">
                <span className="meta-row-label">
                  <Calendar className="w-4 h-4" />
                  Inizio
                </span>
                <span className="meta-row-value">
                  {currentTask.startDate
                    ? formatDate(currentTask.startDate)
                    : <span className="text-slate-400 dark:text-slate-500 font-normal">—</span>
                  }
                </span>
              </div>

              {/* ── Scadenza ── */}
              <div className="meta-row">
                <span className="meta-row-label">
                  <Calendar className="w-4 h-4" />
                  Scadenza
                </span>
                <span className={`meta-row-value flex items-center gap-1.5 justify-end ${
                  isOverdue
                    ? 'text-red-600 dark:text-red-400'
                    : isDueSoon
                      ? 'text-amber-600 dark:text-amber-400'
                      : ''
                }`}>
                  {currentTask.dueDate ? (
                    <>
                      {formatDateRelative(currentTask.dueDate)}
                      {isOverdue && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                    </>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-normal">—</span>
                  )}
                </span>
              </div>

              {/* ── Ore ── */}
              <div className="meta-row">
                <span className="meta-row-label">
                  <Clock className="w-4 h-4" />
                  Ore
                </span>
                <div className="flex items-center gap-2 text-right">
                  {estimatedHours > 0 ? (
                    <>
                      <div className="w-16">
                        <ProgressBar value={hoursProgress} size="sm" color={isOverBudget ? 'red' : 'blue'} />
                      </div>
                      <span className={`text-sm font-medium whitespace-nowrap ${isOverBudget ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                        {formatHours(actualHours)} / {formatHours(estimatedHours)}
                      </span>
                    </>
                  ) : (
                    <span className="meta-row-value">
                      {formatHours(actualHours)}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Registrazioni ── */}
              <div className="meta-row">
                <span className="meta-row-label">
                  <Timer className="w-4 h-4" />
                  Registrazioni
                </span>
                <span className="meta-row-value flex items-center gap-1.5 justify-end">
                  {currentTask._count?.timeEntries ?? 0}
                  {isTimerRunning && (
                    <span className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs font-normal">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      Attivo
                    </span>
                  )}
                </span>
              </div>

              {/* ── Progetto ── */}
              {currentTask.project && (
                <div className="meta-row">
                  <span className="meta-row-label">
                    <FolderKanban className="w-4 h-4" />
                    Progetto
                  </span>
                  <Link
                    to={`/projects/${currentTask.project.id}`}
                    className="text-sm font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors text-right truncate max-w-[9rem]"
                  >
                    {currentTask.project.name}
                  </Link>
                </div>
              )}

              {/* ── Parent task ── */}
              {currentTask.parentTask && (
                <div className="meta-row">
                  <span className="meta-row-label">
                    <GitBranch className="w-4 h-4" />
                    Parent
                  </span>
                  <Link
                    to={`/tasks/${currentTask.parentTask.id}`}
                    className="text-sm font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors text-right truncate max-w-[9rem]"
                  >
                    {currentTask.parentTask.title || currentTask.parentTask.code}
                  </Link>
                </div>
              )}

              {/* ── Subtask count ── */}
              <div className="meta-row">
                <span className="meta-row-label">
                  <ListTodo className="w-4 h-4" />
                  Subtask
                </span>
                <span className="meta-row-value">{subtaskCount}</span>
              </div>

              {/* ── Commenti count ── */}
              <div className="meta-row">
                <span className="meta-row-label">
                  <MessageSquare className="w-4 h-4" />
                  Commenti
                </span>
                <span className="meta-row-value">{comments.length}</span>
              </div>

              {/* ── Tag ── */}
              {taskTags.length > 0 && (
                <div className="meta-row items-start">
                  <span className="meta-row-label pt-0.5">
                    <TagIcon className="w-4 h-4" />
                    Tag
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    <TagList tags={taskTags} size="sm" />
                  </div>
                </div>
              )}

              {/* ── Quick Links (vertical list) ── */}
              <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-700/50 space-y-0.5">
                <Link
                  to={`/time-tracking?taskId=${id}`}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  <Clock className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                  Time Entries
                </Link>
                {currentTask.project && (
                  <Link
                    to={`/projects/${currentTask.project.id}`}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  >
                    <FolderKanban className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    {currentTask.project.name}
                  </Link>
                )}
                <Link
                  to={`/tasks?projectId=${currentTask.projectId || ''}`}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                  Altri task del progetto
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Blocked Reason Modal ── */}
      <BlockedReasonModal
        isOpen={showBlockedModal}
        taskTitle={currentTask.title}
        isSubmitting={isChangingStatus}
        onCancel={handleBlockedCancel}
        onConfirm={handleBlockedConfirm}
      />
    </div>
  )
}
