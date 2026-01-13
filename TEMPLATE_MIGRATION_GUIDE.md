# Template System Migration Guide

## 🎯 Overview

ProjectPulse has migrated from **hardcoded templates** to a **database-driven template system**. All templates are now:
- ✅ Stored in the database
- ✅ Editable via the `/templates` UI
- ✅ Manageable without code changes
- ✅ Customizable by users

## 🚀 Setup (First Time Only)

### Step 1: Seed Initial Templates

Run this command **once** in the backend directory to populate the database with standard templates:

```bash
cd backend
npm run seed-templates
```

This will create:
- **4 Project Templates**: Fissatore Ortopedico, Protesi Articolare, Strumentario Chirurgico, Ricerca & Innovazione
- **8 Task Templates**: Analisi Biomeccanica, Prototipazione, Test Meccanici, etc.
- **4 Milestone Templates**: Fase Design, Fase Prototipazione, Fase Validazione, Fase Certificazione

**Note**: The seed script is idempotent - it skips templates that already exist, so you can run it multiple times safely.

### Step 2: Verify Templates

1. Start the application
2. Navigate to `/templates` in the UI
3. Verify all templates are loaded correctly
4. Check each tab (Progetti, Task, Milestone)

## 📝 Managing Templates

### Via UI (/templates page)

**Create New Template:**
1. Go to `/templates`
2. Select the tab (Progetti, Task, or Milestone)
3. Click "Nuovo Template"
4. Fill in the form
5. Check "Template pubblico" to share with all users
6. Click "Crea Template"

**Edit Template:**
1. Find the template in the grid
2. Click "Modifica" (only for templates you created)
3. Update fields
4. Click "Salva Modifiche"

**Duplicate Template:**
1. Find the template
2. Click the copy icon (📋)
3. Modify as needed
4. Save as new template

**Delete Template:**
1. Find the template
2. Click the trash icon (🗑️)
3. Confirm deletion

### Template Structure

#### Project Template
```json
{
  "name": "Dispositivo Medico",
  "description": "Template per dispositivi medici",
  "icon": "🏥",
  "type": "project",
  "data": {
    "description": "Descrizione dettagliata",
    "milestones": [
      {
        "name": "Fase 1",
        "description": "...",
        "duration_days": 30,
        "tasks": ["task_id_1", "task_id_2"]
      }
    ]
  }
}
```

#### Task Template
```json
{
  "name": "Validazione",
  "description": "Task di validazione",
  "icon": "✓",
  "type": "task",
  "data": {
    "description": "Descrizione task",
    "priority": "high",
    "estimated_hours": 40,
    "subtasks": [
      "Sottotask 1",
      "Sottotask 2"
    ]
  }
}
```

#### Milestone Template
```json
{
  "name": "Fase Certificazione",
  "description": "Certificazione CE",
  "icon": "📜",
  "type": "milestone",
  "data": {
    "description": "Descrizione milestone",
    "duration_days": 45,
    "tasks": ["cert_task_1"]
  }
}
```

## 🔧 Technical Details

### Database Schema

Templates are stored in the `templates` table:

```sql
CREATE TABLE templates (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK(type IN ('task', 'project', 'milestone')),
  icon TEXT DEFAULT '📋',
  data TEXT NOT NULL,  -- JSON string
  created_by INTEGER,
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME
);
```

### API Endpoints

- `GET /api/templates` - Get all templates (public + user's private)
- `GET /api/templates/:id` - Get single template
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

Query parameters:
- `?type=project` - Filter by type
- `?is_public=true` - Filter public templates only

### Frontend Integration

**Load templates in components:**

```javascript
import { useTemplates } from '../hooks/useTemplates';

function MyComponent() {
  const { getAllTemplates, loading } = useTemplates('project');
  const templates = getAllTemplates();
  // templates[0] is always the "custom" (empty) option
  // templates[1...n] are database templates
}
```

**Direct API calls:**

```javascript
import { templatesApi } from '../services/api';

// Get all task templates
const response = await templatesApi.getAll({ type: 'task' });
const templates = response.data;

// Create new template
await templatesApi.create({
  name: 'My Template',
  type: 'task',
  icon: '📋',
  data: { ... },
  is_public: false
});
```

## 🔄 Migration from Old System

### What Changed

**Before:**
- Templates hardcoded in `frontend/src/config/templates.js`
- Required code changes to modify
- ~300 lines of template definitions

**After:**
- Templates in database
- Editable via UI
- `templates.js` only contains SMART_DEFAULTS (~50 lines)

### Backward Compatibility

❌ **Breaking Change**: Code importing `PROJECT_TEMPLATES`, `TASK_TEMPLATES`, or `MILESTONE_TEMPLATES` will fail.

**Fix:** Use `useTemplates` hook or `templatesApi` instead:

```javascript
// ❌ Old way (broken)
import { PROJECT_TEMPLATES } from '../config/templates';
const templates = PROJECT_TEMPLATES;

// ✅ New way
import { useTemplates } from '../hooks/useTemplates';
const { getAllTemplates } = useTemplates('project');
const templates = getAllTemplates();
```

## 📦 Deployment

### Backend (Render)

1. Push code to repository
2. Render auto-deploys
3. **SSH into Render** or use Render Shell:
   ```bash
   cd /opt/render/project/src/backend
   npm run seed-templates
   ```
4. Verify templates via API: `curl https://your-app.onrender.com/api/templates`

### Frontend (Vercel)

1. Push code to repository
2. Vercel auto-deploys
3. No additional steps needed
4. UI automatically loads templates from backend

## 🐛 Troubleshooting

### "No templates found"

**Problem:** Database is empty, seed script not run.

**Solution:**
```bash
cd backend
npm run seed-templates
```

### "Template data is a string"

**Problem:** Frontend trying to use data as object when it's JSON string.

**Solution:** The `useTemplates` hook automatically parses JSON. If using `templatesApi` directly:

```javascript
const template = response.data;
const data = typeof template.data === 'string'
  ? JSON.parse(template.data)
  : template.data;
```

### "Cannot find TASK_TEMPLATES"

**Problem:** Old code still importing hardcoded templates.

**Solution:** Update to use `useTemplates` hook or `templatesApi`.

### "Permission denied when editing template"

**Problem:** Only template creator can edit/delete their templates.

**Solution:**
- Ask template creator to edit it
- Duplicate the template (you'll own the copy)
- Admin can edit any template (future feature)

## 📚 Additional Resources

- **UI Guide:** See `/templates` page for visual interface
- **API Documentation:** `backend/src/routes/templates.js`
- **Hook Documentation:** `frontend/src/hooks/useTemplates.js`
- **Seed Script:** `backend/scripts/seed-templates.js`

## 🎉 Benefits

1. **User Empowerment**: Create and modify templates without developer intervention
2. **Flexibility**: Each user can create private templates or share public ones
3. **Maintainability**: Single source of truth in database
4. **Extensibility**: Easy to add new fields or template types
5. **Collaboration**: Teams can share and reuse templates

## 🔮 Future Enhancements

- [ ] Admin override for editing any template
- [ ] Template import/export (JSON files)
- [ ] Template versioning
- [ ] Template categories/tags
- [ ] Template usage statistics
- [ ] Template sharing between organizations
