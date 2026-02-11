BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'dipendente',
    [first_name] NVARCHAR(1000) NOT NULL,
    [last_name] NVARCHAR(1000) NOT NULL,
    [avatar_url] NVARCHAR(1000),
    [theme] NVARCHAR(1000) NOT NULL CONSTRAINT [users_theme_df] DEFAULT 'system',
    [is_active] BIT NOT NULL CONSTRAINT [users_is_active_df] DEFAULT 1,
    [is_deleted] BIT NOT NULL CONSTRAINT [users_is_deleted_df] DEFAULT 0,
    [last_login_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[refresh_tokens] (
    [id] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [refresh_tokens_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [refresh_tokens_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [refresh_tokens_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [dbo].[projects] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [projects_status_df] DEFAULT 'planning',
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [projects_priority_df] DEFAULT 'medium',
    [start_date] DATETIME2,
    [target_end_date] DATETIME2,
    [actual_end_date] DATETIME2,
    [budget] DECIMAL(15,2),
    [owner_id] NVARCHAR(1000) NOT NULL,
    [created_by_id] NVARCHAR(1000) NOT NULL,
    [template_id] NVARCHAR(1000),
    [is_deleted] BIT NOT NULL CONSTRAINT [projects_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [projects_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [projects_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [projects_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[project_templates] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [is_active] BIT NOT NULL CONSTRAINT [project_templates_is_active_df] DEFAULT 1,
    [phases] NVARCHAR(max) NOT NULL CONSTRAINT [project_templates_phases_df] DEFAULT '[]',
    [structure] NVARCHAR(max) NOT NULL CONSTRAINT [project_templates_structure_df] DEFAULT '{}',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [project_templates_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [project_templates_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tasks] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [task_type] NVARCHAR(1000) NOT NULL CONSTRAINT [tasks_task_type_df] DEFAULT 'task',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tasks_status_df] DEFAULT 'todo',
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [tasks_priority_df] DEFAULT 'medium',
    [project_id] NVARCHAR(1000),
    [assignee_id] NVARCHAR(1000),
    [created_by_id] NVARCHAR(1000) NOT NULL,
    [parent_task_id] NVARCHAR(1000),
    [start_date] DATETIME2,
    [due_date] DATETIME2,
    [estimated_hours] DECIMAL(8,2),
    [actual_hours] DECIMAL(8,2),
    [tags] NVARCHAR(max) CONSTRAINT [tasks_tags_df] DEFAULT '{}',
    [position] INT NOT NULL CONSTRAINT [tasks_position_df] DEFAULT 0,
    [blocked_reason] NVARCHAR(1000),
    [is_recurring] BIT NOT NULL CONSTRAINT [tasks_is_recurring_df] DEFAULT 0,
    [recurrence_pattern] NVARCHAR(max),
    [is_deleted] BIT NOT NULL CONSTRAINT [tasks_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [tasks_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [tasks_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tasks_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[task_dependencies] (
    [id] NVARCHAR(1000) NOT NULL,
    [predecessor_id] NVARCHAR(1000) NOT NULL,
    [successor_id] NVARCHAR(1000) NOT NULL,
    [dependency_type] NVARCHAR(1000) NOT NULL CONSTRAINT [task_dependencies_dependency_type_df] DEFAULT 'finish_to_start',
    [lag_days] INT NOT NULL CONSTRAINT [task_dependencies_lag_days_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_dependencies_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [task_dependencies_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [task_dependencies_predecessor_id_successor_id_key] UNIQUE NONCLUSTERED ([predecessor_id],[successor_id])
);

-- CreateTable
CREATE TABLE [dbo].[task_completions] (
    [id] NVARCHAR(1000) NOT NULL,
    [task_id] NVARCHAR(1000) NOT NULL,
    [completed_by] NVARCHAR(1000) NOT NULL,
    [completed_at] DATETIME2 NOT NULL CONSTRAINT [task_completions_completed_at_df] DEFAULT CURRENT_TIMESTAMP,
    [notes] NVARCHAR(1000),
    [is_deleted] BIT NOT NULL CONSTRAINT [task_completions_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [task_completions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [task_completions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[time_entries] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [task_id] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [start_time] DATETIME2 NOT NULL,
    [end_time] DATETIME2,
    [duration] INT,
    [is_running] BIT NOT NULL CONSTRAINT [time_entries_is_running_df] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [time_entries_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [time_entries_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [time_entries_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[comments] (
    [id] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [task_id] NVARCHAR(1000) NOT NULL,
    [parent_id] NVARCHAR(1000),
    [is_internal] BIT NOT NULL CONSTRAINT [comments_is_internal_df] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [comments_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [comments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [comments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[risks] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [project_id] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL CONSTRAINT [risks_category_df] DEFAULT 'technical',
    [probability] NVARCHAR(1000) NOT NULL CONSTRAINT [risks_probability_df] DEFAULT 'medium',
    [impact] NVARCHAR(1000) NOT NULL CONSTRAINT [risks_impact_df] DEFAULT 'medium',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [risks_status_df] DEFAULT 'open',
    [mitigation_plan] NVARCHAR(1000),
    [owner_id] NVARCHAR(1000),
    [created_by_id] NVARCHAR(1000) NOT NULL,
    [is_deleted] BIT NOT NULL CONSTRAINT [risks_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [risks_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [risks_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [risks_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[documents] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [project_id] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL CONSTRAINT [documents_type_df] DEFAULT 'design_input',
    [file_path] NVARCHAR(1000),
    [file_size] INT,
    [mime_type] NVARCHAR(1000),
    [version] INT NOT NULL CONSTRAINT [documents_version_df] DEFAULT 1,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [documents_status_df] DEFAULT 'draft',
    [created_by_id] NVARCHAR(1000) NOT NULL,
    [approved_by_id] NVARCHAR(1000),
    [approved_at] DATETIME2,
    [is_deleted] BIT NOT NULL CONSTRAINT [documents_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [documents_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [documents_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [documents_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[notifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [data] NVARCHAR(max),
    [is_read] BIT NOT NULL CONSTRAINT [notifications_is_read_df] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [notifications_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [notifications_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [entity_id] NVARCHAR(1000) NOT NULL,
    [old_data] NVARCHAR(max),
    [new_data] NVARCHAR(max),
    [ip_address] NVARCHAR(1000),
    [user_agent] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [audit_logs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[user_inputs] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [category] NVARCHAR(1000) NOT NULL CONSTRAINT [user_inputs_category_df] DEFAULT 'other',
    [priority] NVARCHAR(1000) NOT NULL CONSTRAINT [user_inputs_priority_df] DEFAULT 'medium',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [user_inputs_status_df] DEFAULT 'pending',
    [created_by_id] NVARCHAR(1000) NOT NULL,
    [processed_by_id] NVARCHAR(1000),
    [processed_at] DATETIME2,
    [resolution_type] NVARCHAR(1000),
    [resolution_notes] NVARCHAR(1000),
    [resolved_at] DATETIME2,
    [converted_task_id] NVARCHAR(1000),
    [converted_project_id] NVARCHAR(1000),
    [attachments] NVARCHAR(max) NOT NULL CONSTRAINT [user_inputs_attachments_df] DEFAULT '[]',
    [metadata] NVARCHAR(max) NOT NULL CONSTRAINT [user_inputs_metadata_df] DEFAULT '{}',
    [is_deleted] BIT NOT NULL CONSTRAINT [user_inputs_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [user_inputs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [user_inputs_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [user_inputs_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[weekly_reports] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [week_number] INT NOT NULL,
    [year] INT NOT NULL,
    [week_start_date] DATETIME2 NOT NULL,
    [week_end_date] DATETIME2 NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [report_data] NVARCHAR(max) NOT NULL CONSTRAINT [weekly_reports_report_data_df] DEFAULT '{}',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [weekly_reports_status_df] DEFAULT 'pending',
    [generated_at] DATETIME2,
    [pdf_path] NVARCHAR(1000),
    [is_deleted] BIT NOT NULL CONSTRAINT [weekly_reports_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [weekly_reports_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [weekly_reports_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [weekly_reports_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[notes] (
    [id] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [entity_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [parent_id] NVARCHAR(1000),
    [is_internal] BIT NOT NULL CONSTRAINT [notes_is_internal_df] DEFAULT 0,
    [is_deleted] BIT NOT NULL CONSTRAINT [notes_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [notes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [notes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[attachments] (
    [id] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [entity_id] NVARCHAR(1000) NOT NULL,
    [file_name] NVARCHAR(1000) NOT NULL,
    [file_path] NVARCHAR(1000) NOT NULL,
    [file_size] INT NOT NULL,
    [mime_type] NVARCHAR(1000) NOT NULL,
    [uploaded_by_id] NVARCHAR(1000) NOT NULL,
    [is_deleted] BIT NOT NULL CONSTRAINT [attachments_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [attachments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [attachments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [projects_owner_id_idx] ON [dbo].[projects]([owner_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [projects_status_idx] ON [dbo].[projects]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [projects_is_deleted_idx] ON [dbo].[projects]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_project_id_idx] ON [dbo].[tasks]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_assignee_id_idx] ON [dbo].[tasks]([assignee_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_status_idx] ON [dbo].[tasks]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_task_type_idx] ON [dbo].[tasks]([task_type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_is_deleted_idx] ON [dbo].[tasks]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_parent_task_id_idx] ON [dbo].[tasks]([parent_task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_start_date_idx] ON [dbo].[tasks]([start_date]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tasks_is_recurring_idx] ON [dbo].[tasks]([is_recurring]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_dependencies_predecessor_id_idx] ON [dbo].[task_dependencies]([predecessor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_dependencies_successor_id_idx] ON [dbo].[task_dependencies]([successor_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_completions_task_id_idx] ON [dbo].[task_completions]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_completions_completed_by_idx] ON [dbo].[task_completions]([completed_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [task_completions_completed_at_idx] ON [dbo].[task_completions]([completed_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [time_entries_user_id_idx] ON [dbo].[time_entries]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [time_entries_task_id_idx] ON [dbo].[time_entries]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [time_entries_is_running_idx] ON [dbo].[time_entries]([is_running]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [time_entries_is_deleted_idx] ON [dbo].[time_entries]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [comments_task_id_idx] ON [dbo].[comments]([task_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [comments_is_deleted_idx] ON [dbo].[comments]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [risks_project_id_idx] ON [dbo].[risks]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [risks_status_idx] ON [dbo].[risks]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [risks_is_deleted_idx] ON [dbo].[risks]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [documents_project_id_idx] ON [dbo].[documents]([project_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [documents_status_idx] ON [dbo].[documents]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [documents_is_deleted_idx] ON [dbo].[documents]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_user_id_is_read_idx] ON [dbo].[notifications]([user_id], [is_read]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_is_deleted_idx] ON [dbo].[notifications]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_user_id_idx] ON [dbo].[audit_logs]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_entity_type_entity_id_idx] ON [dbo].[audit_logs]([entity_type], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_created_at_idx] ON [dbo].[audit_logs]([created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [user_inputs_status_idx] ON [dbo].[user_inputs]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [user_inputs_category_idx] ON [dbo].[user_inputs]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [user_inputs_priority_idx] ON [dbo].[user_inputs]([priority]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [user_inputs_created_by_id_idx] ON [dbo].[user_inputs]([created_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [user_inputs_processed_by_id_idx] ON [dbo].[user_inputs]([processed_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [user_inputs_is_deleted_idx] ON [dbo].[user_inputs]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [weekly_reports_user_id_idx] ON [dbo].[weekly_reports]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [weekly_reports_week_number_year_idx] ON [dbo].[weekly_reports]([week_number], [year]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [weekly_reports_is_deleted_idx] ON [dbo].[weekly_reports]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notes_entity_type_entity_id_idx] ON [dbo].[notes]([entity_type], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notes_user_id_idx] ON [dbo].[notes]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notes_is_deleted_idx] ON [dbo].[notes]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [attachments_entity_type_entity_id_idx] ON [dbo].[attachments]([entity_type], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [attachments_uploaded_by_id_idx] ON [dbo].[attachments]([uploaded_by_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [attachments_is_deleted_idx] ON [dbo].[attachments]([is_deleted]);

-- AddForeignKey
ALTER TABLE [dbo].[refresh_tokens] ADD CONSTRAINT [refresh_tokens_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[projects] ADD CONSTRAINT [projects_owner_id_fkey] FOREIGN KEY ([owner_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[projects] ADD CONSTRAINT [projects_created_by_id_fkey] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[projects] ADD CONSTRAINT [projects_template_id_fkey] FOREIGN KEY ([template_id]) REFERENCES [dbo].[project_templates]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_assignee_id_fkey] FOREIGN KEY ([assignee_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_created_by_id_fkey] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tasks] ADD CONSTRAINT [tasks_parent_task_id_fkey] FOREIGN KEY ([parent_task_id]) REFERENCES [dbo].[tasks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[task_dependencies] ADD CONSTRAINT [task_dependencies_predecessor_id_fkey] FOREIGN KEY ([predecessor_id]) REFERENCES [dbo].[tasks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[task_dependencies] ADD CONSTRAINT [task_dependencies_successor_id_fkey] FOREIGN KEY ([successor_id]) REFERENCES [dbo].[tasks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[task_completions] ADD CONSTRAINT [task_completions_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[task_completions] ADD CONSTRAINT [task_completions_completed_by_fkey] FOREIGN KEY ([completed_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[time_entries] ADD CONSTRAINT [time_entries_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[time_entries] ADD CONSTRAINT [time_entries_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[comments] ADD CONSTRAINT [comments_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[comments] ADD CONSTRAINT [comments_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [dbo].[tasks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[comments] ADD CONSTRAINT [comments_parent_id_fkey] FOREIGN KEY ([parent_id]) REFERENCES [dbo].[comments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[risks] ADD CONSTRAINT [risks_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[risks] ADD CONSTRAINT [risks_owner_id_fkey] FOREIGN KEY ([owner_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[risks] ADD CONSTRAINT [risks_created_by_id_fkey] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[documents] ADD CONSTRAINT [documents_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[projects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[documents] ADD CONSTRAINT [documents_created_by_id_fkey] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[documents] ADD CONSTRAINT [documents_approved_by_id_fkey] FOREIGN KEY ([approved_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_inputs] ADD CONSTRAINT [user_inputs_created_by_id_fkey] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_inputs] ADD CONSTRAINT [user_inputs_processed_by_id_fkey] FOREIGN KEY ([processed_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_inputs] ADD CONSTRAINT [user_inputs_converted_task_id_fkey] FOREIGN KEY ([converted_task_id]) REFERENCES [dbo].[tasks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_inputs] ADD CONSTRAINT [user_inputs_converted_project_id_fkey] FOREIGN KEY ([converted_project_id]) REFERENCES [dbo].[projects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[weekly_reports] ADD CONSTRAINT [weekly_reports_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[notes] ADD CONSTRAINT [notes_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[notes] ADD CONSTRAINT [notes_parent_id_fkey] FOREIGN KEY ([parent_id]) REFERENCES [dbo].[notes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[attachments] ADD CONSTRAINT [attachments_uploaded_by_id_fkey] FOREIGN KEY ([uploaded_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
