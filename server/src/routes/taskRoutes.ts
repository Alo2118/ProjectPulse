/**
 * Task Routes - HTTP routes for task management
 * @module routes/taskRoutes
 */

import { Router } from 'express'
import {
  getTasks,
  getTask,
  getTasksKanban,
  createTask,
  updateTask,
  deleteTask,
  changeStatus,
  getMyTasks,
  getMyTaskStats,
  getSubtasks,
  getStandaloneTasks,
  getTasksForGantt,
  getTasksForCalendar,
  createDependency,
  getTaskDependencies,
  deleteDependency,
  reorderTasks,
  bulkUpdate,
  bulkDelete,
  cloneTask,
} from '../controllers/taskController.js'
import {
  completeOccurrence,
  getCompletionHistory,
  getRecurringTask,
  setRecurrence,
  purgeOldCompletions,
} from '../controllers/tasksRecurrenceController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

// All routes require authentication (Rule 7)
router.use(authMiddleware)

// GET /api/tasks/my - Get current user's tasks
router.get('/my', getMyTasks)

// GET /api/tasks/my/stats - Get current user's task statistics
router.get('/my/stats', getMyTaskStats)

// PATCH /api/tasks/reorder - Reorder user's tasks
router.patch('/reorder', reorderTasks)

// GET /api/tasks/standalone - Get standalone tasks (no project)
router.get('/standalone', getStandaloneTasks)

// GET /api/tasks/gantt - Get tasks for Gantt chart
router.get('/gantt', getTasksForGantt)

// GET /api/tasks/calendar - Get tasks for Calendar view
router.get('/calendar', getTasksForCalendar)

// GET /api/tasks/kanban/:projectId - Get tasks for Kanban board
router.get('/kanban/:projectId', getTasksKanban)

// PATCH /api/tasks/bulk - Bulk update tasks
router.patch('/bulk', bulkUpdate)

// DELETE /api/tasks/bulk - Bulk delete tasks
router.delete('/bulk', bulkDelete)

// GET /api/tasks - List tasks with pagination
router.get('/', getTasks)

// GET /api/tasks/:id - Get single task
router.get('/:id', getTask)

// GET /api/tasks/:id/subtasks - Get subtasks
router.get('/:id/subtasks', getSubtasks)

// GET /api/tasks/:id/dependencies - Get task dependencies
router.get('/:id/dependencies', getTaskDependencies)

// POST /api/tasks/:id/clone - Clone a task
router.post('/:id/clone', cloneTask)

// POST /api/tasks - Create task (all authenticated users)
router.post('/', createTask)

// PUT /api/tasks/:id - Update task
router.put('/:id', updateTask)

// PATCH /api/tasks/:id/status - Change task status
router.patch('/:id/status', changeStatus)

// DELETE /api/tasks/:id - Soft delete task (ownership check in controller)
router.delete('/:id', deleteTask)

// POST /api/tasks/dependencies - Create task dependency
router.post('/dependencies', createDependency)

// DELETE /api/tasks/dependencies/:dependencyId - Delete task dependency
router.delete('/dependencies/:dependencyId', deleteDependency)

// ============================================================
// RECURRING TASKS ROUTES (iso 13485 - recurring tasks)
// ============================================================

// POST /api/tasks/:taskId/completions - Mark occurrence as complete
router.post('/:taskId/completions', completeOccurrence)

// GET /api/tasks/:taskId/completions - Get completion history
router.get('/:taskId/completions', getCompletionHistory)

// GET /api/tasks/:taskId/recurring - Get recurring task details
router.get('/:taskId/recurring', getRecurringTask)

// POST /api/tasks/:taskId/recurrence - Set recurrence pattern
router.post('/:taskId/recurrence', setRecurrence)

// DELETE /api/tasks/:taskId/completions/old - Purge old completions
router.delete('/:taskId/completions/old', purgeOldCompletions)

export default router
