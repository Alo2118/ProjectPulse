import Task from '../models/Task.js';
import TimeEntry from '../models/TimeEntry.js';

export const createTask = async (req, res) => {
  try {
    const { title, description, status, project_id, assigned_to, priority, deadline, parent_task_id } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const task = Task.create({
      title,
      description,
      status,
      project_id,
      assigned_to: assigned_to || req.user.id,
      created_by: req.user.id,
      priority,
      deadline,
      parent_task_id
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTasks = async (req, res) => {
  try {
    const { assigned_to, status, project_id, milestone_id, limit, offset } = req.query;

    const filters = {};
    if (assigned_to) filters.assigned_to = parseInt(assigned_to);
    if (status) filters.status = status;
    if (project_id) filters.project_id = parseInt(project_id);
    if (milestone_id) filters.milestone_id = parseInt(milestone_id);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const tasks = Task.getAll(filters);
    const total = Task.getCount(filters);

    res.json({
      data: tasks,
      pagination: {
        total,
        limit: filters.limit || 100,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + (filters.limit || 100) < total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTask = async (req, res) => {
  try {
    const task = Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Auto-set completed_at when status changes to completed
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    // Clear completed_at if status is not completed
    if (updates.status && updates.status !== 'completed') {
      updates.completed_at = null;
    }

    const task = Task.update(req.params.id, updates);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    Task.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDailyReport = async (req, res) => {
  try {
    const userId = req.query.user_id || req.user.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Get tasks by status
    const completedTasks = Task.getByStatus(userId, 'completed').filter(t =>
      t.completed_at && t.completed_at.startsWith(date)
    );
    const inProgressTasks = Task.getByStatus(userId, 'in_progress');
    const blockedTasks = Task.getByStatus(userId, 'blocked');
    const waitingTasks = Task.getByStatus(userId, 'waiting_clarification');

    // Get time entries for the day
    const timeEntries = TimeEntry.getByUser(userId, date, date);
    const totalTime = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    res.json({
      date,
      completed_tasks: completedTasks,
      in_progress_tasks: inProgressTasks,
      blocked_tasks: blockedTasks,
      waiting_clarification_tasks: waitingTasks,
      total_time_seconds: Math.round(totalTime),
      total_time_hours: (totalTime / 3600).toFixed(2),
      time_entries: timeEntries
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Subtask controllers
export const getSubtasks = async (req, res) => {
  try {
    const parentTaskId = req.params.id;
    const subtasks = Task.getSubtasks(parentTaskId);
    res.json(subtasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTaskTree = async (req, res) => {
  try {
    const taskId = req.params.id;
    const tree = Task.getTaskTree(taskId);

    if (!tree) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSubtasksStats = async (req, res) => {
  try {
    const parentTaskId = req.params.id;
    const stats = Task.getSubtasksStats(parentTaskId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
