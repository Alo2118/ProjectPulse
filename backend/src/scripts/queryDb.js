import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database.db');

// Get query from command line arguments
const query = process.argv[2];

if (!query) {
  console.log('');
  console.log('🔍 QUERY DATABASE TOOL');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('Uso: node src/scripts/queryDb.js "SELECT * FROM users"');
  console.log('');
  console.log('Esempi di query utili:');
  console.log('');
  console.log('  • Tutti gli utenti:');
  console.log('    node src/scripts/queryDb.js "SELECT * FROM users"');
  console.log('');
  console.log('  • Utenti in attesa di approvazione:');
  console.log('    node src/scripts/queryDb.js "SELECT * FROM users WHERE active = 0"');
  console.log('');
  console.log('  • Progetti:');
  console.log('    node src/scripts/queryDb.js "SELECT * FROM projects"');
  console.log('');
  console.log('  • Task per progetto:');
  console.log('    node src/scripts/queryDb.js "SELECT * FROM tasks WHERE project_id = 1"');
  console.log('');
  console.log('  • Tempo registrato per utente:');
  console.log('    node src/scripts/queryDb.js "SELECT u.email, SUM(te.duration) as total FROM time_entries te JOIN users u ON te.user_id = u.id GROUP BY u.id"');
  console.log('');
  process.exit(0);
}

try {
  const db = new Database(dbPath, { readonly: true });

  console.log('');
  console.log('📊 Esecuzione query:');
  console.log('═══════════════════════════════════════');
  console.log(query);
  console.log('');

  const results = db.prepare(query).all();

  if (results.length === 0) {
    console.log('⚠️  Nessun risultato trovato');
  } else {
    console.log(`✅ Trovati ${results.length} risultati:`);
    console.log('');
    console.table(results);
  }

  db.close();
  console.log('');
  console.log('✅ Query completata con successo!');
  console.log('');

} catch (error) {
  console.error('');
  console.error('❌ ERRORE durante l\'esecuzione della query:');
  console.error(error.message);
  console.error('');
  process.exit(1);
}
