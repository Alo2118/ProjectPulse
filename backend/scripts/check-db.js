import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n=== 📊 CONTENUTO DATABASE ===\n');

// Contatori
const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('👥 Utenti:', users.count);

const projects = db.prepare('SELECT COUNT(*) as count FROM projects').get();
console.log('📁 Progetti:', projects.count);

const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
console.log('📋 Task:', tasks.count);

const milestones = db.prepare('SELECT COUNT(*) as count FROM milestones').get();
console.log('🎯 Milestone:', milestones.count);

// Check if templates table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='templates'").all();
if (tables.length > 0) {
  const templates = db.prepare('SELECT COUNT(*) as count FROM templates').get();
  console.log('📝 Template:', templates.count);
} else {
  console.log('📝 Template: tabella non presente (database vecchio)');
}

// Schema tabella tasks
console.log('\n=== 🏗️  SCHEMA TABELLA TASKS ===\n');
const columns = db.prepare('PRAGMA table_info(tasks)').all();
const ganttFields = ['start_date', 'estimated_hours', 'progress_percentage'];
const hasGanttFields = ganttFields.every(field =>
  columns.some(col => col.name === field)
);

console.log(hasGanttFields
  ? '✅ Campi Gantt presenti (start_date, estimated_hours, progress_percentage)'
  : '❌ Campi Gantt MANCANTI - riavviare il backend per applicare migrazioni'
);

console.log('\nColonne presenti:');
columns.forEach(col => {
  const isGantt = ganttFields.includes(col.name);
  const prefix = isGantt ? '  📊' : '    ';
  console.log(`${prefix} ${col.name.padEnd(25)} | ${col.type.padEnd(15)}`);
});

// Ultimi task
console.log('\n=== 📋 ULTIMI 5 TASK ===\n');
try {
  const recentTasks = db.prepare(`
    SELECT id, title, status, deadline, created_at
    FROM tasks
    ORDER BY id DESC
    LIMIT 5
  `).all();

  if (recentTasks.length === 0) {
    console.log('Nessun task presente');
  } else {
    recentTasks.forEach(t => {
      console.log(`ID: ${t.id} | ${t.title}`);
      console.log(`  Status: ${t.status} | Deadline: ${t.deadline || 'non impostata'}`);
      console.log('');
    });
  }
} catch (error) {
  console.error('Errore:', error.message);
}

// Ultimi progetti
console.log('\n=== 📁 ULTIMI 5 PROGETTI ===\n');
const recentProjects = db.prepare(`
  SELECT id, name, created_at, archived
  FROM projects
  ORDER BY id DESC
  LIMIT 5
`).all();

if (recentProjects.length === 0) {
  console.log('Nessun progetto presente');
} else {
  recentProjects.forEach(p => {
    const status = p.archived ? '📦 Archiviato' : '✅ Attivo';
    console.log(`ID: ${p.id} | ${p.name} ${status}`);
  });
}

db.close();
console.log('\n✅ Ispezione completata\n');
