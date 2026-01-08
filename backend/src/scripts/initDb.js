import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Milestone from '../models/Milestone.js';

console.log('🚀 Initializing database with sample data...');

try {
  // Create users
  const amministratore = User.create({
    email: 'admin@orthotech.com',
    password: 'password123',
    first_name: 'Admin',
    last_name: 'Sistema',
    role: 'amministratore'
  });
  console.log('✅ Created amministratore user');

  const direzione = User.create({
    email: 'direzione@orthotech.com',
    password: 'password123',
    first_name: 'Laura',
    last_name: 'Bianchi',
    role: 'direzione'
  });
  console.log('✅ Created direzione user');

  const dipendente = User.create({
    email: 'ingegnere@orthotech.com',
    password: 'password123',
    first_name: 'Marco',
    last_name: 'Ferretti',
    role: 'dipendente'
  });
  console.log('✅ Created dipendente user');

  // Create sample R&D projects
  const project1 = Project.create({
    name: 'Protesi Ginocchio Titanio Gen-5',
    description: 'Sviluppo nuova generazione protesi ginocchio con rivestimento in titanio biocompatibile',
    created_by: direzione.id
  });

  const project2 = Project.create({
    name: 'Viti Peduncolari Intelligenti',
    description: 'Sistema di fissazione vertebrale con sensori integrati per monitoraggio post-operatorio',
    created_by: direzione.id
  });

  const project3 = Project.create({
    name: 'Strumentario Artroscopico Monouso',
    description: 'Kit strumenti monouso per artroscopia spalla e ginocchio',
    created_by: direzione.id
  });

  console.log('✅ Created sample R&D projects');

  // Create milestones
  const milestone1 = Milestone.create({
    name: 'Fase Design e CAD',
    description: 'Completamento modelli 3D e analisi FEM',
    project_id: project1.id,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active'
  });

  const milestone2 = Milestone.create({
    name: 'Prototipazione',
    description: 'Stampa 3D e realizzazione prototipi fisici',
    project_id: project1.id,
    due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active'
  });

  console.log('✅ Created sample milestones');

  // Create sample tasks with deadlines
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(today);
  nextMonth.setDate(nextMonth.getDate() + 30);

  Task.create({
    title: 'Analisi biomeccanica protesi',
    description: 'Simulazione FEM per validare resistenza a carico ciclico 10M cicli',
    status: 'in_progress',
    project_id: project1.id,
    milestone_id: milestone1.id,
    assigned_to: dipendente.id,
    created_by: direzione.id,
    priority: 'high',
    deadline: tomorrow.toISOString().split('T')[0]
  });

  Task.create({
    title: 'Revisione materiali biocompatibili',
    description: 'Valutare titanio Ti-6Al-4V vs titanio grado 5 per rivestimento superficiale',
    status: 'todo',
    project_id: project1.id,
    milestone_id: milestone1.id,
    assigned_to: dipendente.id,
    created_by: direzione.id,
    priority: 'high',
    deadline: nextWeek.toISOString().split('T')[0]
  });

  Task.create({
    title: 'Test usura accelerata prototipi',
    description: 'Test tribologico secondo ISO 14243 per validare durata minima 25 anni',
    status: 'blocked',
    project_id: project1.id,
    milestone_id: milestone2.id,
    assigned_to: dipendente.id,
    created_by: direzione.id,
    priority: 'high',
    blocked_reason: 'In attesa macchina test usura (manutenzione in corso)',
    deadline: nextMonth.toISOString().split('T')[0]
  });

  Task.create({
    title: 'Design elettronica sensori pressione',
    description: 'Progettare circuito sensing piezoelettrico per viti peduncolari',
    status: 'in_progress',
    project_id: project2.id,
    assigned_to: dipendente.id,
    created_by: direzione.id,
    priority: 'medium',
    deadline: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  Task.create({
    title: 'Documentazione tecnica ISO 13485',
    description: 'Preparare Design History File per certificazione CE',
    status: 'todo',
    project_id: project2.id,
    assigned_to: dipendente.id,
    created_by: direzione.id,
    priority: 'medium'
  });

  Task.create({
    title: 'Validazione sterilizzazione EtO',
    description: 'Verificare compatibilità strumentario con sterilizzazione ossido di etilene',
    status: 'completed',
    project_id: project3.id,
    assigned_to: dipendente.id,
    created_by: direzione.id,
    priority: 'high',
    completed_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    time_spent: 7200
  });

  Task.create({
    title: 'Studio ergonomia impugnature',
    description: 'Test ergonomici con chirurghi ortopedici per ottimizzare grip strumenti',
    status: 'waiting_clarification',
    project_id: project3.id,
    assigned_to: dipendente.id,
    created_by: direzione.id,
    priority: 'low',
    clarification_needed: 'Necessario feedback da chirurghi su dimensioni impugnatura',
    deadline: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  console.log('✅ Created sample R&D tasks');
  console.log('\n🎉 Database initialized successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Direzione: direzione@orthotech.com / password123');
  console.log('   Ingegnere: ingegnere@orthotech.com / password123');
  console.log('\n🔬 Sample data: Orthopedic R&D projects, prosthesis development, surgical instruments');

} catch (error) {
  console.error('❌ Error initializing database:', error.message);
  process.exit(1);
}
