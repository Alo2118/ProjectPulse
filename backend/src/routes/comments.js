import express from 'express';
import {
  createComment,
  getComments,
  deleteComment
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createComment);
router.get('/', getComments);
router.delete('/:id', deleteComment);

export default router;
