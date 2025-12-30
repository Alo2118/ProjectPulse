import express from 'express';
import {
  startTimer,
  stopTimer,
  getActiveTimer,
  getTimeEntries,
  createManualEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getStatistics
} from '../controllers/timeController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/start', startTimer);
router.post('/:id/stop', stopTimer);
router.get('/active', getActiveTimer);
router.get('/statistics', getStatistics);
router.get('/', getTimeEntries);
router.post('/manual', createManualEntry);
router.put('/:id', updateTimeEntry);
router.delete('/:id', deleteTimeEntry);

export default router;
