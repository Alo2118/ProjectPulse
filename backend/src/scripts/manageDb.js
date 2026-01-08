import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database.db');

const command = process.argv[2];
const args = process.argv.slice(3);

console.log('');
console.log('🛠️  DATABASE MANAGEMENT TOOL');
console.log('═══════════════════════════════════════');
console.log('');

if (!command) {
  console.log('Comandi disponibili:');
  console.log('');
  console.log('  • activate <email>');
  console.log('    Attiva un utente (approva registrazione)');
  console.log('    Esempio: node src/scripts/manageDb.js activate nicola@example.com');
  console.log('');
  console.log('  • deactivate <email>');
  console.log('    Disattiva un utente');
  console.log('    Esempio: node src/scripts/manageDb.js deactivate nicola@example.com');
  console.log('');
  console.log('  • change-password <email> <nuova_password>');
  console.log('    Cambia password di un utente');
  console.log('    Esempio: node src/scripts/manageDb.js change-password nicola@admin.it newpass123');
  console.log('');
  console.log('  • change-role <email> <ruolo>');
  console.log('    Cambia ruolo di un utente (dipendente|direzione|amministratore)');
  console.log('    Esempio: node src/scripts/manageDb.js change-role nicola@example.com amministratore');
  console.log('');
  console.log('  • delete <email>');
  console.log('    Elimina completamente un utente (ATTENZIONE!)');
  console.log('    Esempio: node src/scripts/manageDb.js delete nicola@example.com');
  console.log('');
  process.exit(0);
}

try {
  const db = new Database(dbPath);

  switch (command) {
    case 'activate': {
      const email = args[0];
      if (!email) {
        console.error('❌ Errore: Specifica l\'email dell\'utente');
        process.exit(1);
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        console.error(`❌ Utente ${email} non trovato`);
        process.exit(1);
      }

      if (user.active) {
        console.log(`⚠️  L\'utente ${email} è già attivo`);
      } else {
        db.prepare('UPDATE users SET active = 1 WHERE email = ?').run(email);
        console.log(`✅ Utente ${email} attivato con successo!`);
      }
      break;
    }

    case 'deactivate': {
      const email = args[0];
      if (!email) {
        console.error('❌ Errore: Specifica l\'email dell\'utente');
        process.exit(1);
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        console.error(`❌ Utente ${email} non trovato`);
        process.exit(1);
      }

      if (!user.active) {
        console.log(`⚠️  L\'utente ${email} è già disattivato`);
      } else {
        db.prepare('UPDATE users SET active = 0 WHERE email = ?').run(email);
        console.log(`✅ Utente ${email} disattivato con successo!`);
      }
      break;
    }

    case 'change-password': {
      const email = args[0];
      const newPassword = args[1];

      if (!email || !newPassword) {
        console.error('❌ Errore: Specifica email e nuova password');
        process.exit(1);
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        console.error(`❌ Utente ${email} non trovato`);
        process.exit(1);
      }

      const hashedPassword = bcryptjs.hashSync(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hashedPassword, email);
      console.log(`✅ Password per ${email} cambiata con successo!`);
      console.log(`   Nuova password: ${newPassword}`);
      break;
    }

    case 'change-role': {
      const email = args[0];
      const newRole = args[1];

      if (!email || !newRole) {
        console.error('❌ Errore: Specifica email e nuovo ruolo');
        process.exit(1);
      }

      if (!['dipendente', 'direzione', 'amministratore'].includes(newRole)) {
        console.error('❌ Errore: Ruolo non valido. Usa: dipendente, direzione, amministratore');
        process.exit(1);
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        console.error(`❌ Utente ${email} non trovato`);
        process.exit(1);
      }

      db.prepare('UPDATE users SET role = ? WHERE email = ?').run(newRole, email);
      console.log(`✅ Ruolo per ${email} cambiato da "${user.role}" a "${newRole}"!`);
      break;
    }

    case 'delete': {
      const email = args[0];
      if (!email) {
        console.error('❌ Errore: Specifica l\'email dell\'utente');
        process.exit(1);
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        console.error(`❌ Utente ${email} non trovato`);
        process.exit(1);
      }

      console.log('⚠️  ATTENZIONE: Stai per eliminare completamente l\'utente!');
      console.log(`   Email: ${user.email}`);
      console.log(`   Nome: ${user.first_name} ${user.last_name}`);
      console.log(`   Ruolo: ${user.role}`);
      console.log('');
      console.log('   Questo eliminerà anche tutti i task, commenti e registrazioni tempo associati!');
      console.log('');
      console.log('   Premi Ctrl+C per annullare, o riavvia il comando con --confirm');

      if (!args.includes('--confirm')) {
        process.exit(0);
      }

      db.prepare('DELETE FROM users WHERE email = ?').run(email);
      console.log(`✅ Utente ${email} eliminato definitivamente!`);
      break;
    }

    default:
      console.error(`❌ Comando sconosciuto: ${command}`);
      console.log('');
      console.log('Usa senza parametri per vedere i comandi disponibili:');
      console.log('  node src/scripts/manageDb.js');
      process.exit(1);
  }

  db.close();
  console.log('');

} catch (error) {
  console.error('');
  console.error('❌ ERRORE:');
  console.error(error.message);
  console.error('');
  process.exit(1);
}
