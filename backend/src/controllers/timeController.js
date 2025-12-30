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
    const { task_id, from_date, to_date, user_id, project_id } = req.query;

    if (task_id) {
      const entries = TimeEntry.getByTask(parseInt(task_id));
      return res.json(entries);
    }

    // Amministratore can view all users' time entries
    if (req.user.role === 'amministratore' && user_id) {
      const entries = TimeEntry.getByUser(parseInt(user_id), from_date, to_date);
      return res.json(entries);
    }

    // Amministratore can view all entries with filters
    if (req.user.role === 'amministratore') {
      const entries = TimeEntry.getAll({
        user_id: user_id ? parseInt(user_id) : undefined,
        project_id: project_id ? parseInt(project_id) : undefined,
        from_date,
        to_date
      });
      return res.json(entries);
    }

    // Regular users can only see their own entries
    const entries = TimeEntry.getByUser(req.user.id, from_date, to_date);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createManualEntry = async (req, res) => {
  try {
    const { task_id, user_id, started_at, ended_at, notes } = req.body;

    if (!task_id || !started_at || !ended_at) {
      return res.status(400).json({ error: 'Task ID, start time, and end time are required' });
    }

    // Verify task exists
    const task = Task.findById(task_id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Determine which user to create entry for
    let targetUserId = req.user.id;

    // Amministratore can create entries for other users
    if (req.user.role === 'amministratore' && user_id) {
      targetUserId = parseInt(user_id);
    }

    const timeEntry = TimeEntry.createManual({
      task_id: parseInt(task_id),
      user_id: targetUserId,
      started_at,
      ended_at,
      notes: notes || ''
    });

    res.status(201).json(timeEntry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { started_at, ended_at, notes } = req.body;

    const entry = TimeEntry.findById(parseInt(id));
    if (!entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    // Only allow owner or amministratore to update
    if (entry.user_id !== req.user.id && req.user.role !== 'amministratore') {
      return res.status(403).json({ error: 'Not authorized to update this time entry' });
    }

    const updated = TimeEntry.update(parseInt(id), {
      started_at,
      ended_at,
      notes
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = TimeEntry.findById(parseInt(id));
    if (!entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }

    // Only allow owner or amministratore to delete
    if (entry.user_id !== req.user.id && req.user.role !== 'amministratore') {
      return res.status(403).json({ error: 'Not authorized to delete this time entry' });
    }

    // Don't allow deletion of active timers
    if (!entry.ended_at) {
      return res.status(400).json({ error: 'Cannot delete an active timer. Stop it first.' });
    }

    TimeEntry.delete(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getStatistics = async (req, res) => {
  try {
    const { user_id, project_id, from_date, to_date } = req.query;

    const filters = {
      from_date,
      to_date
    };

    // Amministratore can filter by any user or project
    if (req.user.role === 'amministratore') {
      if (user_id) filters.user_id = parseInt(user_id);
      if (project_id) filters.project_id = parseInt(project_id);
    } else {
      // Regular users can only see their own stats
      filters.user_id = req.user.id;
    }

    const stats = TimeEntry.getStatistics(filters);
    const timeByProject = TimeEntry.getTimeByProject(filters);
    const timeByUser = req.user.role === 'amministratore'
      ? TimeEntry.getTimeByUser(filters)
      : null;

    res.json({
      overall: stats,
      by_project: timeByProject,
      by_user: timeByUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
