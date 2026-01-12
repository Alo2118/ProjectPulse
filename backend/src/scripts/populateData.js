import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
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

  // Helper function to create task if it doesn't exist
  const createTaskIfNotExists = (title, taskData) => {
    const stmt = db.prepare('SELECT * FROM tasks WHERE title = ? AND project_id = ?');
    const existing = stmt.get(title, taskData.project_id);
    if (existing) {
      return null;
    }
    return Task.create(taskData);
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

  // Create sample tasks
  console.log('\n📋 Creating sample tasks...');

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(today);
  nextMonth.setDate(nextMonth.getDate() + 30);

  let tasksCreated = 0;

  // Tasks for Fissatore Esapodiale
  if (createTaskIfNotExists('Analisi biomeccanica struttura', {
    title: 'Analisi biomeccanica struttura',
    description: 'Simulazione FEM per validare resistenza a carico ciclico del sistema esapodiale',
    status: 'in_progress',
    project_id: project1.id,
    assigned_to: dipendente1.id,
    created_by: direzione.id,
    priority: 'high',
    deadline: nextWeek.toISOString().split('T')[0],
    time_spent: 14400 // 4 ore
  })) tasksCreated++;

  if (createTaskIfNotExists('Test laboratorio prototipi', {
    title: 'Test laboratorio prototipi',
    description: 'Verifica funzionalità meccanica su modelli di prova',
    status: 'todo',
    project_id: project1.id,
    assigned_to: dipendente2.id,
    created_by: direzione.id,
    priority: 'high',
    deadline: nextMonth.toISOString().split('T')[0]
  })) tasksCreated++;

  if (createTaskIfNotExists('Documentazione tecnica ISO', {
    title: 'Documentazione tecnica ISO',
    description: 'Preparazione documentazione per certificazione ISO 13485',
    status: 'completed',
    project_id: project1.id,
    assigned_to: dipendente1.id,
    created_by: direzione.id,
    priority: 'medium',
    time_spent: 21600 // 6 ore
  })) tasksCreated++;

  // Tasks for Barre snodate
  if (createTaskIfNotExists('Design CAD barre articolate', {
    title: 'Design CAD barre articolate',
    description: 'Modellazione 3D sistema di snodi e collegamenti',
    status: 'in_progress',
    project_id: project2.id,
    assigned_to: dipendente1.id,
    created_by: direzione.id,
    priority: 'high',
    deadline: nextWeek.toISOString().split('T')[0],
    time_spent: 10800 // 3 ore
  })) tasksCreated++;

  if (createTaskIfNotExists('Selezione materiali', {
    title: 'Selezione materiali',
    description: 'Valutazione acciaio inox vs titanio per componenti articolate',
    status: 'todo',
    project_id: project2.id,
    assigned_to: dipendente2.id,
    created_by: direzione.id,
    priority: 'medium',
    deadline: nextMonth.toISOString().split('T')[0]
  })) tasksCreated++;

  // Tasks for Fissatore articolato ginocchio
  if (createTaskIfNotExists('Prototipazione rapida', {
    title: 'Prototipazione rapida',
    description: 'Stampa 3D prototipi funzionali per test preliminari',
    status: 'in_progress',
    project_id: project3.id,
    assigned_to: dipendente2.id,
    created_by: direzione.id,
    priority: 'high',
    deadline: tomorrow.toISOString().split('T')[0],
    time_spent: 7200 // 2 ore
  })) tasksCreated++;

  if (createTaskIfNotExists('Validazione clinica preliminare', {
    title: 'Validazione clinica preliminare',
    description: 'Raccolta feedback da chirurghi ortopedici',
    status: 'waiting_clarification',
    project_id: project3.id,
    assigned_to: dipendente1.id,
    created_by: direzione.id,
    priority: 'medium',
    clarification_needed: 'In attesa conferma disponibilità consulenti clinici'
  })) tasksCreated++;

  // Tasks for Fissatore polso
  if (createTaskIfNotExists('Studio ergonomia applicazione', {
    title: 'Studio ergonomia applicazione',
    description: 'Analisi facilità di applicazione e rimozione del dispositivo',
    status: 'completed',
    project_id: project4.id,
    assigned_to: dipendente1.id,
    created_by: direzione.id,
    priority: 'medium',
    time_spent: 18000 // 5 ore
  })) tasksCreated++;

  if (createTaskIfNotExists('Test resistenza meccanica', {
    title: 'Test resistenza meccanica',
    description: 'Verifica tenuta sotto carico secondo normativa ISO 14879',
    status: 'blocked',
    project_id: project4.id,
    assigned_to: dipendente2.id,
    created_by: direzione.id,
    priority: 'high',
    blocked_reason: 'Attesa disponibilità banco prova torsione',
    deadline: nextMonth.toISOString().split('T')[0]
  })) tasksCreated++;

  // Tasks for Strumentari
  if (createTaskIfNotExists('Design pinze applicazione', {
    title: 'Design pinze applicazione',
    description: 'Progettazione pinze dedicate per montaggio fissatori',
    status: 'in_progress',
    project_id: project5.id,
    assigned_to: dipendente1.id,
    created_by: direzione.id,
    priority: 'medium',
    deadline: nextWeek.toISOString().split('T')[0],
    time_spent: 12600 // 3.5 ore
  })) tasksCreated++;

  if (createTaskIfNotExists('Validazione sterilizzazione', {
    title: 'Validazione sterilizzazione',
    description: 'Test compatibilità strumenti con cicli autoclave',
    status: 'todo',
    project_id: project5.id,
    assigned_to: dipendente2.id,
    created_by: direzione.id,
    priority: 'high',
    deadline: nextMonth.toISOString().split('T')[0]
  })) tasksCreated++;

  // Tasks for ER Basic
  if (createTaskIfNotExists('Ottimizzazione costi produzione', {
    title: 'Ottimizzazione costi produzione',
    description: 'Analisi value engineering per riduzione costi linea base',
    status: 'in_progress',
    project_id: project6.id,
    assigned_to: dipendente2.id,
    created_by: direzione.id,
    priority: 'medium',
    time_spent: 9000 // 2.5 ore
  })) tasksCreated++;

  if (createTaskIfNotExists('Setup produzione', {
    title: 'Setup linea produzione',
    description: 'Configurazione macchinari per produzione serie ER Basic',
    status: 'todo',
    project_id: project6.id,
    assigned_to: dipendente1.id,
    created_by: direzione.id,
    priority: 'high',
    deadline: nextMonth.toISOString().split('T')[0]
  })) tasksCreated++;

  // Tasks for Chiodo Solarino
  if (createTaskIfNotExists('Analisi FEM sollecitazioni', {
    title: 'Analisi FEM sollecitazioni',
    description: 'Simulazione carico assiale e torsionale chiodo endomidollare',
    status: 'completed',
    project_id: project7.id,
    assigned_to: dipendente1.id,
    created_by: direzione.id,
    priority: 'high',
    time_spent: 25200 // 7 ore
  })) tasksCreated++;

  if (createTaskIfNotExists('Preparazione dossier CE', {
    title: 'Preparazione dossier CE',
    description: 'Compilazione documentazione tecnica per marchiatura CE',
    status: 'in_progress',
    project_id: project7.id,
    assigned_to: dipendente2.id,
    created_by: direzione.id,
    priority: 'high',
    deadline: nextWeek.toISOString().split('T')[0],
    time_spent: 16200 // 4.5 ore
  })) tasksCreated++;

  console.log(`✅ Created ${tasksCreated} sample tasks`);

  console.log('\n✅ Database populated successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Users: 4 (1 amministratore, 1 direzione, 2 dipendenti)`);
  console.log(`   - Projects: 7`);
  console.log(`   - Tasks: ${tasksCreated}`);
  console.log('\n🔐 Login credentials:');
  console.log('   Amministratore: nicola@admin.it / Medas000');
  console.log('   Direzione: giovanni.serra@mikai.it / Medas000');
  console.log('   Dipendente 1: andres.forero@mikai.it / Medas000');
  console.log('   Dipendente 2: nicola.mussolin@mikai.it / Medas000');

} catch (error) {
  console.error('❌ Error populating database:', error);
  process.exit(1);
}
