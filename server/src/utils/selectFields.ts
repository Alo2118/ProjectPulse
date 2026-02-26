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
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  ownerId: true,
  templateId: true,
  createdById: true,
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

/** Department reference fields */
export const departmentRefSelect = {
  id: true,
  name: true,
  color: true,
} as const
