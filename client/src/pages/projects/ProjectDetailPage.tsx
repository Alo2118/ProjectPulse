/**
 * Project Detail Page - 2-column layout, no tabs
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
  BarChart2,
  FolderKanban,
} from 'lucide-react'
import { Note, Attachment } from '@/types'
import { NoteSection } from '@/components/common/NoteSection'
import { AttachmentSection } from '@/components/common/AttachmentSection'
import { CollapsibleSection } from '@/components/common/CollapsibleSection'
import { DetailPageHeader } from '@/components/common/DetailPageHeader'
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
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
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
            className="flex items-center px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Edit2 className="w-4 h-4 mr-1.5" />
            Modifica
          </button>
        )}
      </DetailPageHeader>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ════════════════ LEFT COLUMN ════════════════ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Project name + description ── */}
          <div className="card p-5 animate-section-reveal">
            <div className="flex items-start gap-3 flex-wrap">
              <h2 className="page-title flex-1">
                {currentProject.name}
              </h2>
              <StatusIcon type="projectStatus" value={currentProject.status} size="md" showLabel />
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {PROJECT_PRIORITY_LABELS[currentProject.priority]}
              </span>
            </div>

            {currentProject.description && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {currentProject.description}
                </p>
              </div>
            )}
          </div>

          {/* ── Progress summary ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '50ms' }}>
            <div className="hud-panel-header mb-4">
              <span>Avanzamento</span>
            </div>

            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <ProgressBar value={progressPercentage} size="md" showLabel />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {completedTasks}/{totalTasks} task
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-sm">
              {inProgressCount > 0 && (
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {inProgressCount} in corso
                </span>
              )}
              {blockedCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {blockedCount} bloccati
                </span>
              )}
              {completedTasks > 0 && (
                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {completedTasks} completati
                </span>
              )}
            </div>

            {/* Hours summary */}
            {(totalHoursLogged > 0 || estimatedHours > 0) && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    <span className="font-semibold text-slate-900 dark:text-white">
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
          </div>

          {/* ── Task Tree ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '100ms' }}>
            <div className="hud-panel-header mb-4">
              <span>Task</span>
              {totalTasks > 0 && (
                <span className="text-xs text-cyan-400 font-mono ml-1">({totalTasks})</span>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mb-3">
              <Link
                to={`/tasks?projectId=${id}`}
                className="text-sm text-slate-500 hover:text-cyan-400 dark:hover:text-cyan-400 flex items-center gap-1 transition-colors"
              >
                Vedi tutti
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              {canEdit && (
                <button
                  onClick={() => navigate(`/tasks/new?projectId=${id}`)}
                  className="flex items-center px-3 py-1.5 text-sm bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
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

          {/* ── Members ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '150ms' }}>
            <CollapsibleSection
              title="Membri del progetto"
              icon={Users}
              defaultExpanded={true}
              borderTop={false}
            >
              <ProjectMembersSection projectId={id!} />
            </CollapsibleSection>
          </div>

          {/* ── Automations ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '175ms' }}>
            <CollapsibleSection
              title="Automazioni"
              icon={Zap}
              defaultExpanded={false}
              borderTop={false}
            >
              <QuickAutomationsPanel projectId={id!} />
            </CollapsibleSection>
          </div>

          {/* ── Activity ── */}
          <div className="card p-5 animate-section-reveal" style={{ animationDelay: '200ms' }}>
            <CollapsibleSection
              title="Attivita'"
              icon={History}
              defaultExpanded={false}
              borderTop={false}
            >
              <ActivityFeed entityType="project" entityId={id!} projectId={id!} />
            </CollapsibleSection>
          </div>
        </div>

        {/* ════════════════ RIGHT SIDEBAR ════════════════ */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 space-y-4">

            {/* ── Metadata card ── */}
            <div className="card p-5 space-y-0 animate-section-reveal">
              <div className="hud-panel-header mb-2">
                <span>Informazioni</span>
              </div>

              {/* Stato */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5" />
                  Stato
                </span>
                <span className="meta-row-value">
                  <StatusIcon type="projectStatus" value={currentProject.status} size="sm" showLabel />
                </span>
              </div>

              {/* Priorita */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Priorita
                </span>
                <span className="meta-row-value">
                  {PROJECT_PRIORITY_LABELS[currentProject.priority]}
                </span>
              </div>

              {/* Owner */}
              {currentProject.owner && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Owner
                  </span>
                  <span className="meta-row-value">
                    {currentProject.owner.firstName} {currentProject.owner.lastName}
                  </span>
                </div>
              )}

              {/* Data inizio */}
              {currentProject.startDate && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Inizio
                  </span>
                  <span className="meta-row-value">
                    {formatDateShort(currentProject.startDate)}
                  </span>
                </div>
              )}

              {/* Data fine */}
              {currentProject.targetEndDate && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Scadenza
                  </span>
                  <span className={`meta-row-value ${
                    isOverdue
                      ? 'text-red-500 dark:text-red-400'
                      : isDueSoon
                        ? 'text-amber-500 dark:text-amber-400'
                        : ''
                  }`}>
                    {formatDateRelative(currentProject.targetEndDate)}
                    {isOverdue && <AlertCircle className="w-3 h-3 inline ml-1" />}
                  </span>
                </div>
              )}

              {/* Task count */}
              <div className="meta-row">
                <span className="meta-row-label flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Task totali
                </span>
                <span className="meta-row-value">{totalTasks}</span>
              </div>

              {/* Hours */}
              {(totalHoursLogged > 0 || estimatedHours > 0) && (
                <div className="meta-row">
                  <span className="meta-row-label flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Ore
                  </span>
                  <span className="meta-row-value">
                    {Math.round(totalHoursLogged * 10) / 10}h
                    {estimatedHours > 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">
                        / {Math.round(estimatedHours * 10) / 10}h
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* ── Budget card ── */}
            <BudgetCard
              budget={currentProject.budget !== null ? parseFloat(currentProject.budget) : null}
              totalHoursLogged={totalHoursLogged}
              estimatedHours={estimatedHours}
            />

            {/* ── Notes (collapsible) ── */}
            <div className="card p-5">
              <CollapsibleSection
                title={`Note${notes.length > 0 ? ` (${notes.length})` : ''}`}
                icon={StickyNote}
                defaultExpanded={notes.length > 0}
                borderTop={false}
              >
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
              </CollapsibleSection>
            </div>

            {/* ── Attachments (collapsible) ── */}
            <div className="card p-5">
              <CollapsibleSection
                title={`Allegati${attachments.length > 0 ? ` (${attachments.length})` : ''}`}
                icon={Paperclip}
                defaultExpanded={attachments.length > 0}
                borderTop={false}
              >
                <AttachmentSection
                  entityType="project"
                  entityId={id!}
                  attachments={attachments}
                  currentUser={user}
                  isLoading={attachmentsLoading}
                  onAttachmentAdded={handleAttachmentAdded}
                  onAttachmentDeleted={handleAttachmentDeleted}
                />
              </CollapsibleSection>
            </div>

            {/* ── Quick links ── */}
            <div className="card p-5">
              <div className="hud-panel-header mb-3">
                <span>Link rapidi</span>
              </div>
              <div className="space-y-1">
                <Link
                  to={`/risks?projectId=${id}`}
                  className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Rischi
                </Link>
                <Link
                  to={`/documents?projectId=${id}`}
                  className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Documenti
                </Link>
                <Link
                  to={`/time-entries?projectId=${id}`}
                  className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  Registrazione tempo
                </Link>
                <Link
                  to={`/gantt?projectId=${id}`}
                  className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                    <FolderKanban className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  Gantt
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
