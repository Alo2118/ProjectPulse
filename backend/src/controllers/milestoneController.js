import Milestone from '../models/Milestone.js';
import Project from '../models/Project.js';
import { canModify, canDelete, canCreate } from '../utils/permissions.js';

export const createMilestone = async (req, res) => {
  try {
    const { name, description, project_id, due_date } = req.body;

    if (!name || !project_id) {
      return res.status(400).json({ error: 'Name and project_id are required' });
    }

    // Check permission based on project ownership
    const project = Project.findById(project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!canCreate(req.user, 'milestone')) {
      return res.status(403).json({ error: 'Non hai i permessi per creare milestone' });
    }

    // Also check if user can modify the project
    if (!canModify(req.user, project, 'project')) {
      return res.status(403).json({ error: 'Non hai i permessi per modificare questo progetto' });
    }

    const milestone = Milestone.create({ name, description, project_id, due_date });
    res.status(201).json(milestone);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMilestones = async (req, res) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const milestones = Milestone.getByProject(parseInt(project_id));
    res.json(milestones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMilestone = async (req, res) => {
  try {
    const milestone = Milestone.findById(req.params.id);

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json(milestone);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const existingMilestone = Milestone.findById(req.params.id);
    if (!existingMilestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Check permission based on project ownership
    const project = Project.findById(existingMilestone.project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!canModify(req.user, project, 'project')) {
      return res.status(403).json({ error: 'Non hai i permessi per modificare questo progetto' });
    }

    const updates = { ...req.body };

    // Auto-set completed_at when status changes to completed
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    const milestone = Milestone.update(req.params.id, updates);
    res.json(milestone);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMilestone = async (req, res) => {
  try {
    const existingMilestone = Milestone.findById(req.params.id);
    if (!existingMilestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Check permission based on project ownership
    const project = Project.findById(existingMilestone.project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!canDelete(req.user, project, 'project')) {
      return res.status(403).json({ error: 'Non hai i permessi per modificare questo progetto' });
    }

    Milestone.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const completeMilestone = async (req, res) => {
  try {
    const milestone = Milestone.complete(req.params.id);
    res.json(milestone);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
