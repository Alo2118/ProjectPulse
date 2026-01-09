import express from 'express';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getDailyReport,
  getSubtasks,
  getTaskTree,
  getSubtasksStats,
  reorderSubtasks,
  setSubtaskDependency,
  convertToSubtask,
  promoteToTask,
  toggleTaskComplete,
  bulkCompleteSubtasks,
  bulkDeleteSubtasks
} from '../controllers/taskController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/daily-report', getDailyReport);
router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTask);

// Subtask routes
router.get('/:id/subtasks', getSubtasks);
router.get('/:id/tree', getTaskTree);
router.get('/:id/subtasks-stats', getSubtasksStats);
router.put('/:id/subtasks/reorder', reorderSubtasks);
router.put('/:id/subtasks/bulk-complete', bulkCompleteSubtasks);
router.post('/:id/subtasks/bulk-delete', bulkDeleteSubtasks);

// Task conversion and operations
router.put('/:id/convert-to-subtask', convertToSubtask);
router.put('/:id/promote-to-task', promoteToTask);
router.put('/:id/toggle-complete', toggleTaskComplete);
router.put('/:id/set-dependency', setSubtaskDependency);

// Standard CRUD
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
