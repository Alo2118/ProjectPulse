import TimeEntry from '../models/TimeEntry.js';
import Task from '../models/Task.js';

export const startTimer = async (req, res) => {
  try {
    const { task_id } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    // Verify task exists
    const task = Task.findById(task_id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const timeEntry = TimeEntry.start({
      task_id,
      user_id: req.user.id
    });

    // Update task status to in_progress if it's not already
    if (task.status === 'todo') {
      Task.update(task_id, { status: 'in_progress' });
    }

    res.status(201).json(timeEntry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const stopTimer = async (req, res) => {
  try {
    const { id } = req.params;
    const timeEntry = TimeEntry.stop(id);
    res.json(timeEntry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getActiveTimer = async (req, res) => {
  try {
    const activeTimer = TimeEntry.getActiveTimer(req.user.id);
    res.json(activeTimer || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTimeEntries = async (req, res) => {
  try {
    const { task_id, from_date, to_date } = req.query;

    if (task_id) {
      const entries = TimeEntry.getByTask(parseInt(task_id));
      return res.json(entries);
    }

    const entries = TimeEntry.getByUser(req.user.id, from_date, to_date);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
