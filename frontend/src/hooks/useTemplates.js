import { useState, useEffect } from 'react';
import { PROJECT_TEMPLATES, TASK_TEMPLATES, MILESTONE_TEMPLATES } from '../config/templates';

const STORAGE_KEY = 'projectpulse_custom_templates';

export function useTemplates(type = 'task') {
  const [customTemplates, setCustomTemplates] = useState([]);

  useEffect(() => {
    loadCustomTemplates();
  }, []);

  const loadCustomTemplates = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const all = JSON.parse(stored);
        setCustomTemplates(all[type] || []);
      }
    } catch (error) {
      console.error('Error loading custom templates:', error);
    }
  };

  const saveCustomTemplate = (template) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const all = stored ? JSON.parse(stored) : { project: [], task: [], milestone: [] };

      // Add unique ID if not present
      if (!template.id) {
        template.id = `custom_${Date.now()}`;
        template.custom = true;
      }

      // Check if updating existing template
      const existingIndex = all[type].findIndex(t => t.id === template.id);
      if (existingIndex >= 0) {
        all[type][existingIndex] = template;
      } else {
        all[type].push(template);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setCustomTemplates(all[type]);
      return template;
    } catch (error) {
      console.error('Error saving custom template:', error);
      throw error;
    }
  };

  const deleteCustomTemplate = (templateId) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const all = stored ? JSON.parse(stored) : { project: [], task: [], milestone: [] };

      all[type] = all[type].filter(t => t.id !== templateId);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setCustomTemplates(all[type]);
    } catch (error) {
      console.error('Error deleting custom template:', error);
      throw error;
    }
  };

  // Get all templates (built-in + custom)
  const getAllTemplates = () => {
    let builtIn = [];

    switch (type) {
      case 'project':
        builtIn = PROJECT_TEMPLATES;
        break;
      case 'task':
        builtIn = TASK_TEMPLATES;
        break;
      case 'milestone':
        builtIn = MILESTONE_TEMPLATES;
        break;
    }

    // Always put "custom" (empty) template first, then custom templates, then built-in
    const customOption = builtIn[0]; // First one is always the "custom" option
    const otherBuiltIn = builtIn.slice(1);

    return [customOption, ...customTemplates, ...otherBuiltIn];
  };

  return {
    customTemplates,
    getAllTemplates,
    saveCustomTemplate,
    deleteCustomTemplate,
    refresh: loadCustomTemplates
  };
}
