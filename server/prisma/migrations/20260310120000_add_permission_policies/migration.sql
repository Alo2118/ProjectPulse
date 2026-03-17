BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[permission_policies] (
    [id] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(50) NOT NULL,
    [domain] NVARCHAR(50) NOT NULL,
    [action] NVARCHAR(50) NOT NULL,
    [allowed] BIT NOT NULL CONSTRAINT [permission_policies_allowed_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [permission_policies_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [permission_policies_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [permission_policies_role_domain_action_key] UNIQUE NONCLUSTERED ([role], [domain], [action])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
