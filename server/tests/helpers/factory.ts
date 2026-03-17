let counter = 0
function nextId(): string {
  counter++
  return `00000000-0000-4000-a000-${String(counter).padStart(12, '0')}`
}

export interface TestUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  passwordHash: string
  avatarUrl: string | null
  theme: string
  themeStyle: string
  isActive: boolean
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
}

export function createUser(overrides: Partial<TestUser> = {}): TestUser {
  const id = overrides.id ?? nextId()
  return {
    id,
    email: `user-${id.slice(-4)}@test.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'dipendente',
    passwordHash: '$2b$12$LJ3m4ysSNoVOiAc8eX5wCeVPjQGHRyKke8t6bDY5HEZCxqfGx8z6e',
    avatarUrl: null,
    theme: 'light',
    themeStyle: 'office-classic',
    isActive: true,
    isDeleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    lastLoginAt: null,
    ...overrides,
  }
}

export interface TestProject {
  id: string
  code: string
  name: string
  description: string | null
  status: string
  currentPhaseKey: string | null
  phases: unknown
  phaseTemplateId: string | null
  startDate: Date | null
  targetEndDate: Date | null
  actualEndDate: Date | null
  departmentId: string | null
  managerId: string | null
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

export function createProject(overrides: Partial<TestProject> = {}): TestProject {
  const id = overrides.id ?? nextId()
  return {
    id,
    code: `PRJ-2026-${String(counter).padStart(3, '0')}`,
    name: `Test Project ${counter}`,
    description: null,
    status: 'active',
    currentPhaseKey: null,
    phases: null,
    phaseTemplateId: null,
    startDate: new Date('2026-01-15'),
    targetEndDate: new Date('2026-06-30'),
    actualEndDate: null,
    departmentId: null,
    managerId: null,
    isDeleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export interface TestTask {
  id: string
  code: string
  title: string
  description: string | null
  status: string
  priority: string
  taskType: string
  projectId: string | null
  parentId: string | null
  phaseKey: string | null
  assigneeId: string | null
  estimatedHours: number | null
  actualHours: number | null
  startDate: Date | null
  dueDate: Date | null
  completedAt: Date | null
  sortOrder: number
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

export function createTask(overrides: Partial<TestTask> = {}): TestTask {
  const id = overrides.id ?? nextId()
  return {
    id,
    code: `PRJ-2026-001-T${String(counter).padStart(3, '0')}`,
    title: `Test Task ${counter}`,
    description: null,
    status: 'todo',
    priority: 'medium',
    taskType: 'task',
    projectId: null,
    parentId: null,
    phaseKey: null,
    assigneeId: null,
    estimatedHours: null,
    actualHours: null,
    startDate: null,
    dueDate: null,
    completedAt: null,
    sortOrder: counter,
    isDeleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export interface TestRisk {
  id: string
  code: string
  title: string
  description: string | null
  status: string
  category: string
  probability: string
  impact: string
  projectId: string
  ownerId: string | null
  mitigation: string | null
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

export function createRisk(overrides: Partial<TestRisk> = {}): TestRisk {
  const id = overrides.id ?? nextId()
  return {
    id,
    code: `PRJ-2026-001-R${String(counter).padStart(3, '0')}`,
    title: `Test Risk ${counter}`,
    description: null,
    status: 'open',
    category: 'technical',
    probability: 'medium',
    impact: 'medium',
    projectId: overrides.projectId ?? nextId(),
    ownerId: null,
    mitigation: null,
    isDeleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export interface TestNotification {
  id: string
  type: string
  title: string
  message: string
  userId: string
  isRead: boolean
  entityType: string | null
  entityId: string | null
  createdAt: Date
}

export function createNotification(overrides: Partial<TestNotification> = {}): TestNotification {
  const id = overrides.id ?? nextId()
  return {
    id,
    type: 'task_status_changed',
    title: 'Task Updated',
    message: 'A task status has changed',
    userId: overrides.userId ?? nextId(),
    isRead: false,
    entityType: 'task',
    entityId: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export function resetFactoryCounter(): void {
  counter = 0
}
