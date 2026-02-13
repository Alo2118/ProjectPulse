/**
 * Task Detail Page - Compact layout with reusable components
 * @module pages/tasks/TaskDetailPage
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTaskStore } from '@stores/taskStore'
import { useAuthStore } from '@stores/authStore'
import { useDashboardStore } from '@stores/dashboardStore'
import { useTaskTreeStore } from '@stores/taskTreeStore'
import api from '@services/api'
import {
  Loader2,
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
} from 'lucide-react'
import { Comment, TaskStatus, Note, Attachment, Tag } from '@/types'
import { StatusIcon } from '@/components/ui/StatusIcon'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CommentSection } from '@/components/tasks/CommentSection'
import { TaskTreeView } from '@/components/reports/TaskTreeView'
import { BlockedReasonModal } from '@/components/tasks/BlockedReasonModal'
import { NoteSection } from '@/components/common/NoteSection'
import { AttachmentSection } from '@/components/common/AttachmentSection'
import { DetailPageHeader } from '@/components/common/DetailPageHeader'
import { InfoCard } from '@/components/common/InfoCard'
import { TabSection } from '@/components/common/TabSection'
import { QuickLinksGrid } from '@/components/common/QuickLinksGrid'
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_TRANSITIONS,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
} from '@/constants'
import { useTagStore } from '@stores/tagStore'
import TagList from '@components/tags/TagList'

function formatDateRelative(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return `${Math.abs(diff)}g fa`
  if (diff === 0) return 'Oggi'
  if (diff === 1) return 'Domani'
  if (diff < 7) return `tra ${diff}g`

  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

function formatHours(value: string | number | null | undefined): string {
  if (!value) return '0h'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${num}h`
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentTask, isLoading, fetchTask, changeTaskStatus, clearCurrentTask } = useTaskStore()
  const { runningTimer, startTimer, stopTimer } = useDashboardStore()
  const { treeData } = useTaskTreeStore()

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

  const loadComments = async (taskId: string) => {
    setCommentsLoading(true)
    try {
      const response = await api.get<{ success: boolean; data: Comment[] }>(
        `/comments/task/${taskId}`
      )
      if (response.data.success) {
        setComments(response.data.data)
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
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
    } catch (error) {
      console.error('Failed to load notes:', error)
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
    } catch (error) {
      console.error('Failed to load attachments:', error)
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
      } catch (error) {
        console.error('Failed to change status:', error)
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
      } catch (error) {
        console.error('Failed to change status to blocked:', error)
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
    try {
      if (runningTimer?.taskId === id) {
        await stopTimer()
      } else {
        await startTimer(id)
      }
    } catch (error) {
      console.error('Timer error:', error)
    }
  }, [id, runningTimer?.taskId, startTimer, stopTimer])

  const handleSubtaskTimerToggle = useCallback(
    async (taskId: string) => {
      try {
        if (runningTimer?.taskId === taskId) {
          await stopTimer()
        } else {
          await startTimer(taskId)
        }
      } catch (error) {
        console.error('Timer error:', error)
      }
    },
    [runningTimer?.taskId, startTimer, stopTimer]
  )

  const handleCommentAdded = useCallback((comment: Comment) => {
    setComments((prev) => [comment, ...prev])
  }, [])

  const handleCommentDeleted = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }, [])

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

  const isCreator = currentTask?.createdById === user?.id
  const isAssignee = currentTask?.assignee?.id === user?.id
  const isTaskOwner = isCreator || isAssignee
  const canEdit = user?.role === 'admin' || user?.role === 'direzione' || isTaskOwner
  const canTrackTime = user?.role !== 'direzione'
  const isTimerRunning = runningTimer?.taskId === id

  const estimatedHours = currentTask?.estimatedHours ? Number(currentTask.estimatedHours) : 0
  const actualHours = currentTask?.actualHours ? Number(currentTask.actualHours) : 0
  const hoursProgress = estimatedHours > 0 ? Math.min((actualHours / estimatedHours) * 100, 100) : 0
  const isOverBudget = actualHours > estimatedHours && estimatedHours > 0

  const daysUntilDeadline = currentTask?.dueDate
    ? Math.ceil((new Date(currentTask.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const isFinished = currentTask?.status === 'done' || currentTask?.status === 'cancelled'
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0 && !isFinished
  const isDueSoon = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 2 && !isFinished

  if (isLoading && !currentTask) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!currentTask) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Task non trovato</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Il task richiesto non esiste o è stato eliminato.
        </p>
        <button onClick={() => navigate('/tasks')} className="btn-primary">
          Torna ai Task
        </button>
      </div>
    )
  }

  const taskTypeIcon = currentTask.taskType === 'milestone'
    ? { icon: Target, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' }
    : currentTask.taskType === 'subtask'
      ? { icon: ListTodo, bg: 'bg-gray-100 dark:bg-gray-700', color: 'text-gray-600 dark:text-gray-400' }
      : { icon: CheckSquare, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' }

  const TaskTypeIconComponent = taskTypeIcon.icon

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <DetailPageHeader title="Dettagli Task" subtitle={currentTask.code}>
        {canTrackTime && currentTask.taskType !== 'milestone' && (
          <button
            onClick={handleTimerToggle}
            className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
              isTimerRunning
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
          >
            {isTimerRunning ? (
              <>
                <Square className="w-4 h-4 mr-1.5" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1.5" />
                Timer
              </>
            )}
          </button>
        )}
        {canEdit && (
          <button
            onClick={() => navigate(`/tasks/${id}/edit`)}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Edit2 className="w-4 h-4 mr-1.5" />
            Modifica
          </button>
        )}
      </DetailPageHeader>

      {/* Main Info Card */}
      <InfoCard>
        {/* 1. Project name (breadcrumb) + Parent task */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {currentTask.project && (
            <Link
              to={`/projects/${currentTask.project.id}`}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1.5"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              {currentTask.project.name}
            </Link>
          )}
          {currentTask.parentTask && (
            <>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <Link
                to={`/tasks/${currentTask.parentTask.id}`}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1.5"
              >
                <GitBranch className="w-3.5 h-3.5" />
                {currentTask.parentTask.title || currentTask.parentTask.code}
              </Link>
            </>
          )}
        </div>

        {/* 2. Title row: icon + type + title + priority + deadline */}
        <div className="flex items-start gap-3 mt-2">
          <div className={`p-2 rounded-lg flex-shrink-0 ${taskTypeIcon.bg}`}>
            <TaskTypeIconComponent className={`w-5 h-5 ${taskTypeIcon.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${TASK_TYPE_COLORS[currentTask.taskType || 'task']}`}>
                {TASK_TYPE_LABELS[currentTask.taskType || 'task']}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{currentTask.code}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentTask.title}</h2>
              {currentTask.isRecurring && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
                  <Repeat2 className="w-3 h-3" />
                  Ricorrente
                </span>
              )}
              <StatusIcon type="taskPriority" value={currentTask.priority} size="sm" showLabel />
              {taskTags.length > 0 && <TagList tags={taskTags} size="sm" />}
              {currentTask.dueDate && (
                <span className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-500 font-medium' : isDueSoon ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateRelative(currentTask.dueDate)}
                  {isOverdue && <AlertCircle className="w-3.5 h-3.5" />}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Status + change controls (grouped) */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 flex-wrap">
          <StatusIcon type="taskStatus" value={currentTask.status} size="md" showLabel />
          {(canEdit || isAssignee) && currentTask.status !== 'cancelled' && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              {TASK_STATUS_TRANSITIONS[currentTask.status]?.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className="px-2.5 py-1 text-xs rounded-full transition-colors flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <StatusIcon type="taskStatus" value={status} size="sm" />
                  <span>{TASK_STATUS_LABELS[status]}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* 4. Description */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {currentTask.description ? (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {currentTask.description}
            </p>
          ) : canEdit ? (
            <button
              onClick={() => navigate(`/tasks/${id}/edit`)}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              + Aggiungi descrizione
            </button>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nessuna descrizione</p>
          )}
        </div>

        {/* Milestone Info Banner */}
        {currentTask.taskType === 'milestone' && (
          <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Target className="w-4 h-4" />
              <span className="text-sm">
                Questa milestone raccoglie task figlie. Il tempo e l'avanzamento sono calcolati automaticamente.
              </span>
            </div>
          </div>
        )}

        {/* Blocked Reason Banner */}
        {currentTask.status === 'blocked' && currentTask.blockedReason && (
          <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Motivo del blocco</h4>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">
                  {currentTask.blockedReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5. Hours progress bar */}
        {estimatedHours > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <ProgressBar value={hoursProgress} size="sm" color={isOverBudget ? 'red' : 'blue'} />
              </div>
              <span className={`text-sm font-medium whitespace-nowrap ${isOverBudget ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                {formatHours(actualHours)} / {formatHours(estimatedHours)}
              </span>
            </div>
          </div>
        )}

        {/* 6. Assignee + counters (same row) */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 flex-wrap text-sm text-gray-500 dark:text-gray-400">
          {currentTask.assignee && (
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span className="text-gray-700 dark:text-gray-300">
                {currentTask.assignee.firstName} {currentTask.assignee.lastName}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" />
            <span>{currentTask._count?.timeEntries || 0} registrazioni</span>
            {isTimerRunning && (
              <span className="flex items-center gap-1 text-red-500 text-xs">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Attivo
              </span>
            )}
          </div>
          {(treeData?.subtasks?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              <span>{treeData?.subtasks?.length ?? 0} subtask</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{comments.length} commenti</span>
          </div>
        </div>
      </InfoCard>

      {/* Tabs: Subtasks / Comments / Notes / Attachments */}
      <TabSection
        defaultTab="subtasks"
        tabs={[
          {
            id: 'subtasks',
            label: 'Subtask',
            icon: GitBranch,
            count: treeData?.subtasks?.length ?? 0,
            content: (
              <div>
                {canEdit && (
                  <div className="flex justify-end mb-3">
                    <Link
                      to={`/tasks/new?parentTaskId=${id}&projectId=${currentTask.projectId || ''}`}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
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
                  runningTimerId={runningTimer?.taskId ?? null}
                />
              </div>
            ),
          },
          {
            id: 'comments',
            label: 'Commenti',
            icon: MessageSquare,
            count: comments.length,
            content: (
              <CommentSection
                taskId={id || ''}
                comments={comments}
                currentUser={user}
                isLoading={commentsLoading}
                onCommentAdded={handleCommentAdded}
                onCommentDeleted={handleCommentDeleted}
              />
            ),
          },
          {
            id: 'notes',
            label: 'Note',
            icon: StickyNote,
            count: notes.length,
            content: (
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
            ),
          },
          {
            id: 'attachments',
            label: 'Allegati',
            icon: Paperclip,
            count: attachments.length,
            content: (
              <AttachmentSection
                entityType="task"
                entityId={id || ''}
                attachments={attachments}
                currentUser={user}
                isLoading={attachmentsLoading}
                onAttachmentAdded={handleAttachmentAdded}
                onAttachmentDeleted={handleAttachmentDeleted}
              />
            ),
          },
        ]}
      />

      {/* Quick Links */}
      <QuickLinksGrid
        columns={3}
        links={[
          {
            to: `/time-tracking?taskId=${id}`,
            icon: Clock,
            iconBgClass: 'bg-green-100 dark:bg-green-900/30',
            iconColorClass: 'text-green-600 dark:text-green-400',
            title: 'Time Entries',
            subtitle: 'Vedi registrazioni',
          },
          currentTask.project && {
            to: `/projects/${currentTask.project.id}`,
            icon: FolderKanban,
            iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
            iconColorClass: 'text-blue-600 dark:text-blue-400',
            title: 'Progetto',
            subtitle: currentTask.project.name,
          },
          {
            to: `/tasks?projectId=${currentTask.projectId || ''}`,
            icon: ExternalLink,
            iconBgClass: 'bg-purple-100 dark:bg-purple-900/30',
            iconColorClass: 'text-purple-600 dark:text-purple-400',
            title: 'Altri Task',
            subtitle: 'Stesso progetto',
          },
        ]}
      />

      {/* Blocked Reason Modal */}
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
