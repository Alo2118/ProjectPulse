-- Phase System + Sort Order migration
-- Adds: project sort_order, phase fields on projects, phaseKey on tasks, domain on workflow_templates

-- Step 1: Add sort_order to projects
ALTER TABLE [dbo].[projects] ADD [sort_order] INT NOT NULL CONSTRAINT [DF_projects_sort_order] DEFAULT 0;

-- Step 2: Add phase fields to projects
ALTER TABLE [dbo].[projects] ADD [phase_template_id] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[projects] ADD [phases] NVARCHAR(max) NULL;
ALTER TABLE [dbo].[projects] ADD [current_phase_key] NVARCHAR(1000) NULL;

-- Step 3: Add phase_key to tasks
ALTER TABLE [dbo].[tasks] ADD [phase_key] NVARCHAR(1000) NULL;

-- Step 4: Add domain to workflow_templates
ALTER TABLE [dbo].[workflow_templates] ADD [domain] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_workflow_templates_domain] DEFAULT 'task';

-- Step 5: Create indexes (separate statements, columns exist now)
CREATE NONCLUSTERED INDEX [projects_sort_order_idx] ON [dbo].[projects]([sort_order]);

-- Step 6: Add foreign key for phase_template_id -> workflow_templates
ALTER TABLE [dbo].[projects] ADD CONSTRAINT [projects_phase_template_id_fkey] FOREIGN KEY ([phase_template_id]) REFERENCES [dbo].[workflow_templates]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
