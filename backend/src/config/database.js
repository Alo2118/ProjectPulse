import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTables = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('dipendente', 'direzione', 'amministratore')),
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', '+1 hour'))
    )
  `);

  // Migration: Update users table structure
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const columns = tableInfo.map(col => col.name);

    const needsMigration =
      columns.includes('name') && !columns.includes('first_name') ||
      !columns.includes('active');

    if (needsMigration) {
      console.log('🔄 Migrating users table to new structure...');

      // Temporarily disable foreign keys for migration
      db.pragma('foreign_keys = OFF');

      // Use a transaction for safety
      db.exec('BEGIN TRANSACTION');

      try {
        // Create new table with updated structure
        db.exec(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('dipendente', 'direzione', 'amministratore')),
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now', '+1 hour'))
          )
        `);

        // Migrate data with name splitting
        const oldUsers = db.prepare('SELECT * FROM users').all();
        const insertStmt = db.prepare(`
          INSERT INTO users_new (id, email, password, first_name, last_name, role, active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        `);

        for (const user of oldUsers) {
          // Split name into first_name and last_name
          const nameParts = (user.name || '').trim().split(' ');
          const firstName = nameParts[0] || 'Nome';
          const lastName = nameParts.slice(1).join(' ') || 'Cognome';

          insertStmt.run(
            user.id,
            user.email,
            user.password,
            firstName,
            lastName,
            user.role,
            user.created_at
          );
        }

        // Drop old table and rename new one
        db.exec(`DROP TABLE users`);
        db.exec(`ALTER TABLE users_new RENAME TO users`);

        db.exec('COMMIT');
        console.log('✅ Successfully migrated users table to new structure');
      } catch (migrationError) {
        db.exec('ROLLBACK');
        throw migrationError;
      }

      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
    // Re-enable foreign keys even if migration fails
    db.pragma('foreign_keys = ON');
  }

  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now', '+1 hour')),
      archived BOOLEAN DEFAULT 0,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Milestones table
  db.exec(`
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      project_id INTEGER NOT NULL,
      due_date DATE,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT (datetime('now', '+1 hour')),
      completed_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'blocked', 'waiting_clarification', 'completed')),
      project_id INTEGER,
      milestone_id INTEGER,
      assigned_to INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      time_spent INTEGER DEFAULT 0,
      blocked_reason TEXT,
      clarification_needed TEXT,
      deadline DATE,
      parent_task_id INTEGER,
      created_at DATETIME DEFAULT (datetime('now', '+1 hour')),
      completed_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  // Migration: Add parent_task_id column if it doesn't exist
  try {
    const checkTasksColumns = db.prepare("PRAGMA table_info(tasks)").all();
    const hasParentTaskId = checkTasksColumns.some(col => col.name === 'parent_task_id');
    if (!hasParentTaskId) {
      db.exec("ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE");
      console.log('✅ Added parent_task_id column to tasks table for subtask support');
    }
  } catch (error) {
    console.error('Migration error (parent_task_id):', error.message);
  }

  // Time entries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      started_at DATETIME NOT NULL,
      ended_at DATETIME,
      duration INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Migration: Add notes column if it doesn't exist
  try {
    const checkColumn = db.prepare("PRAGMA table_info(time_entries)").all();
    const hasNotes = checkColumn.some(col => col.name === 'notes');
    if (!hasNotes) {
      db.exec("ALTER TABLE time_entries ADD COLUMN notes TEXT DEFAULT ''");
      console.log('✅ Added notes column to time_entries table');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  }

  // Comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_from_direction BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now', '+1 hour')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Requests table (Inbox system)
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('bug', 'feature', 'question', 'technical_issue', 'customer_complaint', 'internal_request', 'other')),
      source TEXT NOT NULL CHECK(source IN ('customer', 'internal', 'support', 'management', 'sales', 'production')),
      source_contact TEXT,
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'reviewing', 'approved', 'rejected', 'converted_to_task', 'converted_to_project', 'archived')),
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      project_id INTEGER,
      converted_to_task_id INTEGER,
      converted_to_project_id INTEGER,
      assigned_to INTEGER,
      reviewed_by INTEGER,
      created_by INTEGER NOT NULL,
      received_at DATETIME DEFAULT (datetime('now', '+1 hour')),
      reviewed_at DATETIME,
      resolved_at DATETIME,
      due_date DATE,
      tags TEXT,
      notes TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (converted_to_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
      FOREIGN KEY (converted_to_project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
  `);

  console.log('✅ Database tables created successfully');
};

// Create performance indexes
const createIndexes = () => {
  try {
    // Users indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_active ON users(active)');

    // Projects indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at)');

    // Milestones indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date)');

    // Tasks indexes (CRITICAL for performance)
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)');

    // Time entries indexes (CRITICAL for performance)
    db.exec('CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_time_entries_started_at ON time_entries(started_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_time_entries_ended_at ON time_entries(ended_at)');

    // Comments indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at)');

    // Requests indexes (for inbox system)
    db.exec('CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_requests_priority ON requests(priority)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_requests_source ON requests(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests(assigned_to)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_requests_project_id ON requests(project_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_requests_received_at ON requests(received_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_requests_due_date ON requests(due_date)');

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }
};

// Create admin user if it doesn't exist
const ensureAdminUser = () => {
  try {
    const checkStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const existingUser = checkStmt.get('nicola@admin.it');

    if (existingUser) {
      // User exists, ensure they have admin role and are active
      if (existingUser.role !== 'amministratore' || existingUser.active !== 1) {
        const updateStmt = db.prepare('UPDATE users SET role = ?, active = 1 WHERE email = ?');
        updateStmt.run('amministratore', 'nicola@admin.it');
        console.log('✅ Updated nicola@admin.it to amministratore role and activated');
      }
    } else {
      // Create admin user
      const hashedPassword = bcryptjs.hashSync('password123', 10);
      const insertStmt = db.prepare(`
        INSERT INTO users (email, password, first_name, last_name, role, active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, datetime('now', '+1 hour'))
      `);
      insertStmt.run('nicola@admin.it', hashedPassword, 'Nicola', 'Admin', 'amministratore');
      console.log('✅ Created administrator user: nicola@admin.it');
      console.log('   Password: password123');
    }
  } catch (error) {
    console.error('❌ Error ensuring admin user:', error.message);
  }
};

createTables();
createIndexes();
ensureAdminUser();

export default db;
