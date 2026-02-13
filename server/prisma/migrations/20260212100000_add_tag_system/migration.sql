BEGIN TRY

BEGIN TRAN;

-- Drop default constraint on tags column before dropping the column
ALTER TABLE [dbo].[tasks] DROP CONSTRAINT [tasks_tags_df];

-- AlterTable
ALTER TABLE [dbo].[tasks] DROP COLUMN [tags];

-- CreateTable
CREATE TABLE [dbo].[tags] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [color] NVARCHAR(1000) NOT NULL CONSTRAINT [tags_color_df] DEFAULT '#6B7280',
    [created_by_id] NVARCHAR(1000) NOT NULL,
    [is_deleted] BIT NOT NULL CONSTRAINT [tags_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [tags_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [tags_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tags_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[tag_assignments] (
    [id] NVARCHAR(1000) NOT NULL,
    [tag_id] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [entity_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [tag_assignments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tag_assignments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tag_assignments_tag_id_entity_type_entity_id_key] UNIQUE NONCLUSTERED ([tag_id],[entity_type],[entity_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tags_name_idx] ON [dbo].[tags]([name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tags_is_deleted_idx] ON [dbo].[tags]([is_deleted]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tag_assignments_entity_type_entity_id_idx] ON [dbo].[tag_assignments]([entity_type], [entity_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tag_assignments_tag_id_idx] ON [dbo].[tag_assignments]([tag_id]);

-- AddForeignKey
ALTER TABLE [dbo].[tags] ADD CONSTRAINT [tags_created_by_id_fkey] FOREIGN KEY ([created_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tag_assignments] ADD CONSTRAINT [tag_assignments_tag_id_fkey] FOREIGN KEY ([tag_id]) REFERENCES [dbo].[tags]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
