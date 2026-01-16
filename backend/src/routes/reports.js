import express from 'express';
import { getWeeklyReport } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/weekly', getWeeklyReport);

export default router;
