/**
 * Shared types for ProjectPulse backend
 * Enum values defined locally (SQL Server non supporta enum in Prisma)
 * @module types
 */

// Re-export Prisma model types
import type { Task } from '@prisma/client'
export type {
  User,
  Project,
  Task,
  Risk,
  Document,
  Comment,
  TimeEntry,
  Notification,
  AuditLog,
  ProjectTemplate,
  Department,
  RefreshToken,
  UserInput,
  TaskDependency,
  Note,
  Attachment,
  Tag,
  TagAssignment,
  CustomFieldDefinition,
  CustomFieldValue,
  SavedView,
} from '@prisma/client'

// ============================================================
// ENUM TYPES (string literal unions - SQL Server compatibility)
// ============================================================

export type UserRole = 'admin' | 'direzione' | 'dipendente' | 'guest'
export type ProjectStatus = 'active' | 'on_hold' | 'cancelled' | 'completed'

export interface ProjectPhase {
  key: string
  label: string
  description: string
  order: number
  color: string
  isFinal: boolean
  isInitial: boolean
}
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskType = 'milestone' | 'task' | 'subtask'
export type RiskCategory = 'technical' | 'regulatory' | 'resource' | 'schedule'
export type RiskProbability = 'low' | 'medium' | 'high'
export type RiskImpact = 'low' | 'medium' | 'high'
export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed'
export type DocumentType = 'design_input' | 'design_output' | 'verification_report' | 'validation_report' | 'change_control'
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'obsolete'
export type InputCategory = 'bug' | 'feature_request' | 'improvement' | 'question' | 'other'
export type InputStatus = 'pending' | 'processing' | 'resolved'
export type ResolutionType = 'converted_to_task' | 'converted_to_project' | 'acknowledged' | 'rejected' | 'duplicate'
export type ReportStatus = 'pending' | 'completed' | 'failed'

// ============================================================
// CUSTOM ENUMS (for business logic, not in database)
// ============================================================

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  STATUS_CHANGE = 'status_change',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

export enum EntityType {
  USER = 'user',
  PROJECT = 'project',
  TASK = 'task',
  RISK = 'risk',
  DOCUMENT = 'document',
  COMMENT = 'comment',
  TIME_ENTRY = 'time_entry',
  USER_INPUT = 'user_input',
  NOTE = 'note',
  ATTACHMENT = 'attachment',
  TAG = 'tag',
  DEPARTMENT = 'department',
  CHECKLIST_ITEM = 'checklist_item',
  CUSTOM_FIELD = 'custom_field',
  SAVED_VIEW = 'saved_view',
  PROJECT_MEMBER = 'project_member',
  PROJECT_INVITATION = 'project_invitation',
}

// ============================================================
// INPUT TYPES
// ============================================================

export interface CreateProjectInput {
  name: string
  description?: string
  ownerId: string
  templateId?: string
  phaseTemplateId?: string
  startDate?: Date
  targetEndDate?: Date
  budget?: number
  priority?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  ownerId?: string
  status?: string
  startDate?: Date
  targetEndDate?: Date
  actualEndDate?: Date
  budget?: number
  priority?: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  taskType?: string // 'milestone' | 'task' | 'subtask'
  projectId?: string
  parentTaskId?: string
  assigneeId?: string
  departmentId?: string | null
  priority?: string
  startDate?: Date
  dueDate?: Date
  estimatedHours?: number
  isRecurring?: boolean
  blockedReason?: string
  recurrencePattern?: string
  position?: number
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  taskType?: string // 'milestone' | 'task' | 'subtask' - changing type has hierarchy restrictions
  projectId?: string
  parentTaskId?: string | null
  assigneeId?: string
  departmentId?: string | null
  status?: string
  priority?: string
  startDate?: Date
  dueDate?: Date
  estimatedHours?: number
  actualHours?: number
  isRecurring?: boolean
  blockedReason?: string
  recurrencePattern?: string
  position?: number
}

export interface CreateTimeEntryInput {
  taskId: string
  description?: string
  startTime: Date
  endTime?: Date
  duration?: number
}

export interface UpdateTimeEntryInput {
  description?: string
  startTime?: Date
  endTime?: Date
  duration?: number
}

export interface CreateCommentInput {
  taskId: string
  content: string
  isInternal?: boolean
  parentId?: string
}

export interface UpdateCommentInput {
  content?: string
  isInternal?: boolean
}

export interface CreateRiskInput {
  projectId: string
  title: string
  description?: string
  category?: string
  probability?: string
  impact?: string
  mitigationPlan?: string
  ownerId?: string
}

export interface UpdateRiskInput {
  title?: string
  description?: string
  category?: string
  probability?: string
  impact?: string
  mitigationPlan?: string
  status?: string
  ownerId?: string
}

// ============================================================
// QUERY TYPES
// ============================================================

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface ProjectQueryParams extends PaginationParams {
  status?: string
  priority?: string
  ownerId?: string
  search?: string
  sortBy?: 'createdAt' | 'name' | 'targetEndDate' | 'priority' | 'status' | 'sortOrder'
  sortOrder?: 'asc' | 'desc'
}

export interface TaskQueryParams extends PaginationParams {
  projectId?: string
  taskType?: string // 'milestone' | 'task' | 'subtask'
  status?: string
  priority?: string
  assigneeId?: string
  departmentId?: string
  search?: string
  standalone?: boolean
  parentTaskId?: string
  includeSubtasks?: boolean // Include subtasks in main list (default: false)
}

export interface TimeEntryQueryParams extends PaginationParams {
  taskId?: string
  userId?: string
  projectId?: string
  startDate?: Date
  endDate?: Date
}

// ============================================================
// RESPONSE TYPES
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
// USER TYPES
// ============================================================

export type Theme = 'light' | 'dark' | 'system'
export type ThemeStyle = 'tech-hud' | 'basic' | 'classic'

export interface UserWithoutPassword {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatarUrl: string | null
  theme: Theme
  themeStyle: ThemeStyle
  isActive: boolean
  weeklyHoursTarget?: number | null
  createdAt: Date
  lastLoginAt: Date | null
}

export interface JwtPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

// ============================================================
// AUDIT TYPES
// ============================================================

export interface AuditLogInput {
  entityType: EntityType
  entityId: string
  action: AuditAction
  userId: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  ipAddress?: string
  userAgent?: string
}

// ============================================================
// GANTT TYPES
// ============================================================

export interface GanttQueryParams {
  projectId?: string
  assigneeId?: string
  startDateFrom?: Date
  startDateTo?: Date
}

export interface GanttTask {
  id: string
  code: string
  title: string
  taskType: string // 'milestone' | 'task' | 'subtask'
  status: string
  priority: string
  startDate: Date | null
  endDate: Date | null
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

// ============================================================
// TASK DEPENDENCY TYPES
// ============================================================

export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'

export interface CreateTaskDependencyInput {
  predecessorId: string
  successorId: string
  dependencyType?: DependencyType
  lagDays?: number
}

export interface TaskDependencyResponse {
  id: string
  predecessorId: string
  successorId: string
  dependencyType: string
  lagDays: number
  predecessor: {
    id: string
    code: string
    title: string
  }
  successor: {
    id: string
    code: string
    title: string
  }
}

// ============================================================
// NOTE & ATTACHMENT TYPES
// ============================================================

export type NoteableEntityType = 'project' | 'task' | 'time_entry'
export type AttachableEntityType = 'project' | 'task' | 'time_entry'
export type TaggableEntityType = 'task' | 'document'

// ============================================================
// TAG TYPES
// ============================================================

export interface CreateTagInput {
  name: string
  color?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
}

export interface AssignTagInput {
  tagId: string
  entityType: TaggableEntityType
  entityId: string
}

export interface TagQueryParams {
  search?: string
  page?: number
  limit?: number
}

export interface CreateNoteInput {
  entityType: NoteableEntityType
  entityId: string
  content: string
  isInternal?: boolean
  parentId?: string
}

export interface UpdateNoteInput {
  content?: string
  isInternal?: boolean
}

export interface CreateAttachmentInput {
  entityType: AttachableEntityType
  entityId: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
}

export interface NoteQueryParams extends PaginationParams {
  entityType: NoteableEntityType
  entityId: string
}

export interface AttachmentQueryParams extends PaginationParams {
  entityType: AttachableEntityType
  entityId: string
}

// ============================================================
// RECURRING TASKS TYPES
// ============================================================

export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface RecurrencePattern {
  type: RecurrenceType
  interval: number // ogni X giorni/settimane/mesi
  daysOfWeek?: number[] // 0=domenica, 1=lunedì, ecc. (per weekly)
  dayOfMonth?: number // 1-31 (per monthly)
  endAfterOccurrences?: number // termina dopo N ripetizioni
  recurrenceEnd?: string // ISO datetime string
}

export interface CreateTaskCompletionInput {
  taskId: string
  completedBy: string
  notes?: string
}

export interface TaskCompletionResponse {
  id: string
  taskId: string
  completedBy: string
  completedAt: Date
  notes?: string
  user: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface RecurringTaskResponse extends Omit<Task, 'recurrencePattern'> {
  isRecurring: boolean
  recurrencePattern?: RecurrencePattern
  lastCompletion?: TaskCompletionResponse
  nextOccurrence?: Date | null
  completionHistory?: TaskCompletionResponse[]
}

export interface SetRecurrenceInput {
  isRecurring: boolean
  recurrencePattern?: RecurrencePattern
}

// ============================================================
// DEPARTMENT TYPES
// ============================================================

export interface CreateDepartmentInput {
  name: string
  description?: string
  color?: string
}

export interface UpdateDepartmentInput {
  name?: string
  description?: string
  color?: string
  isActive?: boolean
}

export interface DepartmentQueryParams extends PaginationParams {
  search?: string
  includeInactive?: boolean
}

// ============================================================
// CUSTOM FIELD TYPES
// ============================================================

export type CustomFieldType = 'text' | 'number' | 'dropdown' | 'date' | 'checkbox'

export interface CreateCustomFieldInput {
  name: string
  fieldType: CustomFieldType
  options?: string[] // dropdown options
  projectId?: string
  isRequired?: boolean
  position?: number
}

export interface UpdateCustomFieldInput {
  name?: string
  fieldType?: CustomFieldType
  options?: string[]
  isRequired?: boolean
  position?: number
  isActive?: boolean
}

export interface SetCustomFieldValueInput {
  definitionId: string
  taskId: string
  value: string | null
}

export interface CustomFieldQueryParams {
  projectId?: string
  includeGlobal?: boolean
  includeInactive?: boolean
}

// ============================================================
// SAVED VIEW TYPES
// ============================================================

export type SavedViewEntity = 'task' | 'project' | 'risk'

export interface CreateSavedViewInput {
  name: string
  entity: SavedViewEntity
  filters: Record<string, unknown>
  columns?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  isShared?: boolean
  isDefault?: boolean
}

export interface UpdateSavedViewInput {
  name?: string
  filters?: Record<string, unknown>
  columns?: string[] | null
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc' | null
  isShared?: boolean
  isDefault?: boolean
}

export interface SavedViewQueryParams {
  entity?: SavedViewEntity
  includeShared?: boolean
}

// ============================================================
// PROJECT MEMBER TYPES
// ============================================================

export type ProjectRole = 'owner' | 'manager' | 'member' | 'viewer' | 'guest'

export type ProjectCapability =
  | 'view_project'
  | 'edit_project'
  | 'delete_project'
  | 'manage_members'
  | 'create_task'
  | 'edit_any_task'
  | 'edit_own_task'
  | 'view_tasks'
  | 'manage_risks'
  | 'view_risks'
  | 'configure_workflow'
  | 'view_analytics'

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

