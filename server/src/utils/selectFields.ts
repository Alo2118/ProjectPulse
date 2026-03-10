/**
 * Select Fields - Reusable Prisma select objects
 * Centralizes the repeated `select: { ... }` objects used across services
 * to keep queries consistent and avoid drift between files.
 * @module utils/selectFields
 */

// ============================================================
// USER SELECT
// ============================================================

/** Minimal user identity fields */
export const userMinimalSelect = {
  id: true,
  firstName: true,
  lastName: true,
} as const

/** User with email (for owner/assignee lookups) */
export const userSelectFields = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const

/** User with avatar (for assignee display) */
export const userWithAvatarSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
} as const

/** User with avatar and role (for comment/note author display) */
export const userWithAvatarAndRoleSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  role: true,
} as const

// ============================================================
// PROJECT SELECT
// ============================================================

/** Compact project reference (used in task/risk/etc. relations) */
export const projectRefSelect = {
  id: true,
  code: true,
  name: true,
} as const

/** Full project scalar fields (no relations) */
export const projectSelectFields = {
  id: true,
  code: true,
  name: true,
  description: true,
  status: true,
  priority: true,
  startDate: true,
  targetEndDate: true,
  actualEndDate: true,
  budget: true,
  sortOrder: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  ownerId: true,
  templateId: true,
  createdById: true,
  phaseTemplateId: true,
  phases: true,
  currentPhaseKey: true,
} as const

/** Project with its relations (owner, createdBy, template, _count) */
export const projectWithRelationsSelect = {
  ...projectSelectFields,
  owner: {
    select: userSelectFields,
  },
  createdBy: {
    select: userMinimalSelect,
  },
  template: {
    select: { id: true, name: true },
  },
  _count: {
    select: {
      tasks: { where: { isDeleted: false } },
      risks: true,
      documents: true,
    },
  },
} as const

// ============================================================
// TASK SELECT
// ============================================================

/** Task scalar fields only (no relations) */
export const taskSelectFields = {
  id: true,
  code: true,
  title: true,
  description: true,
  taskType: true,
  status: true,
  priority: true,
  startDate: true,
  dueDate: true,
  estimatedHours: true,
  actualHours: true,
  blockedReason: true,
  isRecurring: true,
  recurrencePattern: true,
  position: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  projectId: true,
  assigneeId: true,
  departmentId: true,
  createdById: true,
} as const

/** Task with all common relations */
export const taskWithRelationsSelect = {
  ...taskSelectFields,
  parentTaskId: true,
  project: {
    select: projectRefSelect,
  },
  assignee: {
    select: userWithAvatarSelect,
  },
  department: {
    select: { id: true, name: true, color: true },
  },
  createdBy: {
    select: userMinimalSelect,
  },
  parentTask: {
    select: { id: true, code: true, title: true, taskType: true },
  },
  _count: {
    select: { comments: true, timeEntries: true, subtasks: true },
  },
} as const

// ============================================================
// DEPARTMENT SELECT
// ============================================================

/** Department reference fields (compact, for task relations) */
export const departmentRefSelect = {
  id: true,
  name: true,
  color: true,
} as const

/** Full department scalar fields (for department management) */
export const departmentSelectFields = {
  id: true,
  name: true,
  description: true,
  color: true,
  isActive: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} as const

// ============================================================
// RISK SELECT
// ============================================================

/** Risk scalar fields only (no relations) */
export const riskSelectFields = {
  id: true,
  code: true,
  title: true,
  description: true,
  category: true,
  probability: true,
  impact: true,
  status: true,
  mitigationPlan: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  projectId: true,
  ownerId: true,
  createdById: true,
} as const

/** Risk with project, owner, and createdBy relations */
export const riskWithRelationsSelect = {
  ...riskSelectFields,
  project: {
    select: projectRefSelect,
  },
  owner: {
    select: userWithAvatarSelect,
  },
  createdBy: {
    select: userMinimalSelect,
  },
} as const

// ============================================================
// DOCUMENT SELECT
// ============================================================

/** Document scalar fields only (no relations) */
export const documentSelectFields = {
  id: true,
  code: true,
  title: true,
  description: true,
  type: true,
  filePath: true,
  fileSize: true,
  mimeType: true,
  version: true,
  status: true,
  projectId: true,
  createdById: true,
  approvedById: true,
  approvedAt: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} as const

/** Document with project, createdBy, and approvedBy relations */
export const documentWithRelationsSelect = {
  ...documentSelectFields,
  project: {
    select: projectRefSelect,
  },
  createdBy: {
    select: userSelectFields,
  },
  approvedBy: {
    select: userSelectFields,
  },
} as const

// ============================================================
// COMMENT SELECT
// ============================================================

/** Comment scalar fields only (no relations) */
export const commentSelectFields = {
  id: true,
  content: true,
  isInternal: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  taskId: true,
  userId: true,
  parentId: true,
} as const

/**
 * Comment with full relations: user (with role), task (with project including ownerId).
 * The task.project shape includes ownerId for notification routing.
 */
export const commentWithRelationsSelect = {
  ...commentSelectFields,
  user: {
    select: userWithAvatarAndRoleSelect,
  },
  task: {
    select: {
      id: true,
      code: true,
      title: true,
      assigneeId: true,
      project: {
        select: { id: true, code: true, name: true, ownerId: true },
      },
    },
  },
} as const

/**
 * Root comment threaded select: includes nested replies (1 level deep).
 * Used by getTaskComments to return threaded comment lists.
 */
export const rootCommentThreadedSelect = {
  id: true,
  content: true,
  isInternal: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  taskId: true,
  userId: true,
  parentId: true,
  user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  replies: {
    where: { isDeleted: false },
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      content: true,
      isInternal: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      taskId: true,
      userId: true,
      parentId: true,
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  },
} as const

// ============================================================
// NOTE SELECT
// ============================================================

/** Note scalar fields only (no relations) */
export const noteSelectFields = {
  id: true,
  content: true,
  entityType: true,
  entityId: true,
  isInternal: true,
  isDeleted: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
} as const

/**
 * Note with user (including role) and nested replies (1 level deep).
 * Used for both top-level notes and reply display.
 */
export const noteWithRelationsSelect = {
  ...noteSelectFields,
  user: {
    select: userWithAvatarAndRoleSelect,
  },
  replies: {
    where: { isDeleted: false },
    select: {
      id: true,
      content: true,
      createdAt: true,
      userId: true,
      user: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const

// ============================================================
// TIME ENTRY SELECT
// ============================================================

/** Time entry scalar fields only (no relations) */
export const timeEntrySelectFields = {
  id: true,
  description: true,
  startTime: true,
  endTime: true,
  duration: true,
  isRunning: true,
  isDeleted: true,
  approvalStatus: true,
  approvedById: true,
  approvedAt: true,
  rejectionNote: true,
  createdAt: true,
  updatedAt: true,
  taskId: true,
  userId: true,
} as const

/**
 * Time entry with task (including nested project) and user/approvedBy relations.
 * The task.project is a compact reference for display and grouping.
 */
export const timeEntryWithRelationsSelect = {
  ...timeEntrySelectFields,
  task: {
    select: {
      id: true,
      code: true,
      title: true,
      project: {
        select: projectRefSelect,
      },
    },
  },
  user: {
    select: userMinimalSelect,
  },
  approvedBy: {
    select: userMinimalSelect,
  },
} as const

// ============================================================
// TAG SELECT
// ============================================================

/** Tag scalar fields only (no relations) */
export const tagSelectFields = {
  id: true,
  name: true,
  color: true,
  createdById: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} as const

/** Tag with its creator relation */
export const tagWithCreatorSelect = {
  ...tagSelectFields,
  createdBy: {
    select: userMinimalSelect,
  },
} as const

// ============================================================
// CHECKLIST SELECT
// ============================================================

/** Checklist item fields (no relations — items are always fetched by taskId) */
export const checklistItemSelect = {
  id: true,
  taskId: true,
  title: true,
  isChecked: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} as const

// ============================================================
// USER INPUT SELECT
// ============================================================

/** User input scalar fields only (no relations) */
export const userInputSelectFields = {
  id: true,
  code: true,
  title: true,
  description: true,
  category: true,
  priority: true,
  status: true,
  resolutionType: true,
  resolutionNotes: true,
  resolvedAt: true,
  convertedTaskId: true,
  convertedProjectId: true,
  attachments: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  processedById: true,
  processedAt: true,
} as const

/**
 * User input with creator, processor, and converted entity relations.
 * convertedTask / convertedProject use compact reference shapes.
 */
export const userInputWithRelationsSelect = {
  ...userInputSelectFields,
  createdBy: {
    select: userWithAvatarSelect,
  },
  processedBy: {
    select: userSelectFields,
  },
  convertedTask: {
    select: { id: true, code: true, title: true },
  },
  convertedProject: {
    select: projectRefSelect,
  },
} as const

// ============================================================
// SAVED VIEW SELECT
// ============================================================

/**
 * Saved view fields including the owner's minimal user identity.
 * Filters and columns are stored as JSON strings; callers must parse them.
 */
export const savedViewSelectFields = {
  id: true,
  name: true,
  entity: true,
  filters: true,
  columns: true,
  sortBy: true,
  sortOrder: true,
  isShared: true,
  isDefault: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: userMinimalSelect,
  },
} as const
