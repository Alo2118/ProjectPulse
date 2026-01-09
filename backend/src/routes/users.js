import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  reactivateUser
} from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Read operations - accessible to all authenticated users
router.get('/', getAllUsers);
router.get('/:id', getUserById);

// Write operations - only amministratore
router.post('/', requireRole('amministratore'), createUser);
router.put('/:id', requireRole('amministratore'), updateUser);
router.delete('/:id', requireRole('amministratore'), deleteUser);
router.post('/:id/reactivate', requireRole('amministratore'), reactivateUser);

export default router;
