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
  getSubtasksStats
} from '../controllers/taskController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/daily-report', getDailyReport);
router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTask);
router.get('/:id/subtasks', getSubtasks);
router.get('/:id/tree', getTaskTree);
router.get('/:id/subtasks-stats', getSubtasksStats);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
