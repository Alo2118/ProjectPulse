import Request from '../models/Request.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';

// Get all requests with filters and pagination
export const getRequests = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      type: req.query.type,
      source: req.query.source,
      assigned_to: req.query.assigned_to,
      project_id: req.query.project_id,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const requests = Request.getAll(filters);
    const total = Request.getCount(filters);

    res.json({
      data: requests,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single request by ID
export const getRequestById = async (req, res) => {
  try {
    const request = Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new request
export const createRequest = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      source,
      source_contact,
      priority,
      project_id,
      assigned_to,
      due_date,
      tags
    } = req.body;

    if (!title || !description || !type || !source) {
      return res.status(400).json({
        error: 'Titolo, descrizione, tipo e provenienza sono obbligatori'
      });
    }

    const request = Request.create({
      title,
      description,
      type,
      source,
      source_contact,
      priority: priority || 'normal',
      project_id,
      assigned_to,
      due_date,
      tags,
      created_by: req.user.id
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update request
export const updateRequest = async (req, res) => {
  try {
    const request = Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    const updated = Request.update(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Review request (approve/reject)
export const reviewRequest = async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!['approved', 'rejected', 'reviewing'].includes(status)) {
      return res.status(400).json({
        error: 'Stato non valido. Usa: approved, rejected, reviewing'
      });
    }

    const request = Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    const updated = Request.review(req.params.id, req.user.id, status, notes);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Convert request to task
export const convertToTask = async (req, res) => {
  try {
    const request = Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    const {
      title,
      description,
      project_id,
      milestone_id,
      assigned_to,
      priority,
      deadline
    } = req.body;

    // Create task from request
    const task = Task.create({
      title: title || request.title,
      description: description || request.description,
      project_id: project_id || request.project_id,
      milestone_id,
      assigned_to: assigned_to || request.assigned_to,
      created_by: req.user.id,
      priority: priority || request.priority,
      deadline,
      status: 'todo'
    });

    // Update request to mark as converted
    Request.convertToTask(req.params.id, task.id);

    res.json({
      message: 'Richiesta convertita in task con successo',
      task,
      request: Request.findById(req.params.id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Convert request to project
export const convertToProject = async (req, res) => {
  try {
    const request = Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    const {
      name,
      description
    } = req.body;

    // Create project from request
    const project = Project.create({
      name: name || request.title,
      description: description || request.description,
      created_by: req.user.id
    });

    // Update request to mark as converted
    Request.convertToProject(req.params.id, project.id);

    res.json({
      message: 'Richiesta convertita in progetto con successo',
      project,
      request: Request.findById(req.params.id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete request
export const deleteRequest = async (req, res) => {
  try {
    const request = Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Richiesta non trovata' });
    }

    // Only allow admins or the creator to delete
    if (req.user.role !== 'amministratore' && request.created_by !== req.user.id) {
      return res.status(403).json({
        error: 'Non hai i permessi per eliminare questa richiesta'
      });
    }

    Request.delete(req.params.id);
    res.json({ message: 'Richiesta eliminata con successo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get statistics
export const getStats = async (req, res) => {
  try {
    const byStatus = Request.getStatsByStatus();
    const byType = Request.getStatsByType();

    res.json({
      byStatus,
      byType
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
