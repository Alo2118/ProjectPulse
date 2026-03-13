-- UX Overhaul: DB Migration
-- Task 1: TagAssignment.createdById + UserInputReply + User.notificationPreferences
-- Date: 2026-03-13

-- 1. Add createdById to TagAssignment (nullable for backward compat)
ALTER TABLE tag_assignments ADD created_by_id NVARCHAR(450) NULL;
ALTER TABLE tag_assignments ADD CONSTRAINT FK_tag_assignments_createdBy FOREIGN KEY (created_by_id) REFERENCES users(id);

-- 2. Add notificationPreferences to User
ALTER TABLE users ADD notification_preferences NVARCHAR(MAX) NULL;

-- 3. Create UserInputReply table
CREATE TABLE user_input_replies (
  id NVARCHAR(450) NOT NULL PRIMARY KEY DEFAULT NEWID(),
  input_id NVARCHAR(450) NOT NULL,
  user_id NVARCHAR(450) NOT NULL,
  content NVARCHAR(MAX) NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  CONSTRAINT FK_user_input_replies_input FOREIGN KEY (input_id) REFERENCES user_inputs(id),
  CONSTRAINT FK_user_input_replies_user FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IX_user_input_replies_inputId ON user_input_replies(input_id);
