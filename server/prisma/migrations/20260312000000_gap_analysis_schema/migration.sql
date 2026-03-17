-- Gap Analysis Schema Migration
-- Adds: DocumentVersion, RiskTask models, User.hourlyRate, Risk probability/impact Int scale

-- 1. Add hourlyRate to users
ALTER TABLE [users] ADD [hourly_rate] DECIMAL(8, 2) NULL;

-- 2. Risk scale migration: String -> Int (1-5)
-- SQL Server requires separate batches for DDL + DML on new columns.
-- Using EXEC to force separate compilation contexts.

-- Step 2a: Add temporary Int columns
ALTER TABLE [risks] ADD [probability_new] INT;
ALTER TABLE [risks] ADD [impact_new] INT;

-- Step 2b: Convert existing values (separate batch via EXEC)
EXEC(N'UPDATE [risks] SET [probability_new] = CASE [probability]
  WHEN ''low'' THEN 1 WHEN ''medium'' THEN 3 WHEN ''high'' THEN 5
  ELSE 3 END');
EXEC(N'UPDATE [risks] SET [impact_new] = CASE [impact]
  WHEN ''low'' THEN 1 WHEN ''medium'' THEN 3 WHEN ''high'' THEN 5
  ELSE 3 END');

-- Step 2c: Drop default constraints then old String columns
-- SQL Server requires dropping named constraints before dropping columns
EXEC(N'
DECLARE @sql NVARCHAR(MAX) = N'''';
SELECT @sql += N''ALTER TABLE [risks] DROP CONSTRAINT ['' + dc.name + N''];''
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID(N''risks'')
  AND c.name IN (N''probability'', N''impact'');
EXEC sp_executesql @sql;
');
ALTER TABLE [risks] DROP COLUMN [probability];
ALTER TABLE [risks] DROP COLUMN [impact];

-- Step 2d: Rename new columns (separate EXEC for each)
EXEC sp_rename N'risks.probability_new', N'probability', N'COLUMN';
EXEC sp_rename N'risks.impact_new', N'impact', N'COLUMN';

-- Step 2e: Set defaults
EXEC(N'ALTER TABLE [risks] ADD DEFAULT 3 FOR [probability]');
EXEC(N'ALTER TABLE [risks] ADD DEFAULT 3 FOR [impact]');

-- 3. Create document_versions table
CREATE TABLE [document_versions] (
    [id] NVARCHAR(1000) NOT NULL,
    [document_id] NVARCHAR(1000) NOT NULL,
    [version] INT NOT NULL,
    [file_path] NVARCHAR(1000) NOT NULL,
    [file_size] INT NOT NULL,
    [mime_type] NVARCHAR(1000) NOT NULL,
    [note] NVARCHAR(MAX),
    [uploaded_by_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [document_versions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [document_versions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [document_versions_document_id_fkey] FOREIGN KEY ([document_id]) REFERENCES [documents]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [document_versions_uploaded_by_id_fkey] FOREIGN KEY ([uploaded_by_id]) REFERENCES [users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [document_versions_document_id_idx] ON [document_versions]([document_id]);

-- 4. Create risk_tasks table
CREATE TABLE [risk_tasks] (
    [id] NVARCHAR(1000) NOT NULL,
    [risk_id] NVARCHAR(1000) NOT NULL,
    [task_id] NVARCHAR(1000) NOT NULL,
    [link_type] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [risk_tasks_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [created_by_id] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [risk_tasks_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [risk_tasks_risk_id_task_id_key] UNIQUE NONCLUSTERED ([risk_id], [task_id]),
    CONSTRAINT [risk_tasks_risk_id_fkey] FOREIGN KEY ([risk_id]) REFERENCES [risks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [risk_tasks_task_id_fkey] FOREIGN KEY ([task_id]) REFERENCES [tasks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [risk_tasks_created_by_id_fkey] FOREIGN KEY ([created_by_id]) REFERENCES [users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX [risk_tasks_risk_id_idx] ON [risk_tasks]([risk_id]);
CREATE INDEX [risk_tasks_task_id_idx] ON [risk_tasks]([task_id]);
