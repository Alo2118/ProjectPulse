import express from 'express';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectsWithHealth,
  getProjectHealth,
  getProjectVelocity,
  getTimeline
} from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Management Dashboard routes
router.get('/management/health', getProjectsWithHealth);
router.get('/management/timeline', getTimeline);

router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProject);
router.get('/:id/health', getProjectHealth);
router.get('/:id/velocity', getProjectVelocity);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
