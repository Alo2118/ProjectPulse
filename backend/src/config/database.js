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
      created_at DATETIME DEFAULT (datetime('now', '+1 hour')),
      completed_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

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

  console.log('✅ Database tables created successfully');
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
ensureAdminUser();

export default db;
