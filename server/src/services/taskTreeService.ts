/**
 * Task Tree Service - Hierarchical project/task data for reports
 * Supports: Project → Milestone → Task → Subtask hierarchy
 * @module services/taskTreeService
 */

import { prisma } from '../models/prismaClient.js'

/** Raw shape returned by the per-level Prisma query in getSubtaskTree */
interface RawSubtaskRecord {
  id: string
  code: string
  title: string
  taskType: string
  status: string
  priority: string
  projectId: string | null
  parentTaskId: string | null
  dueDate: Date | null
  estimatedHours: { toNumber(): number } | null
  isRecurring: boolean
  assignee: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null
  department: { id: string; name: string; color: string } | null
}

interface TaskTreeStats {
  total: number
  completed: number
  inProgress: number
  blocked: number
  todo: number
  totalHours: number
  estimatedHours: number
}

interface DeptRef {
  id: string
  name: string
  color: string
}

interface DependencyRef {
  id: string
  code: string
  title: string
}

interface SubtaskNode {
  id: string
  code: string
  title: string
  taskType: string
  status: string
  priority: string
  isRecurring: boolean
  assignee: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  } | null
  department: DeptRef | null
  dueDate: string | null
  estimatedHours: number
  actualHours: number
  stats: TaskTreeStats
  subtasks: SubtaskNode[]
  blockedBy: DependencyRef[]
  blocks: DependencyRef[]
}

interface TaskNode {
  id: string
  code: string
  title: string
  taskType: string
  status: string
  priority: string
  isRecurring: boolean
  assignee: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  } | null
  department: DeptRef | null
  dueDate: string | null
  estimatedHours: number
  actualHours: number
  stats: TaskTreeStats
  subtasks: SubtaskNode[]
  blockedBy: DependencyRef[]
  blocks: DependencyRef[]
}

interface MilestoneNode {
  id: string
  code: string
  title: string
  taskType: string
  status: string
  priority: string
  assignee: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  } | null
  department: DeptRef | null
  dueDate: string | null
  estimatedHours: number
  actualHours: number
  stats: TaskTreeStats
  tasks: TaskNode[]
  blockedBy: DependencyRef[]
  blocks: DependencyRef[]
}

interface ProjectNode {
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
  tasks: TaskNode[] // Orphan tasks (not under any milestone)
}

interface TaskTreeResponse {
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

interface ParsedTask {
  id: string
  code: string
  title: string
  taskType: string
  status: string
  priority: string
  isRecurring: boolean
  projectId: string | null
  parentTaskId: string | null
  dueDate: Date | null
  estimatedHours: number
  actualHours: number
  assignee: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  } | null
  department: DeptRef | null
  blockedBy: DependencyRef[]
  blocks: DependencyRef[]
}

/**
 * Recursively builds subtask tree
 */
function buildSubtaskTree(
  parentId: string,
  allTasks: Map<string, ParsedTask[]>,
  taskHours: Map<string, number>,
  blockedByMap?: Map<string, DependencyRef[]>,
  blocksMap?: Map<string, DependencyRef[]>
): SubtaskNode[] {
  const children = allTasks.get(parentId) || []

  return children.map((task) => {
    const subtasks = buildSubtaskTree(task.id, allTasks, taskHours, blockedByMap, blocksMap)
    const actualHours = taskHours.get(task.id) || task.actualHours || 0

    const nestedStats = subtasks.reduce(
      (acc, sub) => {
        acc.total += sub.stats.total + 1
        acc.completed += sub.stats.completed + (sub.status === 'done' ? 1 : 0)
        acc.inProgress += sub.stats.inProgress + (['in_progress', 'review'].includes(sub.status) ? 1 : 0)
        acc.blocked += sub.stats.blocked + (sub.status === 'blocked' ? 1 : 0)
        acc.todo += sub.stats.todo + (sub.status === 'todo' ? 1 : 0)
        acc.estimatedHours += sub.stats.estimatedHours + sub.estimatedHours
        acc.totalHours += sub.stats.totalHours + sub.actualHours
        return acc
      },
      { total: 0, completed: 0, inProgress: 0, blocked: 0, todo: 0, estimatedHours: 0, totalHours: 0 }
    )

    const stats: TaskTreeStats = {
      total: nestedStats.total,
      completed: nestedStats.completed,
      inProgress: nestedStats.inProgress,
      blocked: nestedStats.blocked,
      todo: nestedStats.todo,
      estimatedHours: nestedStats.estimatedHours,
      totalHours: nestedStats.totalHours,
    }

    return {
      id: task.id,
      code: task.code,
      title: task.title,
      taskType: task.taskType,
      status: task.status,
      priority: task.priority,
      isRecurring: task.isRecurring,
      assignee: task.assignee,
      department: task.department,
      dueDate: task.dueDate?.toISOString() ?? null,
      estimatedHours: task.estimatedHours,
      actualHours,
      stats,
      subtasks,
      blockedBy: blockedByMap?.get(task.id) ?? task.blockedBy,
      blocks: blocksMap?.get(task.id) ?? task.blocks,
    }
  })
}

interface TaskTreeOptions {
  projectId?: string
  parentTaskId?: string
  myTasksOnly?: boolean
  filterUserId?: string
  excludeCompleted?: boolean
}

/**
 * Gets the full task tree for all projects the user has access to
 * @param userId - The user requesting the data
 * @param userRole - The user's role
 * @param options - Filter options
 */
async function getSubtaskTree(
  parentTaskId: string,
  excludeCompleted: boolean
): Promise<TaskTreeResponse> {
  // Iteratively fetch descendants level by level instead of loading all tasks
  const allDescendants: RawSubtaskRecord[] = []
  let currentParentIds = [parentTaskId]
  const MAX_LEVELS = 20

  for (let level = 0; level < MAX_LEVELS && currentParentIds.length > 0; level++) {
    const levelTasks = await prisma.task.findMany({
      where: {
        parentTaskId: { in: currentParentIds },
        isDeleted: false,
        ...(excludeCompleted ? { status: { notIn: ['done', 'cancelled'] } } : {}),
      },
      select: {
        id: true,
        code: true,
        title: true,
        taskType: true,
        status: true,
        priority: true,
        projectId: true,
        parentTaskId: true,
        dueDate: true,
        estimatedHours: true,
        isRecurring: true,
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        department: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })

    allDescendants.push(...levelTasks)
    currentParentIds = levelTasks.map((t) => t.id)
  }

  // Build parent→children map
  const tasksByParent = new Map<string, ParsedTask[]>()
  const taskIds: string[] = []

  for (const task of allDescendants) {
    if (!task.parentTaskId) continue
    const estimatedHours = task.estimatedHours ? parseFloat(task.estimatedHours.toString()) : 0
    const parsed: ParsedTask = {
      id: task.id,
      code: task.code,
      title: task.title,
      taskType: task.taskType,
      status: task.status,
      priority: task.priority,
      isRecurring: task.isRecurring,
      projectId: task.projectId,
      parentTaskId: task.parentTaskId,
      dueDate: task.dueDate,
      estimatedHours,
      actualHours: 0,
      assignee: task.assignee,
      department: task.department,
      blockedBy: [],
      blocks: [],
    }
    const existing = tasksByParent.get(task.parentTaskId) || []
    existing.push(parsed)
    tasksByParent.set(task.parentTaskId, existing)
    taskIds.push(task.id)
  }

  // Fetch time entries
  const timeEntries = taskIds.length > 0
    ? await prisma.timeEntry.groupBy({
        by: ['taskId'],
        where: { taskId: { in: taskIds }, duration: { not: null } },
        _sum: { duration: true },
      })
    : []

  const taskHours = new Map<string, number>()
  for (const entry of timeEntries) {
    taskHours.set(entry.taskId, (entry._sum.duration || 0) / 60)
  }

  // Fetch dependencies for all descendant tasks
  const allDescendantIds = [...taskIds]
  const depRecords = allDescendantIds.length > 0
    ? await prisma.taskDependency.findMany({
        where: {
          OR: [
            { predecessorId: { in: allDescendantIds } },
            { successorId: { in: allDescendantIds } },
          ],
        },
        select: {
          predecessorId: true,
          successorId: true,
          predecessor: { select: { id: true, code: true, title: true } },
          successor: { select: { id: true, code: true, title: true } },
        },
      })
    : []

  const subtaskBlockedByMap = new Map<string, DependencyRef[]>()
  const subtaskBlocksMap = new Map<string, DependencyRef[]>()

  for (const dep of depRecords) {
    const blockedByList = subtaskBlockedByMap.get(dep.successorId) || []
    blockedByList.push(dep.predecessor)
    subtaskBlockedByMap.set(dep.successorId, blockedByList)

    const blocksList = subtaskBlocksMap.get(dep.predecessorId) || []
    blocksList.push(dep.successor)
    subtaskBlocksMap.set(dep.predecessorId, blocksList)
  }

  const subtasks = buildSubtaskTree(parentTaskId, tasksByParent, taskHours, subtaskBlockedByMap, subtaskBlocksMap)

  const totalCount = subtasks.length
  const completedCount = subtasks.filter((s) => s.status === 'done').length

  return {
    projects: [],
    subtasks,
    summary: {
      totalProjects: 0,
      totalMilestones: 0,
      totalTasks: 0,
      totalSubtasks: totalCount,
      overallProgress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      totalHoursLogged: subtasks.reduce((acc, s) => acc + s.actualHours + s.stats.totalHours, 0),
    },
  }
}

async function getTaskTree(
  userId: string,
  userRole: string,
  options: TaskTreeOptions = {}
): Promise<TaskTreeResponse> {
  const { projectId, parentTaskId, myTasksOnly = false, filterUserId, excludeCompleted = false } = options

  // If parentTaskId is specified, return subtask tree only
  if (parentTaskId) {
    return getSubtaskTree(parentTaskId, excludeCompleted)
  }

  // Build project filter based on role
  const projectWhere: Record<string, unknown> = {
    isDeleted: false,
    status: { notIn: ['cancelled'] },
  }

  // If specific project requested
  if (projectId) {
    projectWhere.id = projectId
  }

  // For dipendente, only show projects they're involved in
  if (userRole === 'dipendente') {
    projectWhere.OR = [
      { ownerId: userId },
      { createdById: userId },
      { tasks: { some: { assigneeId: userId, isDeleted: false } } },
    ]
  }

  // Fetch projects
  const projects = await prisma.project.findMany({
    where: projectWhere,
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      priority: true,
      targetEndDate: true,
      owner: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: [{ priority: 'desc' }, { name: 'asc' }],
  })

  if (projects.length === 0) {
    return {
      projects: [],
      summary: {
        totalProjects: 0,
        totalMilestones: 0,
        totalTasks: 0,
        totalSubtasks: 0,
        overallProgress: 0,
        totalHoursLogged: 0,
      },
    }
  }

  const projectIds = projects.map((p) => p.id)

  // Build task filter
  const taskWhere: Record<string, unknown> = {
    projectId: { in: projectIds },
    isDeleted: false,
  }

  // Filter by specific user if requested
  if (filterUserId) {
    taskWhere.assigneeId = filterUserId
  } else if (myTasksOnly) {
    // Otherwise filter only user's tasks if requested
    taskWhere.assigneeId = userId
  }

  // Exclude completed tasks if requested
  if (excludeCompleted) {
    taskWhere.status = { notIn: ['done', 'cancelled'] }
  }

  // Fetch all tasks for these projects (including taskType)
  const allTasksRaw = await prisma.task.findMany({
    where: taskWhere,
    select: {
      id: true,
      code: true,
      title: true,
      taskType: true,
      status: true,
      priority: true,
      projectId: true,
      parentTaskId: true,
      dueDate: true,
      estimatedHours: true,
      isRecurring: true,
      assignee: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      department: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })

  // Fetch time entries for all tasks
  const taskIds = allTasksRaw.map((t) => t.id)
  const timeEntries = await prisma.timeEntry.groupBy({
    by: ['taskId'],
    where: { taskId: { in: taskIds }, duration: { not: null } },
    _sum: { duration: true },
  })

  const taskHours = new Map<string, number>()
  for (const entry of timeEntries) {
    taskHours.set(entry.taskId, (entry._sum.duration || 0) / 60) // Convert minutes to hours
  }

  // Fetch dependencies for all tasks in the tree
  const allTaskIds = allTasksRaw.map((t) => t.id)
  const dependencies = allTaskIds.length > 0
    ? await prisma.taskDependency.findMany({
        where: {
          OR: [
            { predecessorId: { in: allTaskIds } },
            { successorId: { in: allTaskIds } },
          ],
        },
        select: {
          predecessorId: true,
          successorId: true,
          predecessor: { select: { id: true, code: true, title: true } },
          successor: { select: { id: true, code: true, title: true } },
        },
      })
    : []

  // Build dependency maps
  const blockedByMap = new Map<string, DependencyRef[]>()
  const blocksMap = new Map<string, DependencyRef[]>()

  for (const dep of dependencies) {
    // successorId is blocked BY predecessorId
    const existingBlockedBy = blockedByMap.get(dep.successorId) || []
    existingBlockedBy.push(dep.predecessor)
    blockedByMap.set(dep.successorId, existingBlockedBy)

    // predecessorId blocks successorId
    const existingBlocks = blocksMap.get(dep.predecessorId) || []
    existingBlocks.push(dep.successor)
    blocksMap.set(dep.predecessorId, existingBlocks)
  }

  // Group tasks by project and parent - convert to parsed format
  const tasksByProject = new Map<string, ParsedTask[]>()
  const tasksByParent = new Map<string, ParsedTask[]>()

  // Also track milestones separately by project
  const milestonesByProject = new Map<string, ParsedTask[]>()

  for (const task of allTasksRaw) {
    // Parse estimatedHours from Decimal
    const estimatedHours = task.estimatedHours ? parseFloat(task.estimatedHours.toString()) : 0
    const actualHours = taskHours.get(task.id) || 0

    const parsedTask: ParsedTask = {
      id: task.id,
      code: task.code,
      title: task.title,
      taskType: task.taskType,
      status: task.status,
      priority: task.priority,
      isRecurring: task.isRecurring,
      projectId: task.projectId,
      parentTaskId: task.parentTaskId,
      dueDate: task.dueDate,
      estimatedHours,
      actualHours,
      assignee: task.assignee,
      department: task.department,
      blockedBy: blockedByMap.get(task.id) || [],
      blocks: blocksMap.get(task.id) || [],
    }

    if (!task.parentTaskId && task.projectId) {
      // Root level item - check if milestone or orphan task
      if (task.taskType === 'milestone') {
        const existing = milestonesByProject.get(task.projectId) || []
        existing.push(parsedTask)
        milestonesByProject.set(task.projectId, existing)
      } else {
        // Orphan task (not under any milestone)
        const existing = tasksByProject.get(task.projectId) || []
        existing.push(parsedTask)
        tasksByProject.set(task.projectId, existing)
      }
    } else if (task.parentTaskId) {
      // Child of another task (could be task under milestone, or subtask under task)
      const existing = tasksByParent.get(task.parentTaskId) || []
      existing.push(parsedTask)
      tasksByParent.set(task.parentTaskId, existing)
    }
  }

  // Helper function to build TaskNode from ParsedTask
  const buildTaskNode = (task: ParsedTask): TaskNode => {
    const subtasks = buildSubtaskTree(task.id, tasksByParent, taskHours, blockedByMap, blocksMap)

    // Calculate stats for this task's subtasks
    const nestedStats = subtasks.reduce(
      (acc, sub) => {
        acc.total += sub.stats.total + 1
        acc.completed += sub.stats.completed + (sub.status === 'done' ? 1 : 0)
        acc.inProgress += sub.stats.inProgress + (['in_progress', 'review'].includes(sub.status) ? 1 : 0)
        acc.blocked += sub.stats.blocked + (sub.status === 'blocked' ? 1 : 0)
        acc.todo += sub.stats.todo + (sub.status === 'todo' ? 1 : 0)
        acc.estimatedHours += sub.stats.estimatedHours + sub.estimatedHours
        acc.totalHours += sub.stats.totalHours + sub.actualHours
        return acc
      },
      { total: 0, completed: 0, inProgress: 0, blocked: 0, todo: 0, estimatedHours: 0, totalHours: 0 }
    )

    return {
      id: task.id,
      code: task.code,
      title: task.title,
      taskType: task.taskType,
      status: task.status,
      priority: task.priority,
      isRecurring: task.isRecurring,
      assignee: task.assignee,
      department: task.department,
      dueDate: task.dueDate?.toISOString() ?? null,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      stats: nestedStats,
      subtasks,
      blockedBy: task.blockedBy,
      blocks: task.blocks,
    }
  }

  // Build project nodes with milestone and task trees
  let totalMilestoneCount = 0
  let totalTaskCount = 0
  let totalSubtaskCount = 0
  let totalHoursLogged = 0

  const projectNodes: ProjectNode[] = projects.map((project) => {
    const projectMilestones = milestonesByProject.get(project.id) || []
    const orphanTasks = tasksByProject.get(project.id) || []

    // Build milestone nodes with their child tasks
    const milestones: MilestoneNode[] = projectMilestones.map((milestone) => {
      // Get tasks that are children of this milestone
      const milestoneTasks = tasksByParent.get(milestone.id) || []
      const tasks: TaskNode[] = milestoneTasks.map(buildTaskNode)

      // Count subtasks within milestone tasks
      const countSubtasksInTasks = (taskNodes: TaskNode[]): number => {
        return taskNodes.reduce((acc, t) => {
          const countNested = (subs: SubtaskNode[]): number => {
            return subs.reduce((a, s) => a + 1 + countNested(s.subtasks), 0)
          }
          return acc + countNested(t.subtasks)
        }, 0)
      }

      // Calculate milestone stats from its tasks
      const milestoneStats = tasks.reduce(
        (acc, task) => {
          acc.total++
          acc.estimatedHours += task.estimatedHours + task.stats.estimatedHours
          acc.totalHours += task.actualHours + task.stats.totalHours

          switch (task.status) {
            case 'done':
              acc.completed++
              break
            case 'in_progress':
            case 'review':
              acc.inProgress++
              break
            case 'blocked':
              acc.blocked++
              break
            case 'todo':
              acc.todo++
              break
          }

          acc.total += task.stats.total
          acc.completed += task.stats.completed
          acc.inProgress += task.stats.inProgress
          acc.blocked += task.stats.blocked
          acc.todo += task.stats.todo

          return acc
        },
        { total: 0, completed: 0, inProgress: 0, blocked: 0, todo: 0, estimatedHours: 0, totalHours: 0 } as TaskTreeStats
      )

      totalTaskCount += tasks.length
      totalSubtaskCount += countSubtasksInTasks(tasks)

      return {
        id: milestone.id,
        code: milestone.code,
        title: milestone.title,
        taskType: milestone.taskType,
        status: milestone.status,
        priority: milestone.priority,
        assignee: milestone.assignee,
        department: milestone.department,
        dueDate: milestone.dueDate?.toISOString() ?? null,
        estimatedHours: milestone.estimatedHours,
        actualHours: milestone.actualHours,
        stats: milestoneStats,
        tasks,
        blockedBy: milestone.blockedBy,
        blocks: milestone.blocks,
      }
    })

    totalMilestoneCount += milestones.length

    // Build orphan task nodes (tasks not under any milestone)
    const tasks: TaskNode[] = orphanTasks.map(buildTaskNode)

    // Count subtasks in orphan tasks
    const countSubtasks = (subs: SubtaskNode[]): number => {
      return subs.reduce((acc, sub) => acc + 1 + countSubtasks(sub.subtasks), 0)
    }
    for (const task of tasks) {
      totalSubtaskCount += countSubtasks(task.subtasks)
    }
    totalTaskCount += tasks.length

    // Calculate project stats from milestones + orphan tasks
    const projectStats: TaskTreeStats = {
      total: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      todo: 0,
      estimatedHours: 0,
      totalHours: 0,
    }

    // Add milestone stats
    for (const milestone of milestones) {
      projectStats.total += milestone.stats.total
      projectStats.completed += milestone.stats.completed
      projectStats.inProgress += milestone.stats.inProgress
      projectStats.blocked += milestone.stats.blocked
      projectStats.todo += milestone.stats.todo
      projectStats.estimatedHours += milestone.stats.estimatedHours
      projectStats.totalHours += milestone.stats.totalHours
    }

    // Add orphan task stats
    for (const task of tasks) {
      projectStats.total++
      projectStats.estimatedHours += task.estimatedHours + task.stats.estimatedHours
      projectStats.totalHours += task.actualHours + task.stats.totalHours

      switch (task.status) {
        case 'done':
          projectStats.completed++
          break
        case 'in_progress':
        case 'review':
          projectStats.inProgress++
          break
        case 'blocked':
          projectStats.blocked++
          break
        case 'todo':
          projectStats.todo++
          break
      }

      projectStats.total += task.stats.total
      projectStats.completed += task.stats.completed
      projectStats.inProgress += task.stats.inProgress
      projectStats.blocked += task.stats.blocked
      projectStats.todo += task.stats.todo
    }

    totalHoursLogged += projectStats.totalHours

    const progress = projectStats.total > 0 ? Math.round((projectStats.completed / projectStats.total) * 100) : 0

    return {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      priority: project.priority,
      owner: project.owner,
      targetEndDate: project.targetEndDate?.toISOString() ?? null,
      progress,
      stats: projectStats,
      milestones,
      tasks,
    }
  })

  const totalAllTasks = projectNodes.reduce((acc, p) => acc + p.stats.total, 0)
  const totalAllCompleted = projectNodes.reduce((acc, p) => acc + p.stats.completed, 0)

  return {
    projects: projectNodes,
    summary: {
      totalProjects: projectNodes.length,
      totalMilestones: totalMilestoneCount,
      totalTasks: totalTaskCount,
      totalSubtasks: totalSubtaskCount,
      overallProgress: totalAllTasks > 0 ? Math.round((totalAllCompleted / totalAllTasks) * 100) : 0,
      totalHoursLogged: Math.round(totalHoursLogged * 10) / 10,
    },
  }
}

export const taskTreeService = {
  getTaskTree,
}

export type { ProjectNode, MilestoneNode, TaskNode, SubtaskNode, TaskTreeStats, TaskTreeResponse }
