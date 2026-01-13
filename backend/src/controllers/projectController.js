import Project from '../models/Project.js';
import { canModify, canDelete, canCreate } from '../utils/permissions.js';

export const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Check permission to create project
    if (!canCreate(req.user, 'project')) {
      return res.status(403).json({ error: 'Non hai i permessi per creare progetti' });
    }

    const project = Project.create({
      name,
      description,
      created_by: req.user.id
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProjects = async (req, res) => {
  try {
    const projects = Project.getWithTaskCount();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { name, description, archived } = req.body;

    const existingProject = Project.findById(req.params.id);
    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permission to modify project
    if (!canModify(req.user, existingProject, 'project')) {
      return res.status(403).json({ error: 'Non hai i permessi per modificare questo progetto' });
    }

    const project = Project.update(req.params.id, { name, description, archived });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const existingProject = Project.findById(req.params.id);
    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permission to delete project
    if (!canDelete(req.user, existingProject, 'project')) {
      return res.status(403).json({ error: 'Non hai i permessi per eliminare questo progetto' });
    }

    Project.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Management Dashboard controllers

export const getProjectsWithHealth = async (req, res) => {
  try {
    const projects = Project.getAllWithHealthScores();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProjectHealth = async (req, res) => {
  try {
    const health = Project.calculateHealthScore(req.params.id);
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProjectVelocity = async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 4;
    const velocity = Project.getProjectVelocity(req.params.id, weeks);
    res.json(velocity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTimeline = async (req, res) => {
  try {
    const timeline = Project.getTimeline();
    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
