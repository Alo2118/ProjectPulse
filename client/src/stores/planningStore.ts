/**
 * Planning Store - Zustand store for the Planning Assistant feature
 * Covers: estimation metrics, team capacity, bottleneck detection, and
 * the in-memory wizard state used when building a new plan.
 * @module stores/planningStore
 */

import axios from 'axios'
import { create } from 'zustand'
import api from '@services/api'

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface EstimationByUser {
  userId: string
  firstName: string
  lastName: string
  avgAccuracyRatio: number
  tasksCompleted: number
  avgEstimatedHours: number
  avgActualHours: number
  overrunRate: number
}

export interface EstimationByType {
  taskType: string
  avgAccuracyRatio: number
  avgDurationHours: number
  count: number
}

export interface EstimationOverall {
  avgAccuracyRatio: number
  totalTasksAnalyzed: number
  overrunRate: number
  avgVelocity: number
}

export interface EstimationMetrics {
  byUser: EstimationByUser[]
  byType: EstimationByType[]
  overall: EstimationOverall
}

export interface TeamCapacityEntry {
  userId: string
  firstName: string
  lastName: string
  weeklyHoursTarget: number
  assignedHours: number
  loggedHours: number
  availableHours: number
  utilizationPercent: number
  overloaded: boolean
  activeTaskCount: number
}

export interface ScheduledTask {
  tempId: string
  startDate: string
  endDate: string
  isCriticalPath: boolean
}

export interface TimelineSuggestion {
  scheduledTasks: ScheduledTask[]
  totalDurationDays: number
  criticalPathLength: number
}

export interface BlockedTask {
  id: string
  code: string
  title: string
  assigneeName: string | null
  blockedReason: string | null
  daysBlocked: number
}

export interface OverloadedUser {
  userId: string
  name: string
  assignedHours: number
  taskCount: number
}

export interface AtRiskDependency {
  predecessorId: string
  predecessorTitle: string
  successorId: string
  successorTitle: string
  daysUntilStart: number
}

export interface UnestimatedTask {
  id: string
  code: string
  title: string
  taskType: string
}

export interface UnassignedTask {
  id: string
  code: string
  title: string
  priority: string
}

export interface BottleneckSummary {
  totalIssues: number
  criticalCount: number
  warningCount: number
}

export interface BottleneckData {
  blockedTasks: BlockedTask[]
  overloadedUsers: OverloadedUser[]
  atRiskDependencies: AtRiskDependency[]
  unestimatedTasks: UnestimatedTask[]
  unassignedTasks: UnassignedTask[]
  summary: BottleneckSummary
}

export interface TaskDependency {
  tempId: string
  type: string
  lagDays: number
}

/** In-memory representation of a task being built inside the planning wizard. */
export interface PlanTask {
  tempId: string
  title: string
  /** milestone | task | subtask */
  taskType: string
  estimatedHours: number
  priority: string
  assigneeId?: string
  parentTempId?: string
  dependencies: TaskDependency[]
}

// ---------------------------------------------------------------------------
// Fetch option types
// ---------------------------------------------------------------------------

export interface FetchEstimationMetricsOptions {
  projectId?: string
  userId?: string
  taskType?: string
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface PlanningState {
  // --- Remote data -------------------------------------------------------
  estimationMetrics: EstimationMetrics | null
  teamCapacity: TeamCapacityEntry[]
  bottlenecks: BottleneckData | null
  timelineSuggestion: TimelineSuggestion | null

  // --- Granular loading states -------------------------------------------
  isLoadingMetrics: boolean
  isLoadingCapacity: boolean
  isLoadingBottlenecks: boolean
  isLoadingTimeline: boolean

  // --- Granular error states ---------------------------------------------
  metricsError: string | null
  capacityError: string | null
  bottlenecksError: string | null
  timelineError: string | null

  // --- Wizard state (Phase 2 - in-memory plan editing) -------------------
  wizardTasks: PlanTask[]
  selectedProjectId: string | null
  selectedTemplateId: string | null
  /** Current wizard step index: 0 = project selection, 1 = task builder, 2 = review */
  wizardStep: number

  // --- Remote data actions -----------------------------------------------
  fetchEstimationMetrics: (options?: FetchEstimationMetricsOptions) => Promise<void>
  fetchTeamCapacity: (weekStart?: string) => Promise<void>
  fetchBottlenecks: (projectId: string) => Promise<void>
  suggestTimeline: (tasks: PlanTask[], projectStartDate?: string) => Promise<void>

  // --- Wizard actions ----------------------------------------------------
  setWizardTasks: (tasks: PlanTask[]) => void
  addWizardTask: (task: PlanTask) => void
  updateWizardTask: (tempId: string, updates: Partial<PlanTask>) => void
  removeWizardTask: (tempId: string) => void
  setWizardStep: (step: number) => void
  setSelectedProjectId: (id: string | null) => void
  setSelectedTemplateId: (id: string | null) => void
  resetWizard: () => void

  // --- Utility -----------------------------------------------------------
  clearErrors: () => void
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a human-readable message from an Axios error or plain Error.
 * Axios surfaces the server body in `error.response.data`, which is more
 * informative than the generic "Request failed with status code 4xx".
 */
function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined
    return data?.message ?? data?.error ?? error.message ?? fallback
  }
  return error instanceof Error ? error.message : fallback
}

// ---------------------------------------------------------------------------
// Default wizard state (extracted so resetWizard can reuse it cleanly)
// ---------------------------------------------------------------------------

const defaultWizardState = {
  wizardTasks: [] as PlanTask[],
  selectedProjectId: null as string | null,
  selectedTemplateId: null as string | null,
  wizardStep: 0,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlanningStore = create<PlanningState>((set) => ({
  // Remote data
  estimationMetrics: null,
  teamCapacity: [],
  bottlenecks: null,
  timelineSuggestion: null,

  // Loading states
  isLoadingMetrics: false,
  isLoadingCapacity: false,
  isLoadingBottlenecks: false,
  isLoadingTimeline: false,

  // Error states
  metricsError: null,
  capacityError: null,
  bottlenecksError: null,
  timelineError: null,

  // Wizard state
  ...defaultWizardState,

  // -------------------------------------------------------------------------
  // Remote data actions
  // -------------------------------------------------------------------------

  fetchEstimationMetrics: async (options = {}) => {
    set({ isLoadingMetrics: true, metricsError: null })
    try {
      const params = new URLSearchParams()
      if (options.projectId) params.append('projectId', options.projectId)
      if (options.userId) params.append('userId', options.userId)
      if (options.taskType) params.append('taskType', options.taskType)

      const query = params.toString()
      const url = query
        ? `/planning/estimation-metrics?${query}`
        : '/planning/estimation-metrics'

      const response = await api.get<{ success: boolean; data: EstimationMetrics }>(url)

      if (response.data.success) {
        set({ estimationMetrics: response.data.data })
      }
    } catch (error) {
      set({ metricsError: extractErrorMessage(error, 'Impossibile caricare le metriche di stima') })
    } finally {
      set({ isLoadingMetrics: false })
    }
  },

  fetchTeamCapacity: async (weekStart?: string) => {
    set({ isLoadingCapacity: true, capacityError: null })
    try {
      const params = new URLSearchParams()
      if (weekStart) params.append('weekStart', weekStart)

      const query = params.toString()
      const url = query
        ? `/planning/team-capacity?${query}`
        : '/planning/team-capacity'

      const response = await api.get<{ success: boolean; data: TeamCapacityEntry[] }>(url)

      if (response.data.success) {
        set({ teamCapacity: response.data.data })
      }
    } catch (error) {
      set({ capacityError: extractErrorMessage(error, 'Impossibile caricare la capacita del team') })
    } finally {
      set({ isLoadingCapacity: false })
    }
  },

  fetchBottlenecks: async (projectId: string) => {
    set({ isLoadingBottlenecks: true, bottlenecksError: null })
    try {
      const response = await api.get<{ success: boolean; data: BottleneckData }>(
        `/planning/bottlenecks/${projectId}`
      )

      if (response.data.success) {
        set({ bottlenecks: response.data.data })
      }
    } catch (error) {
      set({ bottlenecksError: extractErrorMessage(error, 'Impossibile caricare i bottleneck') })
    } finally {
      set({ isLoadingBottlenecks: false })
    }
  },

  suggestTimeline: async (tasks: PlanTask[], projectStartDate?: string) => {
    set({ isLoadingTimeline: true, timelineError: null, timelineSuggestion: null })
    try {
      const response = await api.post<{ success: boolean; data: TimelineSuggestion }>(
        '/planning/suggest-timeline',
        {
          tasks,
          ...(projectStartDate !== undefined ? { projectStartDate } : {}),
        }
      )

      if (response.data.success) {
        set({ timelineSuggestion: response.data.data })
      }
    } catch (error) {
      set({ timelineError: extractErrorMessage(error, 'Impossibile generare la timeline suggerita') })
    } finally {
      set({ isLoadingTimeline: false })
    }
  },

  // -------------------------------------------------------------------------
  // Wizard actions
  // -------------------------------------------------------------------------

  setWizardTasks: (tasks: PlanTask[]) => {
    set({ wizardTasks: tasks })
  },

  addWizardTask: (task: PlanTask) => {
    set((state) => ({ wizardTasks: [...state.wizardTasks, task] }))
  },

  updateWizardTask: (tempId: string, updates: Partial<PlanTask>) => {
    set((state) => ({
      wizardTasks: state.wizardTasks.map((t) =>
        t.tempId === tempId ? { ...t, ...updates } : t
      ),
    }))
  },

  removeWizardTask: (tempId: string) => {
    set((state) => ({
      // Remove the task and also remove it as a parent reference from any children.
      // Children whose parent is removed become root-level tasks (parentTempId cleared).
      wizardTasks: state.wizardTasks
        .filter((t) => t.tempId !== tempId)
        .map((t) =>
          t.parentTempId === tempId ? { ...t, parentTempId: undefined } : t
        ),
    }))
  },

  setWizardStep: (step: number) => {
    set({ wizardStep: step })
  },

  setSelectedProjectId: (id: string | null) => {
    set({ selectedProjectId: id })
  },

  setSelectedTemplateId: (id: string | null) => {
    set({ selectedTemplateId: id })
  },

  resetWizard: () => {
    set({ ...defaultWizardState, timelineSuggestion: null })
  },

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  clearErrors: () => {
    set({
      metricsError: null,
      capacityError: null,
      bottlenecksError: null,
      timelineError: null,
    })
  },
}))
