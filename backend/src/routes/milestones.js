import express from 'express';
import {
  createMilestone,
  getMilestones,
  getMilestone,
  updateMilestone,
  deleteMilestone,
  completeMilestone
} from '../controllers/milestoneController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createMilestone);
router.get('/', getMilestones);
router.get('/:id', getMilestone);
router.put('/:id', updateMilestone);
router.delete('/:id', deleteMilestone);
router.post('/:id/complete', completeMilestone);

export default router;
