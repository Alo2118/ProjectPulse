/**
 * Shared types for ProjectPulse frontend
 * @module types
 */

// ============================================================
// ENUMS
// ============================================================

export type UserRole = 'admin' | 'direzione' | 'dipendente'

export type ProjectStatus =
  | 'planning'
  | 'design'
  | 'verification'
  | 'validation'
  | 'transfer'
  | 'maintenance'
  | 'completed'
  | 'on_hold'
  | 'cancelled'

export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type TaskType = 'milestone' | 'task' | 'subtask'

export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed'

export type RiskProbability = 'low' | 'medium' | 'high'

export type RiskImpact = 'low' | 'medium' | 'high'

export type RiskCategory = 'technical' | 'regulatory' | 'resource' | 'schedule'

export type InputCategory = 'bug' | 'feature_request' | 'improvement' | 'question' | 'other'

export type InputStatus = 'pending' | 'processing' | 'resolved'

export type ResolutionType = 'converted_to_task' | 'converted_to_project' | 'acknowledged' | 'rejected' | 'duplicate'

export type DocumentType = 'design_input' | 'design_output' | 'verification_report' | 'validation_report' | 'change_control'

export type DocumentStatus = 'draft' | 'review' | 'approved' | 'obsolete'

export type Theme = 'light' | 'dark' | 'system'

// ============================================================
// BASE TYPES
// ============================================================

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  avatarUrl: string | null
  theme?: Theme
  isActive?: boolean
  createdAt?: string
  lastLoginAt?: string | null
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string | null
  isActive: boolean
  phases: string[]
  structure: Record<string, unknown>
  createdAt: string
  updatedAt: string
  projectCount: number
}

export interface Project {
  id: string
  code: string
  name: string
  description: string | null
  status: ProjectStatus
  priority: ProjectPriority
  startDate: string | null
  targetEndDate: string | null
  actualEndDate: string | null
  budget: string | null
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  ownerId: string
  templateId: string | null
  createdById: string
  owner?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  createdBy?: {
    id: string
    firstName: string
    lastName: string
  }
  template?: {
    id: string
    name: string
  } | null
  _count?: {
    tasks: number
    risks: number
    documents: number
  }
  taskStats?: {
    total: number
    completed: number
    blocked: number
  }
}

export interface Task {
  id: string
  code: string
  title: string
  description: string | null
  taskType: TaskType
  status: TaskStatus
  priority: TaskPriority
  startDate: string | null
  dueDate: string | null
  estimatedHours: string | null
  actualHours: string | null
  blockedReason: string | null // Required when status is 'blocked'
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  projectId: string | null
  parentTaskId: string | null
  assigneeId: string | null
  createdById: string
  position: number
  isRecurring?: boolean
  recurrencePattern?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    daysOfWeek?: number[]
    dayOfMonth?: number
    endAfterOccurrences?: number
    recurrenceEnd?: string
  } | null
  project?: {
    id: string
    code: string
    name: string
  } | null
  assignee?: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
  } | null
  createdBy?: {
    id: string
    firstName: string
    lastName: string
  }
  parentTask?: {
    id: string
    code: string
    title: string
    taskType: TaskType
  } | null
  subtasks?: SubtaskSummary[]
  _count?: {
    comments: number
    timeEntries: number
    subtasks: number
  }
}

export interface SubtaskSummary {
  id: string
  code: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  assignee?: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  } | null
}

export interface TimeEntry {
  id: string
  description: string | null
  startTime: string
  endTime: string | null
  duration: number | null
  isRunning: boolean
  taskId: string
  userId: string
  approvalStatus: 'pending' | 'approved' | 'rejected'
  approvedById: string | null
  approvedAt: string | null
  rejectionNote: string | null
  createdAt: string
  updatedAt: string
  task?: {
    id: string
    code: string
    title: string
    project: {
      id: string
      code: string
      name: string
    }
  }
  user?: {
    id: string
    firstName: string
    lastName: string
  }
  approvedBy?: {
    id: string
    firstName: string
    lastName: string
  } | null
}

export interface UserTimeSummary {
  userId: string
  firstName: string
  lastName: string
  totalMinutes: number
  entryCount: number
}

export interface ProjectTimeSummary {
  projectId: string
  projectCode: string
  projectName: string
  totalMinutes: number
}

export interface TeamTimeReport {
  byUser: UserTimeSummary[]
  byProject: ProjectTimeSummary[]
  entries: TimeEntry[]
  summary: {
    totalMinutes: number
    totalHours: number
    entryCount: number
    userCount: number
    projectCount: number
  }
}

export interface Comment {
  id: string
  content: string
  isInternal: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  taskId: string
  userId: string
  user?: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
}

export interface Risk {
  id: string
  code: string
  title: string
  description: string | null
  category: RiskCategory
  probability: RiskProbability
  impact: RiskImpact
  status: RiskStatus
  mitigationPlan: string | null
  projectId: string
  ownerId: string | null
  createdById: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  project?: {
    id: string
    code: string
    name: string
  }
  owner?: {
    id: string
    firstName: string
    lastName: string
    email?: string
    avatarUrl?: string | null
  } | null
  createdBy?: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface RiskStats {
  total: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
  highLevelRisks: number
  openRisks: number
}

export interface RiskMatrix {
  low: {
    low: Risk[]
    medium: Risk[]
    high: Risk[]
  }
  medium: {
    low: Risk[]
    medium: Risk[]
    high: Risk[]
  }
  high: {
    low: Risk[]
    medium: Risk[]
    high: Risk[]
  }
}

export interface UserInput {
  id: string
  code: string
  title: string
  description: string | null
  category: InputCategory
  priority: TaskPriority
  status: InputStatus
  resolutionType: ResolutionType | null
  resolutionNotes: string | null
  resolvedAt: string | null
  convertedTaskId: string | null
  convertedProjectId: string | null
  attachments: string[]
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  createdById: string
  processedById: string | null
  processedAt: string | null
  createdBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
  }
  processedBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  convertedTask?: {
    id: string
    code: string
    title: string
  } | null
  convertedProject?: {
    id: string
    code: string
    name: string
  } | null
}

export interface UserInputStats {
  total: number
  pending: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
}

export interface Document {
  id: string
  code: string
  title: string
  description: string | null
  type: DocumentType
  filePath: string | null
  fileSize: number | null
  mimeType: string | null
  version: number
  status: DocumentStatus
  projectId: string
  createdById: string
  approvedById: string | null
  approvedAt: string | null
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  project?: {
    id: string
    code: string
    name: string
  }
  createdBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  approvedBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

export interface DocumentStats {
  total: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  approvedDocuments: number
  draftDocuments: number
}

export type NotificationType =
  | 'new_comment'
  | 'task_assigned'
  | 'task_blocked'
  | 'approval_requested'
  | 'risk_critical'
  | 'document_review'
  | 'input_received'
  | 'input_processed'
  | 'input_converted'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ============================================================
// STATS TYPES
// ============================================================

export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  myTasks: number
  tasksInProgress: number
  tasksDone: number
  overdueTask: number
  openRisks: number
  hoursThisWeek: number
}

export interface TaskStats {
  total: number
  byStatus: Record<TaskStatus, number>
  overdue: number
  completedToday: number
}

export interface ProjectStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  totalHoursLogged: number
  estimatedHours: number
  progress: number
  riskCount: number
  openRisks: number
}

// ============================================================
// GANTT TYPES
// ============================================================

export type GanttZoomLevel = 'day' | 'week' | 'month'

export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'

export interface TaskDependency {
  id: string
  predecessorId: string
  successorId: string
  dependencyType: DependencyType
  lagDays: number
  predecessor?: {
    id: string
    code: string
    title: string
  }
  successor?: {
    id: string
    code: string
    title: string
  }
}

export interface GanttTask {
  id: string
  code: string
  title: string
  taskType: TaskType
  status: TaskStatus
  priority: TaskPriority
  startDate: string | null
  endDate: string | null
  estimatedHours: number | null
  progress: number
  parentTaskId: string | null
  subtaskCount: number
  depth: number
  assignee: {
    id: string
    firstName: string
    lastName: string
  } | null
  project: {
    id: string
    code: string
    name: string
  } | null
  dependencies: {
    predecessorId: string
    successorId: string
    dependencyType: string
    lagDays: number
  }[]
}

export interface GanttFilters {
  projectId?: string
  assigneeId?: string
  startDateFrom?: string
  startDateTo?: string
}

// ============================================================
// WEEKLY REPORT TYPES
// ============================================================

export type ReportStatus = 'pending' | 'completed' | 'failed'

export interface TimeTrackingByProject {
  projectId: string
  projectCode: string
  projectName: string
  totalMinutes: number
}

export interface TimeTrackingByTask {
  taskId: string
  taskCode: string
  taskTitle: string
  projectName: string | null
  totalMinutes: number
}

export interface TimeTrackingByDay {
  date: string
  totalMinutes: number
}

export interface DetailedTimeEntry {
  id: string
  description: string | null
  startTime: string
  duration: number | null
  userId: string
  userName: string
  taskId: string
  taskCode: string
  taskTitle: string
  isRecurring: boolean
  projectId: string
  projectCode: string
  projectName: string
}

export interface TaskSummary {
  id: string
  code: string
  title: string
  status: string
  projectName: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  isRecurring: boolean
  dueDate?: string | null
}

export interface StatusChange {
  taskId: string
  taskCode: string
  taskTitle: string
  oldStatus: string
  newStatus: string
  changedAt: string
}

export interface BlockedTask {
  id: string
  code: string
  title: string
  projectName: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  blockedSince: string | null
  lastComment: string | null
}

export type BlockerCategory = 'dependency' | 'resource' | 'bug' | 'approval' | 'other'

export interface EnrichedBlockedTask extends BlockedTask {
  daysBlocked: number
  category: BlockerCategory
  blockedReason: string | null
}

export interface BlockerAnalysis {
  activeCount: number
  resolvedThisWeek: number
  overdueCount: number
  byCategory: Record<BlockerCategory, number>
  riskScore: 'low' | 'medium' | 'high'
  trend: 'up' | 'stable' | 'down'
  items: EnrichedBlockedTask[]
}

export type ProjectHealthStatus = 'on-track' | 'at-risk' | 'off-track'

export interface ProjectHealthData {
  projectId: string
  projectCode: string
  projectName: string
  status: ProjectHealthStatus
  actualHours: number
  derivedWeeklyTargetHours: number
  hoursVariancePercent: number
  tasksCompleted: number
  tasksInProgress: number
  tasksBlocked: number
  tasksTotal: number
  completionPercent: number
  nearestMilestone: {
    id: string
    title: string
    dueDate: string | null
    daysLeft: number | null
    completionPercent: number
  } | null
}

export interface ProductivityMetrics {
  tasksPerDay: number
  daysWorked: number
  avgHoursPerDay: number
  onTimeDeliveryRate: number
}

export interface PreviousWeekMetrics {
  totalHours: number
  completedTasksCount: number
  blockedTasksCount: number
  weekNumber: number
  year: number
}

export interface CommentsByProject {
  projectId: string
  projectCode: string
  projectName: string
  commentCount: number
  comments: Array<{
    id: string
    content: string
    taskCode: string
    createdAt: string
    authorName: string
  }>
}

export interface WeeklyReportData {
  weekNumber: number
  year: number
  weekStartDate: string
  weekEndDate: string
  userId: string
  userName: string

  timeTracking: {
    totalMinutes: number
    totalHours: number
    byProject: TimeTrackingByProject[]
    byTask: TimeTrackingByTask[]
    byDay: TimeTrackingByDay[]
    byUser?: Array<{
      userId: string
      userName: string
      totalMinutes: number
    }>
    entries?: DetailedTimeEntry[]
  }

  tasks: {
    created: TaskSummary[]
    completed: TaskSummary[]
    inProgress: TaskSummary[]
    statusChanges: StatusChange[]
  }

  blockedTasks: BlockedTask[]

  comments: {
    total: number
    byProject: CommentsByProject[]
  }

  // Enhanced data (optional for backward compatibility)
  projectHealth?: ProjectHealthData[]
  blockerAnalysis?: BlockerAnalysis
  productivity?: ProductivityMetrics
  previousWeek?: PreviousWeekMetrics
}

export interface WeeklyReport {
  id: string
  code: string
  weekNumber: number
  year: number
  weekStartDate: string
  weekEndDate: string
  userId: string
  status: ReportStatus
  generatedAt: string | null
  pdfPath: string | null
  createdAt: string
  reportData?: WeeklyReportData
  user?: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface WeekInfo {
  weekNumber: number
  year: number
  weekStartDate: string
  weekEndDate: string
}

// ============================================================
// TASK TREE TYPES (Hierarchical View)
// ============================================================

export interface TaskTreeStats {
  total: number
  completed: number
  inProgress: number
  blocked: number
  todo: number
  totalHours: number
  estimatedHours: number
}

export interface SubtaskNode {
  id: string
  code: string
  title: string
  taskType: TaskType
  status: string
  priority: string
  assignee: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  } | null
  dueDate: string | null
  estimatedHours: number
  actualHours: number
  stats: TaskTreeStats
  subtasks: SubtaskNode[]
}

export interface TaskNode {
  id: string
  code: string
  title: string
  taskType: TaskType
  status: string
  priority: string
  assignee: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  } | null
  dueDate: string | null
  estimatedHours: number
  actualHours: number
  stats: TaskTreeStats
  subtasks: SubtaskNode[]
}

export interface MilestoneNode {
  id: string
  code: string
  title: string
  taskType: TaskType
  status: string
  priority: string
  assignee: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  } | null
  dueDate: string | null
  estimatedHours: number
  actualHours: number
  stats: TaskTreeStats
  tasks: TaskNode[]
}

export interface ProjectNode {
  id: string
  code: string
  name: string
  status: string
  priority: string
  owner: {
    id: string
    firstName: string
    lastName: string
  } | null
  targetEndDate: string | null
  progress: number
  stats: TaskTreeStats
  milestones: MilestoneNode[]
  tasks: TaskNode[] // Tasks without milestone (orphan tasks)
}

export interface TaskTreeResponse {
  projects: ProjectNode[]
  subtasks?: SubtaskNode[]
  summary: {
    totalProjects: number
    totalMilestones: number
    totalTasks: number
    totalSubtasks: number
    overallProgress: number
    totalHoursLogged: number
  }
}

// ============================================================
// NOTE & ATTACHMENT TYPES
// ============================================================

export type NoteableEntityType = 'project' | 'task' | 'time_entry'
export type AttachableEntityType = 'project' | 'task' | 'time_entry'

export interface Note {
  id: string
  content: string
  entityType: NoteableEntityType
  entityId: string
  isInternal: boolean
  isDeleted: boolean
  parentId: string | null
  createdAt: string
  updatedAt: string
  userId: string
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
    role: string
  }
  replies?: NoteReply[]
}

export interface NoteReply {
  id: string
  content: string
  createdAt: string
  userId: string
  user?: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
}

export interface Attachment {
  id: string
  entityType: AttachableEntityType
  entityId: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  uploadedById: string
  uploadedBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface CreateNoteInput {
  entityType: NoteableEntityType
  entityId: string
  content: string
  isInternal?: boolean
  parentId?: string
}

export interface CreateAttachmentInput {
  entityType: AttachableEntityType
  entityId: string
  file: File
}

// ============================================================
// TAG TYPES
// ============================================================

export type TaggableEntityType = 'task' | 'document'

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface TagAssignment {
  id: string
  tagId: string
  entityType: TaggableEntityType
  entityId: string
  createdAt: string
  tag: Tag
}

// ============================================================
// MILESTONE TYPES
// ============================================================

export interface MilestoneDerivedStats {
  totalTasks: number
  completedTasks: number
  totalEstimatedHours: number
  totalActualHours: number
  progress: number
  earliestStartDate: string | null
  latestDueDate: string | null
  statusSummary: Record<TaskStatus, number>
}

export interface MilestoneWithStats extends Task {
  derivedStats: MilestoneDerivedStats
  subtasks?: Array<{
    id: string
    code: string
    title: string
    taskType: TaskType
    status: TaskStatus
    priority: TaskPriority
    startDate: string | null
    dueDate: string | null
    estimatedHours: string | null
    assignee?: {
      id: string
      firstName: string
      lastName: string
      avatarUrl: string | null
    } | null
    _count?: {
      subtasks: number
    }
  }>
}
