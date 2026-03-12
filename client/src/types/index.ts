/**
 * Shared types for ProjectPulse frontend
 * @module types
 */

// ============================================================
// ENUMS
// ============================================================

export type UserRole = 'admin' | 'direzione' | 'dipendente' | 'guest'

export type ProjectStatus = 'active' | 'on_hold' | 'cancelled' | 'completed'

export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type TaskType = 'milestone' | 'task' | 'subtask'

export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed'

export type RiskCategory = 'technical' | 'regulatory' | 'resource' | 'schedule'

export type InputCategory = 'bug' | 'feature_request' | 'improvement' | 'question' | 'other'

export type InputStatus = 'pending' | 'processing' | 'resolved'

export type ResolutionType = 'converted_to_task' | 'converted_to_project' | 'acknowledged' | 'rejected' | 'duplicate'

export type DocumentType = 'design_input' | 'design_output' | 'verification_report' | 'validation_report' | 'change_control'

export type DocumentStatus = 'draft' | 'review' | 'approved' | 'obsolete'

export type Theme = 'light' | 'dark' | 'system'

export type ThemeStyle = "office-classic" | "asana-like" | "tech-hud"
export type ThemeMode = "light" | "dark" | "system"

export type HealthStatus = 'healthy' | 'at_risk' | 'critical'

export type AuditEntityType =
  | 'user'
  | 'project'
  | 'task'
  | 'risk'
  | 'document'
  | 'comment'
  | 'time_entry'
  | 'user_input'
  | 'note'
  | 'attachment'
  | 'tag'

export type AuditActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'login'
  | 'logout'

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
  weeklyHoursTarget?: number | null
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

export interface ProjectPhase {
  key: string
  label: string
  description: string
  order: number
  color: string
  isFinal: boolean
  isInitial: boolean
}

export interface MilestonePhaseInfo {
  id: string
  code: string
  title: string
  status: string
  phaseKey: string | null
  dueDate: string | null
  _count: { subtasks: number }
}

export interface ProjectPhasesResponse {
  currentPhaseKey: string | null
  status: ProjectStatus
  phases: ProjectPhase[]
  transitions: Record<string, string[]>
  milestonesByPhase: Record<string, MilestonePhaseInfo[]>
  canAdvance: boolean
  nextPhaseKey: string | null
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
  phaseTemplateId?: string | null
  phases?: string | null
  currentPhaseKey?: string | null
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
  totalHoursLogged?: number
  nextMilestone?: {
    id: string
    title: string
    dueDate: string | null
    daysRemaining: number | null
  } | null
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
  estimatedHours: number | null
  actualHours: number | null
  blockedReason: string | null // Required when status is 'blocked'
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  projectId: string | null
  parentTaskId: string | null
  assigneeId: string | null
  departmentId: string | null
  createdById: string
  position: number
  phaseKey?: string | null
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
  department?: {
    id: string
    name: string
    color: string
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
  parentId: string | null
  replies?: Comment[]
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
  probability: number  // 1-5
  impact: number       // 1-5
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

export type RiskMatrix = Record<number, Record<number, Risk[]>>

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
  reviewDueDate: string | null
  reviewFrequencyDays: number | null
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
  | 'mention'
  | 'task_assigned'
  | 'task_blocked'
  | 'task_status_changed'
  | 'approval_requested'
  | 'risk_critical'
  | 'risk_high'
  | 'risk_assigned'
  | 'document_review'
  | 'document_approved'
  | 'input_received'
  | 'input_processed'
  | 'input_converted'
  | 'input_mention'
  | 'task_blocked_mention'
  | 'note_mention'
  | 'automation'
  | 'weekly_report_reminder'

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

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
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

export interface RiskSummary {
  id: string
  code: string
  title: string
  description: string | null
  category: string
  probability: number
  impact: number
  score: number  // probability × impact (1-25)
  status: string
  mitigationPlan: string | null
  projectId: string
  projectName: string
  projectCode: string
  ownerName: string | null
}

export type ProjectHealthStatus = 'on-track' | 'at-risk' | 'off-track'

export interface TaskBrief {
  id: string
  code: string
  title: string
  assigneeName: string | null
}

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
  completedThisWeek: (TaskBrief & { completedAt: string })[]
  inProgressTasks: (TaskBrief & { dueDate: string | null; isOverdue: boolean })[]
  blockedTasksList: (TaskBrief & { blockedReason: string | null; daysBlocked: number })[]
}

export interface ProductivityMetrics {
  tasksPerDay: number
  daysWorked: number
  avgHoursPerDay: number
  onTimeDeliveryRate: number
}

export interface PlannedTask {
  id: string
  code: string
  title: string
  projectId: string
  projectName: string | null
  assigneeId: string | null
  assigneeName: string | null
  dueDate: string | null
  status: string
  isOverdue: boolean
}

export interface MilestoneRow {
  id: string
  code: string
  title: string
  projectId: string
  projectName: string
  projectCode: string
  baselineDate: string | null
  currentDate: string | null
  status: string
  daysLeft: number | null
  completionPercent: number
  isOverdue: boolean
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
  risks?: RiskSummary[]
  plannedNextWeek?: PlannedTask[]
  milestonesTable?: MilestoneRow[]
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

export interface TaskDependencyRef {
  id: string
  code: string
  title: string
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
  department?: { id: string; name: string; color: string } | null
  dueDate: string | null
  estimatedHours: number
  actualHours: number
  stats: TaskTreeStats
  subtasks: SubtaskNode[]
  blockedBy?: TaskDependencyRef[]
  blocks?: TaskDependencyRef[]
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
  department?: { id: string; name: string; color: string } | null
  dueDate: string | null
  estimatedHours: number
  actualHours: number
  stats: TaskTreeStats
  subtasks: SubtaskNode[]
  blockedBy?: TaskDependencyRef[]
  blocks?: TaskDependencyRef[]
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
  department?: { id: string; name: string; color: string } | null
  dueDate: string | null
  estimatedHours: number
  actualHours: number
  stats: TaskTreeStats
  tasks: TaskNode[]
  blockedBy?: TaskDependencyRef[]
  blocks?: TaskDependencyRef[]
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
// DEPARTMENT TYPES
// ============================================================

export interface Department {
  id: string
  name: string
  description: string | null
  color: string
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// CHECKLIST TYPES
// ============================================================

export interface ChecklistItem {
  id: string
  taskId: string
  title: string
  isChecked: boolean
  position: number
  createdAt: string
  updatedAt: string
}

// ============================================================
// CUSTOM FIELD TYPES
// ============================================================

export type CustomFieldType = 'text' | 'number' | 'dropdown' | 'date' | 'checkbox'

export interface CustomFieldDefinition {
  id: string
  name: string
  fieldType: CustomFieldType
  options: string[] | null // dropdown options
  projectId: string | null
  isRequired: boolean
  position: number
  isActive: boolean
  createdById: string
  createdAt: string
  updatedAt: string
  project?: {
    id: string
    code: string
    name: string
  } | null
}

export interface CustomFieldValue {
  id: string
  definitionId: string
  taskId: string
  value: string | null
  createdAt: string
  updatedAt: string
  definition?: CustomFieldDefinition
}

export interface CustomFieldWithValue {
  definition: CustomFieldDefinition
  value: CustomFieldValue | null
}

// ============================================================
// SAVED VIEW TYPES
// ============================================================

export type SavedViewEntity = 'task' | 'project' | 'risk'

export interface SavedView {
  id: string
  name: string
  entity: SavedViewEntity
  filters: Record<string, unknown>
  columns: string[] | null
  sortBy: string | null
  sortOrder: 'asc' | 'desc' | null
  isShared: boolean
  isDefault: boolean
  userId: string
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    firstName: string
    lastName: string
  }
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
    estimatedHours: number | null
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

// ============================================================
// PROJECT MEMBER TYPES
// ============================================================

export type ProjectRole = 'owner' | 'manager' | 'member' | 'viewer' | 'guest'

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  projectRole: ProjectRole
  addedById: string
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
  }
  addedBy?: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface ProjectInvitation {
  id: string
  email: string
  projectId: string
  projectRole: ProjectRole
  invitedById: string
  token?: string
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
  project?: {
    id: string
    code: string
    name: string
  }
  invitedBy?: {
    id: string
    firstName: string
    lastName: string
  }
}

// ============================================================
// WORKFLOW TYPES
// ============================================================

export interface WorkflowStatus {
  key: string
  label: string
  color: string
  isFinal: boolean
  isInitial: boolean
  requiresComment: boolean
}

export interface WorkflowTemplate {
  id: string
  name: string
  description?: string
  statuses: WorkflowStatus[]
  transitions: Record<string, string[]>
  isSystem: boolean
  isDefault?: boolean
  isActive?: boolean
  createdAt?: string
}

// ============================================================
// AUTOMATION TYPES
// ============================================================

export type AutomationDomain = 'task' | 'risk' | 'document' | 'project'

export type TriggerType =
  // Task triggers
  | 'task_status_changed'
  | 'task_created'
  | 'task_assigned'
  | 'all_subtasks_completed'
  | 'task_overdue'
  | 'task_deadline_approaching'
  | 'task_updated'
  | 'task_commented'
  | 'task_idle'
  // Risk triggers
  | 'risk_created'
  | 'risk_status_changed'
  | 'risk_level_changed'
  // Document triggers
  | 'document_created'
  | 'document_status_changed'
  | 'document_review_due'
  // Project triggers
  | 'project_status_changed'
  | 'project_deadline_approaching'

export type ActionType =
  | 'notify_user'
  | 'notify_assignee'
  | 'notify_project_owner'
  | 'update_parent_status'
  | 'set_task_field'
  | 'create_comment'
  | 'assign_to_user'
  | 'set_risk_field'
  | 'set_document_field'
  | 'set_project_field'
  | 'create_task'
  | 'send_email'

export type ConditionType =
  | 'task_priority_is'
  | 'task_type_is'
  | 'task_has_assignee'
  | 'task_in_project'
  | 'task_has_subtasks'
  | 'task_field_equals'
  | 'risk_probability_is'
  | 'risk_impact_is'
  | 'risk_category_is'
  | 'document_type_is'
  | 'project_status_is'
  | 'project_priority_is'

export interface TriggerConfig {
  type: TriggerType
  params: Record<string, unknown>
}

export interface ConditionConfig {
  type: ConditionType
  params: Record<string, unknown>
}

export interface ActionConfig {
  type: ActionType
  params: Record<string, unknown>
}

export interface AutomationRule {
  id: string
  name: string
  description: string | null
  domain: AutomationDomain
  projectId: string | null
  trigger: TriggerConfig
  conditions: ConditionConfig[]
  conditionLogic: 'AND' | 'OR'
  actions: ActionConfig[]
  isActive: boolean
  priority: number
  cooldownMinutes: number
  createdById: string
  lastTriggeredAt: string | null
  triggerCount: number
  createdAt: string
  updatedAt: string
  project?: { id: string; code: string; name: string } | null
  createdBy?: { id: string; firstName: string; lastName: string } | null
}

export interface AutomationRecommendation {
  id: string
  projectId: string | null
  pattern: string
  evidence: Record<string, unknown>
  suggestedRule: Record<string, unknown>
  impact: 'high' | 'medium' | 'low'
  status: 'pending' | 'applied' | 'dismissed'
  project?: { id: string; name: string } | null
  createdAt: string
}

export interface AutomationPackage {
  key: string
  name: string
  description: string
  templates: string[]
}

export interface AutomationLog {
  id: string
  ruleId: string
  triggerId: string | null
  status: 'success' | 'error' | 'skipped'
  details: Record<string, unknown> | null
  createdAt: string
}

// ============================================================
// ANALYTICS EXTENDED TYPES
// ============================================================

export interface PreviousWeekOverview {
  totalMinutesLogged: number
  completedTasks: number
  blockedTasks: number
  activeProjects: number
}

export interface TeamWorkloadEntry {
  userId: string
  firstName: string
  lastName: string
  minutesLogged: number
  weeklyHoursTarget: number
  utilizationPercent: number
}

export interface UserWeeklyHours {
  byDay: Array<{ dayOfWeek: number; date: string; totalMinutes: number }>
  byProject: Array<{ projectId: string; projectName: string; totalMinutes: number }>
  totalMinutes: number
  weeklyTarget: number
}

export interface DeliveryForecast {
  projectId: string
  projectCode: string
  projectName: string
  progress: number
  targetEndDate: string | null
  daysRemaining: number | null
  healthStatus: 'healthy' | 'at_risk' | 'critical'
  velocityTasksPerWeek: number
  remainingTasks: number
  estimatedCompletionDays: number | null
  predictedDelay: number | null
}

export interface ProjectBudgetData {
  projectId: string
  projectName: string
  projectCode: string
  budget: number
  totalHoursLogged: number
  estimatedHours: number
  budgetUsedPercent: number
  status: 'on_track' | 'at_risk' | 'over_budget'
}

// ============================================================
// ADVANCED FILTER TYPES
// ============================================================

export type FilterFieldType = 'select' | 'date' | 'boolean' | 'text'

export type FilterFieldKey =
  | 'status'
  | 'priority'
  | 'assigneeId'
  | 'projectId'
  | 'dueDate'
  | 'departmentId'
  | 'taskType'
  | 'hasBlockedReason'

export type FilterOperator =
  | 'is'
  | 'is_not'
  | 'before'
  | 'after'
  | 'between'
  | 'is_true'
  | 'is_false'
  | 'contains'
  | 'not_contains'

export interface FilterRule {
  id: string
  field: FilterFieldKey
  operator: FilterOperator
  value: string | string[]
}

export interface AdvancedFilter {
  logic: 'and' | 'or'
  rules: FilterRule[]
}

// ============================================================
// DOCUMENT VERSION TYPES
// ============================================================

export interface DocumentVersion {
  id: string
  documentId: string
  version: number
  filePath: string
  fileSize: number
  mimeType: string
  note: string | null
  uploadedBy: { id: string; firstName: string; lastName: string }
  createdAt: string
}

// ============================================================
// RISK-TASK LINK TYPES
// ============================================================

export type RiskTaskLinkType = 'mitigation' | 'verification' | 'related'

export interface RiskTaskLink {
  id: string
  riskId: string
  taskId: string
  linkType: RiskTaskLinkType
  createdAt: string
  createdBy: { id: string; firstName: string; lastName: string }
}

// ============================================================
// ACTIVITY & KPI TYPES
// ============================================================

export interface ActivityItem {
  id: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  field?: string
  oldValue?: string
  newValue?: string
  user: { id: string; firstName: string; lastName: string }
  createdAt: string
}

export interface KpiCard {
  label: string
  value: string | number
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' }
  subtitle?: string
  color: string
  icon?: string
}
