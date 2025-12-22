import Comment from '../models/Comment.js';
import Task from '../models/Task.js';

export const createComment = async (req, res) => {
  try {
    const { task_id, message } = req.body;

    if (!task_id || !message) {
      return res.status(400).json({ error: 'Task ID and message are required' });
    }

    // Verify task exists
    const task = Task.findById(task_id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const is_from_direction = req.user.role === 'direzione';

    const comment = Comment.create({
      task_id,
      user_id: req.user.id,
      message,
      is_from_direction
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getComments = async (req, res) => {
  try {
    const { task_id } = req.query;

    if (!task_id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    const comments = Comment.getByTask(parseInt(task_id));
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only allow users to delete their own comments
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    Comment.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
