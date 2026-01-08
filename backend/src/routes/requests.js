import express from 'express';
import {
  getRequests,
  getRequestById,
  createRequest,
  updateRequest,
  reviewRequest,
  convertToTask,
  convertToProject,
  deleteRequest,
  getStats
} from '../controllers/requestController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get requests with filters
router.get('/', getRequests);

// Get statistics
router.get('/stats', getStats);

// Get single request
router.get('/:id', getRequestById);

// Create new request
router.post('/', createRequest);

// Update request
router.put('/:id', updateRequest);

// Review request (approve/reject)
router.post('/:id/review', reviewRequest);

// Convert to task
router.post('/:id/convert-to-task', convertToTask);

// Convert to project
router.post('/:id/convert-to-project', convertToProject);

// Delete request
router.delete('/:id', deleteRequest);

export default router;
