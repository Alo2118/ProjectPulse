import { useState, useEffect } from 'react';
import { templatesApi } from '../services/api';

const STORAGE_KEY = 'projectpulse_custom_templates';
const MIGRATION_KEY = 'projectpulse_templates_migrated';

export function useTemplates(type = 'task') {
  const [customTemplates, setCustomTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, [type]);

  const migrateFromLocalStorage = async () => {
    // Check if already migrated
    if (localStorage.getItem(MIGRATION_KEY)) {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        return;
      }

      const all = JSON.parse(stored);
      const templates = all[type] || [];

      console.log(`🔄 Migrating ${templates.length} ${type} templates to database...`);

      // Migrate each template
      for (const template of templates) {
        try {
          await templatesApi.create({
            name: template.name,
            description: template.description,
            type: type,
            icon: template.icon || '📋',
            data: template.data,
            is_public: false
          });
          console.log(`✅ Migrated: ${template.name}`);
        } catch (error) {
          // Skip if already exists
          if (!error.response?.data?.error?.includes('già')) {
            console.error(`❌ Failed to migrate: ${template.name}`, error);
          }
        }
      }

      // Mark as migrated
      localStorage.setItem(MIGRATION_KEY, 'true');
      console.log('✅ Migration completed');
    } catch (error) {
      console.error('Migration error:', error);
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // Migrate from localStorage first time
      await migrateFromLocalStorage();

      // Load from database
      const response = await templatesApi.getAll({ type });
      setCustomTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      // Fallback to localStorage if API fails
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const all = JSON.parse(stored);
          setCustomTemplates(all[type] || []);
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveCustomTemplate = async (template) => {
    try {
      let saved;

      if (template.id && !template.id.toString().startsWith('custom_')) {
        // Update existing template
        const response = await templatesApi.update(template.id, {
          name: template.name,
          description: template.description,
          icon: template.icon,
          data: template.data,
          is_public: template.is_public || false
        });
        saved = response.data;
      } else {
        // Create new template
        const response = await templatesApi.create({
          name: template.name,
          description: template.description,
          type: type,
          icon: template.icon || '📋',
          data: template.data,
          is_public: template.is_public || false
        });
        saved = response.data;
      }

      // Refresh list
      await loadTemplates();
      return saved;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  };

  const deleteCustomTemplate = async (templateId) => {
    try {
      await templatesApi.delete(templateId);
      // Refresh list
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  };

  // Get all templates (database only)
  const getAllTemplates = () => {
    // Create the "custom" (empty) template option
    let customOption;
    switch (type) {
      case 'project':
        customOption = {
          id: 'custom',
          name: 'Progetto Personalizzato',
          description: 'Crea un progetto da zero',
          icon: '📝',
          data: null
        };
        break;
      case 'task':
        customOption = {
          id: 'custom',
          name: 'Task Personalizzato',
          description: 'Crea un task da zero',
          icon: '📋',
          data: null
        };
        break;
      case 'milestone':
        customOption = {
          id: 'custom',
          name: 'Milestone Personalizzata',
          description: 'Crea una milestone da zero',
          icon: '🎯',
          data: null
        };
        break;
      default:
        customOption = {
          id: 'custom',
          name: 'Personalizzato',
          description: 'Crea da zero',
          icon: '📝',
          data: null
        };
    }

    // Parse JSON data for templates from DB
    const templatesWithParsedData = customTemplates.map(t => ({
      ...t,
      data: typeof t.data === 'string' ? JSON.parse(t.data) : t.data
    }));

    // Return custom option first, then all DB templates
    return [customOption, ...templatesWithParsedData];
  };

  return {
    customTemplates,
    getAllTemplates,
    saveCustomTemplate,
    deleteCustomTemplate,
    refresh: loadTemplates,
    loading
  };
}
