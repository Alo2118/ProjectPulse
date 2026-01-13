import Template from '../models/Template.js';
import { canModify, canDelete, canCreate } from '../utils/permissions.js';

export const createTemplate = async (req, res) => {
  try {
    const { name, description, type, icon, data, is_public } = req.body;

    if (!name || !type || !data) {
      return res.status(400).json({ error: 'Nome, tipo e dati sono obbligatori' });
    }

    if (!['task', 'project', 'milestone'].includes(type)) {
      return res.status(400).json({ error: 'Tipo non valido' });
    }

    // Check permission to create template
    if (!canCreate(req.user, 'template')) {
      return res.status(403).json({ error: 'Non hai i permessi per creare template' });
    }

    const template = Template.create({
      name,
      description,
      type,
      icon,
      data,
      created_by: req.user.id,
      is_public: is_public || false
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getTemplates = async (req, res) => {
  try {
    const { type, is_public, all } = req.query;

    const filters = {
      user_id: req.user.id,
      all: all === 'true'
    };

    if (type) filters.type = type;
    if (is_public !== undefined) filters.is_public = is_public === 'true';

    const templates = Template.getAll(filters);
    res.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getTemplate = async (req, res) => {
  try {
    const template = Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }

    // Check if user has access to this template
    if (!template.is_public && template.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const existingTemplate = Template.findById(id);

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template non trovato' });
    }

    // Check permission to modify template
    if (!canModify(req.user, existingTemplate, 'template')) {
      return res.status(403).json({ error: 'Non hai i permessi per modificare questo template' });
    }

    const template = Template.update(id, req.body);
    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const existingTemplate = Template.findById(id);

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template non trovato' });
    }

    // Check permission to delete template
    if (!canDelete(req.user, existingTemplate, 'template')) {
      return res.status(403).json({ error: 'Non hai i permessi per eliminare questo template' });
    }

    Template.delete(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
};
