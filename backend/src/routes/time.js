import express from 'express';
import {
  startTimer,
  stopTimer,
  getActiveTimer,
  getTimeEntries
} from '../controllers/timeController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/start', startTimer);
router.post('/:id/stop', stopTimer);
router.get('/active', getActiveTimer);
router.get('/', getTimeEntries);

export default router;
