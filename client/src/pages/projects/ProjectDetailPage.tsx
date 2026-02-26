/**
 * Project Detail Page - Compact layout with reusable components
 * @module pages/projects/ProjectDetailPage
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import { useTimerToggle } from '@hooks/useTimerToggle'
import { useTaskTreeStore } from '@stores/taskTreeStore'
import api from '@services/api'
import {
  Edit2,
  Loader2,
  Calendar,
  User,
  AlertCircle,
  FileText,
  AlertTriangle,
  Clock,
  Users,
  CheckSquare,
  Plus,
  ExternalLink,
  StickyNote,
  Paperclip,
  History,
  Zap,
} from 'lucide-react'
import { Note, Attachment } from '@/types'
import { NoteSection } from '@/components/common/NoteSection'
import { AttachmentSection } from '@/components/common/AttachmentSection'
import { DetailPageHeader } from '@/components/common/DetailPageHeader'
import { InfoCard } from '@/components/common/InfoCard'
import { MetaRow } from '@/components/common/MetaRow'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { TabSection } from '@/components/common/TabSection'
import { QuickLinksGrid } from '@/components/common/QuickLinksGrid'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { TaskTreeView } from '@/components/reports/TaskTreeView'
import { ProjectMembersSection } from '@/components/projects/ProjectMembersSection'
import { BudgetCard } from '@/components/projects/BudgetCard'
import ActivityFeed from '@components/common/ActivityFeed'
import QuickAutomationsPanel from '@components/features/QuickAutomationsPanel'
import { StatusIcon } from '@/components/ui/StatusIcon'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PROJECT_PRIORITY_LABELS } from '@/constants'
import { formatDateShort, formatDateRelative } from '@utils/dateFormatters'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentProject, isLoading, fetchProject, clearCurrentProject } = useProjectStore()
  const { canTrackTime, handleTimerToggle, runningTimerTaskId } = useTimerToggle()
  const { treeData } = useTaskTreeStore()

  const [notes, setNotes] = useState<Note[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchProject(id)
      loadNotes(id)
      loadAttachments(id)
    }
    return () => clearCurrentProject()
  }, [id, fetchProject, clearCurrentProject])

  const loadNotes = async (projectId: string) => {
    setNotesLoading(true)
    try {
      const response = await api.get<{ success: boolean; data: Note[] }>(
        `/notes/project/${projectId}`
      )
      if (response.data.success) {
        setNotes(response.data.data)
      }
    } catch {
      // silently ignore
    } finally {
      setNotesLoading(false)
    }
  }

  const loadAttachments = async (projectId: string) => {
    setAttachmentsLoading(true)
    try {
      const response = await api.get<{ success: boolean; data: Attachment[] }>(
        `/attachments/project/${projectId}`
      )
      if (response.data.success) {
        setAttachments(response.data.data)
      }
    } catch {
      // silently ignore
    } finally {
      setAttachmentsLoading(false)
    }
  }

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


  const canEdit = user?.role === 'admin' || user?.role === 'direzione' || currentProject?.ownerId === user?.id
  const showInternalToggle = user?.role === 'admin' || user?.role === 'direzione'

  // Stats from tree store (populated by TaskTreeView)
  const projectStats = treeData?.projects?.[0]?.stats
  const totalTasks = projectStats ? projectStats.total : 0
  const completedTasks = projectStats?.completed ?? 0
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const inProgressCount = projectStats?.inProgress ?? 0
  const blockedCount = projectStats?.blocked ?? 0
  const totalHoursLogged = projectStats?.totalHours ?? 0
  const estimatedHours = projectStats?.estimatedHours ?? 0

  const daysUntilDeadline = currentProject?.targetEndDate
    ? Math.ceil(
        (new Date(currentProject.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null

  const isFinished = currentProject?.status === 'completed' || currentProject?.status === 'cancelled'
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0 && !isFinished
  const isDueSoon = daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7 && !isFinished

  if (isLoading && !currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!currentProject) {
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
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Progetti', href: '/projects' },
          { label: currentProject.name },
        ]}
      />

      {/* Page Header */}
      <DetailPageHeader title={currentProject.name} subtitle="Dettagli Progetto">
        {canEdit && (
          <button
            onClick={() => navigate(`/projects/${id}/edit`)}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Edit2 className="w-4 h-4 mr-1.5" />
            Modifica
          </button>
        )}
      </DetailPageHeader>

      {/* Main Info Card */}
      <InfoCard>
        {/* Title + Status + Priority */}
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {currentProject.name}
          </h2>
          <StatusIcon type="projectStatus" value={currentProject.status} size="md" showLabel />
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {PROJECT_PRIORITY_LABELS[currentProject.priority]}
          </span>
        </div>

        {/* Meta row: Owner, Start Date, Deadline */}
        <MetaRow
          className="mt-3"
          items={[
            currentProject.owner && {
              icon: User,
              value: `${currentProject.owner.firstName} ${currentProject.owner.lastName}`,
            },
            currentProject.startDate ? {
              icon: Calendar,
              value: formatDateShort(currentProject.startDate),
            } : null,
            currentProject.targetEndDate ? {
              icon: Clock,
              value: `Scade ${formatDateRelative(currentProject.targetEndDate)}`,
              className: isOverdue ? 'text-red-500 font-medium' : isDueSoon ? 'text-amber-500' : '',
            } : null,
          ]}
        />

        {/* Progress bar */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <ProgressBar value={progressPercentage} size="md" showLabel />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {completedTasks}/{totalTasks} task
              </span>
              {inProgressCount > 0 && (
                <span className="text-blue-600 dark:text-blue-400">
                  {inProgressCount} in corso
                </span>
              )}
              {blockedCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {blockedCount} bloccati
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hours summary */}
        {(totalHoursLogged > 0 || estimatedHours > 0) && (
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.round(totalHoursLogged * 10) / 10}h
                </span>
                {estimatedHours > 0 && (
                  <span> / {Math.round(estimatedHours * 10) / 10}h stimate</span>
                )}
              </span>
            </div>
            {estimatedHours > 0 && (
              <div className="flex-1 max-w-32">
                <ProgressBar
                  value={Math.min(100, Math.round((totalHoursLogged / estimatedHours) * 100))}
                  size="sm"
                  color={totalHoursLogged > estimatedHours ? 'red' : undefined}
                />
              </div>
            )}
          </div>
        )}

        {/* Description (collapsible) */}
        {currentProject.description && (
          <CollapsibleSection
            title="Descrizione"
            icon={FileText}
            isEmpty={!currentProject.description}
            emptyMessage="Nessuna descrizione"
          >
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm">
              {currentProject.description}
            </p>
          </CollapsibleSection>
        )}
      </InfoCard>

      {/* Budget & Hours Card */}
      <BudgetCard
        budget={currentProject.budget !== null ? parseFloat(currentProject.budget) : null}
        totalHoursLogged={totalHoursLogged}
        estimatedHours={estimatedHours}
      />

      {/* Tabs: Tasks / Notes / Attachments */}
      <TabSection
        defaultTab="tasks"
        tabs={[
          {
            id: 'tasks',
            label: 'Task',
            icon: CheckSquare,
            count: totalTasks,
            content: (
              <div>
                <div className="flex items-center justify-end gap-2 mb-3">
                  <Link
                    to={`/tasks?projectId=${id}`}
                    className="text-sm text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
                  >
                    Vedi tutti
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  {canEdit && (
                    <button
                      onClick={() => navigate(`/tasks/new?projectId=${id}`)}
                      className="flex items-center px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Nuovo
                    </button>
                  )}
                </div>
                <TaskTreeView
                  projectId={id}
                  skipProjectLevel
                  mode="compact"
                  showSummary={false}
                  showControls={false}
                  showFilters={false}
                  canTrackTime={canTrackTime}
                  onTimerToggle={handleTimerToggle}
                  runningTimerId={runningTimerTaskId}
                />
              </div>
            ),
          },
          {
            id: 'notes',
            label: 'Note',
            icon: StickyNote,
            count: notes.length,
            content: (
              <NoteSection
                entityType="project"
                entityId={id!}
                notes={notes}
                currentUser={user}
                isLoading={notesLoading}
                onNoteAdded={handleNoteAdded}
                onNoteDeleted={handleNoteDeleted}
                showInternalToggle={showInternalToggle}
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
                entityType="project"
                entityId={id!}
                attachments={attachments}
                currentUser={user}
                isLoading={attachmentsLoading}
                onAttachmentAdded={handleAttachmentAdded}
                onAttachmentDeleted={handleAttachmentDeleted}
              />
            ),
          },
          {
            id: 'members',
            label: 'Membri',
            icon: Users,
            content: (
              <ProjectMembersSection projectId={id!} />
            ),
          },
          {
            id: 'automations',
            label: 'Automazioni',
            icon: Zap,
            content: (
              <QuickAutomationsPanel projectId={id!} />
            ),
          },
          {
            id: 'activity',
            label: 'Attivita\'',
            icon: History,
            content: (
              <ActivityFeed entityType="project" entityId={id!} projectId={id!} />
            ),
          },
        ]}
      />

      {/* Quick Links */}
      <QuickLinksGrid
        columns={4}
        links={[
          {
            to: `/risks?projectId=${id}`,
            icon: AlertTriangle,
            iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
            iconColorClass: 'text-amber-600 dark:text-amber-400',
            title: 'Rischi',
            subtitle: 'Gestisci rischi',
          },
          {
            to: `/documents?projectId=${id}`,
            icon: FileText,
            iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
            iconColorClass: 'text-blue-600 dark:text-blue-400',
            title: 'Documenti',
            subtitle: 'File e allegati',
          },
          {
            to: `/time-entries?projectId=${id}`,
            icon: Clock,
            iconBgClass: 'bg-green-100 dark:bg-green-900/30',
            iconColorClass: 'text-green-600 dark:text-green-400',
            title: 'Tempo',
            subtitle: 'Registrazione ore',
          },
          {
            to: `/users?projectId=${id}`,
            icon: Users,
            iconBgClass: 'bg-purple-100 dark:bg-purple-900/30',
            iconColorClass: 'text-purple-600 dark:text-purple-400',
            title: 'Team',
            subtitle: 'Membri',
          },
        ]}
      />
    </div>
  )
}
