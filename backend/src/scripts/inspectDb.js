import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database.db');

console.log('📂 Database path:', dbPath);
console.log('');

try {
  const db = new Database(dbPath, { readonly: true });

  // List all tables
  console.log('📊 TABELLE NEL DATABASE:');
  console.log('═══════════════════════════════════════');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `).all();

  tables.forEach(table => {
    console.log(`  • ${table.name}`);
  });
  console.log('');

  // Users table info
  console.log('👥 TABELLA USERS:');
  console.log('═══════════════════════════════════════');
  const usersInfo = db.prepare('PRAGMA table_info(users)').all();
  console.log('Struttura colonne:');
  usersInfo.forEach(col => {
    console.log(`  • ${col.name} (${col.type}${col.notnull ? ', NOT NULL' : ''}${col.dflt_value ? `, DEFAULT ${col.dflt_value}` : ''})`);
  });
  console.log('');

  // Count users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log(`Totale utenti: ${userCount.count}`);
  console.log('');

  // List all users
  console.log('Elenco utenti:');
  const users = db.prepare(`
    SELECT id, email, first_name, last_name, role, active, created_at
    FROM users
    ORDER BY id
  `).all();

  if (users.length === 0) {
    console.log('  ⚠️  Nessun utente nel database!');
  } else {
    users.forEach(user => {
      const status = user.active ? '✅ Attivo' : '⏳ In attesa';
      console.log(`  [${user.id}] ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`      Ruolo: ${user.role} | Stato: ${status} | Creato: ${user.created_at}`);
    });
  }
  console.log('');

  // Projects count
  console.log('📁 PROGETTI:');
  console.log('═══════════════════════════════════════');
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  console.log(`Totale progetti: ${projectCount.count}`);

  if (projectCount.count > 0) {
    const projects = db.prepare('SELECT id, name, status FROM projects LIMIT 5').all();
    projects.forEach(p => {
      console.log(`  • [${p.id}] ${p.name} (${p.status})`);
    });
    if (projectCount.count > 5) {
      console.log(`  ... e altri ${projectCount.count - 5} progetti`);
    }
  }
  console.log('');

  // Tasks count
  console.log('✅ TASK:');
  console.log('═══════════════════════════════════════');
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
  console.log(`Totale task: ${taskCount.count}`);

  const tasksByStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM tasks
    GROUP BY status
  `).all();

  if (tasksByStatus.length > 0) {
    console.log('Per stato:');
    tasksByStatus.forEach(s => {
      console.log(`  • ${s.status}: ${s.count}`);
    });
  }
  console.log('');

  // Time entries
  console.log('⏱️  REGISTRAZIONI TEMPO:');
  console.log('═══════════════════════════════════════');
  const timeCount = db.prepare('SELECT COUNT(*) as count FROM time_entries').get();
  console.log(`Totale registrazioni: ${timeCount.count}`);

  if (timeCount.count > 0) {
    const totalTime = db.prepare(`
      SELECT SUM(duration) as total
      FROM time_entries
      WHERE duration IS NOT NULL
    `).get();

    if (totalTime.total) {
      const hours = Math.floor(totalTime.total / 3600);
      const minutes = Math.floor((totalTime.total % 3600) / 60);
      console.log(`Tempo totale registrato: ${hours}h ${minutes}m`);
    }
  }
  console.log('');

  db.close();
  console.log('✅ Ispezione completata con successo!');

} catch (error) {
  console.error('❌ ERRORE durante l\'ispezione del database:');
  console.error(error.message);
  process.exit(1);
}
