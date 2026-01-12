import User from '../models/User.js';
import Project from '../models/Project.js';
import db from '../config/database.js';

console.log('🚀 Populating database with Mikai data...');

try {
  // Helper function to create or get existing user
  const createOrGetUser = (email, data) => {
    const existing = User.findByEmail(email);
    if (existing) {
      console.log(`ℹ️  User already exists: ${existing.first_name} ${existing.last_name} (${email})`);
      return existing;
    }
    const user = User.create(data);
    console.log(`✅ Created user: ${user.first_name} ${user.last_name} (${email})`);
    return user;
  };

  // Helper function to create or get existing project
  const createOrGetProject = (name, description, created_by) => {
    const stmt = db.prepare('SELECT * FROM projects WHERE name = ?');
    const existing = stmt.get(name);
    if (existing) {
      console.log(`ℹ️  Project already exists: ${name}`);
      return existing;
    }
    const project = Project.create({ name, description, created_by });
    console.log(`✅ Created project: ${name}`);
    return project;
  };

  // Create users
  console.log('\n📝 Creating users...');

  const amministratore = createOrGetUser('nicola@admin.it', {
    email: 'nicola@admin.it',
    password: 'Medas000',
    first_name: 'Nicola',
    last_name: 'Mussolin',
    role: 'amministratore',
    active: true
  });

  const direzione = createOrGetUser('giovanni.serra@mikai.it', {
    email: 'giovanni.serra@mikai.it',
    password: 'Medas000',
    first_name: 'Giovanni',
    last_name: 'Serra',
    role: 'direzione',
    active: true
  });

  const dipendente1 = createOrGetUser('andres.forero@mikai.it', {
    email: 'andres.forero@mikai.it',
    password: 'Medas000',
    first_name: 'Andres',
    last_name: 'Forero',
    role: 'dipendente',
    active: true
  });

  const dipendente2 = createOrGetUser('nicola.mussolin@mikai.it', {
    email: 'nicola.mussolin@mikai.it',
    password: 'Medas000',
    first_name: 'Nicola',
    last_name: 'Mussolin',
    role: 'dipendente',
    active: true
  });

  // Create projects
  console.log('\n📁 Creating projects...');

  const project1 = createOrGetProject(
    'Fissatore Esapodiale',
    'Sviluppo e perfezionamento sistema di fissazione esterna esapodiale',
    direzione.id
  );

  const project2 = createOrGetProject(
    'Barre snodate',
    'Progettazione e produzione barre articolate per fissatori esterni',
    direzione.id
  );

  const project3 = createOrGetProject(
    'Fissatore articolato ginocchio',
    'Sistema di fissazione articolato specifico per ginocchio',
    direzione.id
  );

  const project4 = createOrGetProject(
    'Fissatore polso',
    'Fissatore esterno dedicato per fratture del polso',
    direzione.id
  );

  const project5 = createOrGetProject(
    'Strumentari',
    'Sviluppo strumentario chirurgico per applicazione fissatori',
    direzione.id
  );

  const project6 = createOrGetProject(
    'ER Basic',
    'Linea ER Basic - Sistema di fissazione esterna di base',
    direzione.id
  );

  const project7 = createOrGetProject(
    'Chiodo Solarino',
    'Chiodo endomidollare Solarino per fissazione interna',
    direzione.id
  );

  console.log('\n✅ Database populated successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Users in database: 4 (1 amministratore, 1 direzione, 2 dipendenti)`);
  console.log(`   - Projects in database: 7`);
  console.log('\n🔐 Login credentials:');
  console.log('   Amministratore: nicola@admin.it / Medas000');
  console.log('   Direzione: giovanni.serra@mikai.it / Medas000');
  console.log('   Dipendente 1: andres.forero@mikai.it / Medas000');
  console.log('   Dipendente 2: nicola.mussolin@mikai.it / Medas000');

} catch (error) {
  console.error('❌ Error populating database:', error);
  process.exit(1);
}
