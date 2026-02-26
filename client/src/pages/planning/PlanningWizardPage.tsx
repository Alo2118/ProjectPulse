/**
 * PlanningWizardPage - 3-step guided wizard for creating a project plan.
 *
 * Step 0: Select project and (optionally) a template to pre-fill the plan.
 * Step 1: Edit the task tree, optionally request a timeline suggestion.
 * Step 2: Review the summary and commit the plan to the database.
 *
 * @module pages/planning/PlanningWizardPage
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Wand2,
  Loader2,
  LayoutTemplate,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
} from 'lucide-react'

import { usePlanningStore } from '@stores/planningStore'
import { useProjectStore } from '@stores/projectStore'
import api from '@services/api'

import { PlanStepIndicator } from '@components/planning/PlanStepIndicator'
import { PlanTreeEditor } from '@components/planning/PlanTreeEditor'
import { PlanTimelinePreview } from '@components/planning/PlanTimelinePreview'
import { PlanSummaryPanel } from '@components/planning/PlanSummaryPanel'
import type { PlanTask, TeamCapacityEntry } from '@stores/planningStore'
import type { Project, ProjectTemplate } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const genId = () => 'temp-' + Math.random().toString(36).slice(2, 9)

interface ApiResponse<T> {
  success: boolean
  data: T
}

interface UserItem {
  id: string
  firstName: string
  lastName: string
}

// ---------------------------------------------------------------------------
// Step 0 — Project + Template Selection
// ---------------------------------------------------------------------------

interface Step0Props {
  projects: Project[]
  templates: ProjectTemplate[]
  selectedProjectId: string | null
  selectedTemplateId: string | null
  isLoadingTemplates: boolean
  isGenerating: boolean
  generateError: string | null
  onSelectProject: (id: string) => void
  onSelectTemplate: (id: string | null) => void
  onNext: () => void
}

function Step0({
  projects,
  templates,
  selectedProjectId,
  selectedTemplateId,
  isLoadingTemplates,
  isGenerating,
  generateError,
  onSelectProject,
  onSelectTemplate,
  onNext,
}: Step0Props) {
  const activeProjects = useMemo(
    () => projects.filter((p) => !['completed', 'cancelled'].includes(p.status)),
    [projects],
  )

  return (
    <div className="space-y-5">
      {/* Project selector */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Seleziona Progetto
          </h2>
          <span className="text-xs text-red-500">*</span>
        </div>

        {activeProjects.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nessun progetto attivo trovato.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project.id)}
                aria-pressed={selectedProjectId === project.id}
                className={[
                  'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                  selectedProjectId === project.id
                    ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-300 dark:ring-primary-700'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/5',
                ].join(' ')}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{project.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {project.name}
                  </p>
                </div>
                {selectedProjectId === project.id && (
                  <CheckCircle2
                    className="flex-shrink-0 ml-auto w-4 h-4 text-primary-500"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Template selector */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-violet-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Template di Piano
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">(opzionale)</span>
        </div>

        {isLoadingTemplates ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Caricamento template...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Empty plan option */}
            <button
              type="button"
              onClick={() => onSelectTemplate(null)}
              aria-pressed={selectedTemplateId === null}
              className={[
                'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                selectedTemplateId === null
                  ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-300 dark:ring-violet-700'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/5',
              ].join(' ')}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Piano Vuoto</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Inizia da zero</p>
              </div>
              {selectedTemplateId === null && (
                <CheckCircle2
                  className="flex-shrink-0 ml-auto w-4 h-4 text-violet-500"
                  aria-hidden="true"
                />
              )}
            </button>

            {templates.map((template) => {
              let phaseCount = 0
              try {
                const parsed = Array.isArray(template.phases)
                  ? template.phases
                  : (JSON.parse(template.phases as unknown as string) as unknown[])
                phaseCount = parsed.length
              } catch {
                phaseCount = 0
              }

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelectTemplate(template.id)}
                  aria-pressed={selectedTemplateId === template.id}
                  className={[
                    'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                    selectedTemplateId === template.id
                      ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-300 dark:ring-violet-700'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/5',
                  ].join(' ')}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                    <LayoutTemplate
                      className="w-4 h-4 text-violet-600 dark:text-violet-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {template.name}
                    </p>
                    {template.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {template.description}
                      </p>
                    )}
                    {phaseCount > 0 && (
                      <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                        {phaseCount} {phaseCount === 1 ? 'fase' : 'fasi'}
                      </p>
                    )}
                  </div>
                  {selectedTemplateId === template.id && (
                    <CheckCircle2
                      className="flex-shrink-0 w-4 h-4 text-violet-500"
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {generateError && (
          <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            {generateError}
          </div>
        )}
      </div>

      {/* Next button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedProjectId || isGenerating}
          aria-label="Vai al passo successivo"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Generazione piano...
            </>
          ) : (
            <>
              Avanti
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Edit Plan
// ---------------------------------------------------------------------------

interface Step1Props {
  tasks: PlanTask[]
  users: UserItem[]
  timelineSuggestion: ReturnType<typeof usePlanningStore.getState>['timelineSuggestion']
  isLoadingTimeline: boolean
  timelineError: string | null
  onAddTask: (parentTempId?: string) => void
  onUpdateTask: (tempId: string, updates: Partial<PlanTask>) => void
  onRemoveTask: (tempId: string) => void
  onSuggestTimeline: () => void
  onBack: () => void
  onNext: () => void
}

function Step1({
  tasks,
  users,
  timelineSuggestion,
  isLoadingTimeline,
  timelineError,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  onSuggestTimeline,
  onBack,
  onNext,
}: Step1Props) {
  return (
    <div className="space-y-4">
      {/* Tree editor */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary-500" aria-hidden="true" />
            Struttura del Piano
          </h2>
          <button
            type="button"
            onClick={onSuggestTimeline}
            disabled={isLoadingTimeline || tasks.filter((t) => t.taskType !== 'milestone').length === 0}
            aria-label="Calcola suggerimento timeline"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingTimeline ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {isLoadingTimeline ? 'Calcolo...' : 'Suggerisci Timeline'}
          </button>
        </div>

        <PlanTreeEditor
          tasks={tasks}
          users={users}
          onUpdate={onUpdateTask}
          onRemove={onRemoveTask}
          onAddTask={onAddTask}
        />
      </div>

      {/* Timeline preview */}
      {(timelineSuggestion || isLoadingTimeline || timelineError) && (
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-500" aria-hidden="true" />
            Anteprima Timeline
          </h2>

          {isLoadingTimeline && (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Calcolo percorso critico...
            </div>
          )}

          {timelineError && !isLoadingTimeline && (
            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              {timelineError}
            </div>
          )}

          {timelineSuggestion && !isLoadingTimeline && (
            <PlanTimelinePreview
              tasks={tasks}
              scheduledTasks={timelineSuggestion.scheduledTasks}
              totalDurationDays={timelineSuggestion.totalDurationDays}
              criticalPathLength={timelineSuggestion.criticalPathLength}
            />
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Torna alla selezione progetto"
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Indietro
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={tasks.length === 0}
          aria-label="Vai alla conferma"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          Avanti
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function PlanningWizardPage() {
  const navigate = useNavigate()

  const {
    wizardTasks,
    wizardStep,
    selectedProjectId,
    selectedTemplateId,
    timelineSuggestion,
    isLoadingTimeline,
    timelineError,
    setWizardTasks,
    addWizardTask,
    updateWizardTask,
    removeWizardTask,
    setWizardStep,
    setSelectedProjectId,
    setSelectedTemplateId,
    suggestTimeline,
    resetWizard,
  } = usePlanningStore()

  const { projects, fetchProjects } = useProjectStore()

  // ---- Local state ----
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [teamCapacity, setTeamCapacity] = useState<TeamCapacityEntry[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isCommitting, setIsCommitting] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [commitSuccess, setCommitSuccess] = useState(false)

  // ---- Load projects on mount ----
  useEffect(() => {
    if (projects.length === 0) {
      fetchProjects()
    }
  }, [projects.length, fetchProjects])

  // ---- Load templates on mount ----
  useEffect(() => {
    setIsLoadingTemplates(true)
    api
      .get<ApiResponse<ProjectTemplate[]>>('/templates')
      .then((res) => {
        if (res.data.success) {
          setTemplates(res.data.data.filter((t) => t.isActive))
        }
      })
      .catch(() => {
        // Non-critical; user can still use empty plan
      })
      .finally(() => setIsLoadingTemplates(false))
  }, [])

  // ---- Load users for assignee picker (Step 1) ----
  useEffect(() => {
    if (wizardStep < 1) return
    if (users.length > 0) return

    api
      .get<ApiResponse<UserItem[]>>('/users?limit=200&isActive=true')
      .then((res) => {
        if (res.data.success) setUsers(res.data.data)
      })
      .catch(() => {
        // Users picker is optional; swallow the error
      })
  }, [wizardStep, users.length])

  // ---- Load team capacity for Step 1 sidebar and Step 2 summary ----
  useEffect(() => {
    if (wizardStep < 1) return

    api
      .get<ApiResponse<TeamCapacityEntry[]>>('/planning/team-capacity')
      .then((res) => {
        if (res.data.success) setTeamCapacity(res.data.data)
      })
      .catch(() => {
        // Non-critical
      })
  }, [wizardStep])

  // ---- Reset wizard on unmount (optional) ----
  // Intentionally NOT resetting on unmount so users can navigate back
  // and find their progress intact.

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectProject = useCallback(
    (id: string) => {
      setSelectedProjectId(id)
    },
    [setSelectedProjectId],
  )

  const handleSelectTemplate = useCallback(
    (id: string | null) => {
      setSelectedTemplateId(id)
    },
    [setSelectedTemplateId],
  )

  /**
   * Advances from Step 0 to Step 1.
   * If a template was selected, fetches the suggested tasks from the API
   * and loads them into the wizard store.  If "Piano Vuoto" was chosen,
   * the task list is simply cleared.
   */
  const handleStep0Next = useCallback(async () => {
    if (!selectedProjectId) return
    setGenerateError(null)

    if (!selectedTemplateId) {
      // Empty plan — keep whatever tasks already exist (or start fresh)
      if (wizardTasks.length === 0) {
        // Seed with one empty milestone to guide the user
        setWizardTasks([
          {
            tempId: genId(),
            title: 'Milestone 1',
            taskType: 'milestone',
            estimatedHours: 0,
            priority: 'medium',
            dependencies: [],
          },
        ])
      }
      setWizardStep(1)
      return
    }

    setIsGenerating(true)
    try {
      const res = await api.post<ApiResponse<{ tasks: PlanTask[]; dependencies: unknown[] }>>(
        '/planning/generate-plan',
        { templateId: selectedTemplateId },
      )
      if (res.data.success) {
        setWizardTasks(res.data.data.tasks)
        setWizardStep(1)
      } else {
        setGenerateError('Impossibile generare il piano dal template.')
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Errore durante la generazione del piano.'
      setGenerateError(msg)
    } finally {
      setIsGenerating(false)
    }
  }, [selectedProjectId, selectedTemplateId, wizardTasks.length, setWizardTasks, setWizardStep])

  const handleAddTask = useCallback(
    (parentTempId?: string) => {
      if (parentTempId) {
        const parent = wizardTasks.find((t) => t.tempId === parentTempId)
        const childType =
          parent?.taskType === 'milestone' ? 'task' : 'subtask'
        addWizardTask({
          tempId: genId(),
          title: childType === 'task' ? 'Nuova Attività' : 'Nuovo Sottocompito',
          taskType: childType,
          estimatedHours: childType === 'subtask' ? 2 : 4,
          priority: 'medium',
          parentTempId,
          dependencies: [],
        })
      } else {
        // Root-level: decide type based on existing items
        const hasMilestones = wizardTasks.some((t) => t.taskType === 'milestone')
        addWizardTask({
          tempId: genId(),
          title: hasMilestones ? 'Nuovo Milestone' : 'Nuova Attività',
          taskType: hasMilestones ? 'milestone' : 'task',
          estimatedHours: 0,
          priority: 'medium',
          dependencies: [],
        })
      }
    },
    [wizardTasks, addWizardTask],
  )

  const handleSuggestTimeline = useCallback(() => {
    const planTasks = wizardTasks.filter((t) => t.taskType !== 'milestone')
    if (planTasks.length === 0) return
    void suggestTimeline(planTasks)
  }, [wizardTasks, suggestTimeline])

  const handleCommit = useCallback(async () => {
    if (!selectedProjectId || wizardTasks.length === 0) return

    setIsCommitting(true)
    setCommitError(null)

    try {
      const res = await api.post<ApiResponse<{ created: number }>>('/planning/commit-plan', {
        projectId: selectedProjectId,
        tasks: wizardTasks.map((t) => ({
          tempId: t.tempId,
          title: t.title,
          taskType: t.taskType,
          estimatedHours: t.estimatedHours,
          priority: t.priority,
          assigneeId: t.assigneeId,
          parentTempId: t.parentTempId,
        })),
      })

      if (res.data.success) {
        setCommitSuccess(true)
        resetWizard()
        // Brief pause to let the success state render before navigating
        setTimeout(() => {
          navigate(`/projects/${selectedProjectId}`)
        }, 800)
      } else {
        setCommitError('Impossibile salvare il piano. Riprova.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante il salvataggio.'
      setCommitError(msg)
    } finally {
      setIsCommitting(false)
    }
  }, [selectedProjectId, wizardTasks, resetWizard, navigate])

  // Selected project display name
  const selectedProjectName = useMemo(() => {
    const p = projects.find((x) => x.id === selectedProjectId)
    return p ? p.name : null
  }, [projects, selectedProjectId])

  // Derive totalDurationDays for the summary panel
  const totalDurationDays = timelineSuggestion?.totalDurationDays ?? 0

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/planning')}
            aria-label="Torna alla pianificazione"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Wand2 className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Pianifica Progetto
            </h1>
            {selectedProjectName && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedProjectName}</p>
            )}
          </div>
        </div>

        {/* Team capacity quick stats (Step 1+) */}
        {wizardStep >= 1 && teamCapacity.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
            <Users className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>
              {teamCapacity.filter((u) => u.overloaded).length > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {teamCapacity.filter((u) => u.overloaded).length} sovraccarichi
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Team disponibile</span>
              )}
              {' · '}
              {teamCapacity.length} {teamCapacity.length === 1 ? 'membro' : 'membri'}
            </span>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="card px-4 py-3">
        <PlanStepIndicator currentStep={wizardStep} />
      </div>

      {/* Commit error banner */}
      {commitError && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{commitError}</span>
        </div>
      )}

      {/* Commit success banner */}
      {commitSuccess && (
        <div className="flex items-start gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg px-4 py-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          Piano creato con successo! Redirect in corso...
        </div>
      )}

      {/* Step content */}
      {wizardStep === 0 && (
        <Step0
          projects={projects}
          templates={templates}
          selectedProjectId={selectedProjectId}
          selectedTemplateId={selectedTemplateId}
          isLoadingTemplates={isLoadingTemplates}
          isGenerating={isGenerating}
          generateError={generateError}
          onSelectProject={handleSelectProject}
          onSelectTemplate={handleSelectTemplate}
          onNext={handleStep0Next}
        />
      )}

      {wizardStep === 1 && (
        <Step1
          tasks={wizardTasks}
          users={users}
          timelineSuggestion={timelineSuggestion}
          isLoadingTimeline={isLoadingTimeline}
          timelineError={timelineError}
          onAddTask={handleAddTask}
          onUpdateTask={updateWizardTask}
          onRemoveTask={removeWizardTask}
          onSuggestTimeline={handleSuggestTimeline}
          onBack={() => setWizardStep(0)}
          onNext={() => setWizardStep(2)}
        />
      )}

      {wizardStep === 2 && (
        <PlanSummaryPanel
          tasks={wizardTasks}
          scheduledTasks={timelineSuggestion?.scheduledTasks ?? null}
          teamCapacity={teamCapacity}
          totalDurationDays={totalDurationDays}
          onConfirm={handleCommit}
          onBack={() => setWizardStep(1)}
          isCommitting={isCommitting}
        />
      )}
    </div>
  )
}
