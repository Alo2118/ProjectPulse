import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

console.log('🚀 Initializing database with sample data...');

try {
  // Create users
  const direzione = User.create({
    email: 'direzione@company.com',
    password: 'password123',
    name: 'Direzione Generale',
    role: 'direzione'
  });
  console.log('✅ Created direzione user');

  const dipendente = User.create({
    email: 'dipendente@company.com',
    password: 'password123',
    name: 'Mario Rossi',
    role: 'dipendente'
  });
  console.log('✅ Created dipendente user');

  // Create sample projects
  const project1 = Project.create({
    name: 'Sito Web Cliente X',
    description: 'Sviluppo nuovo sito web aziendale',
    created_by: dipendente.id
  });

  const project2 = Project.create({
    name: 'App Mobile Y',
    description: 'Applicazione mobile per gestione ordini',
    created_by: dipendente.id
  });
  console.log('✅ Created sample projects');

  // Create sample tasks
  Task.create({
    title: 'Implementare form contatti',
    description: 'Creare form di contatto con validazione',
    status: 'in_progress',
    project_id: project1.id,
    assigned_to: dipendente.id,
    created_by: dipendente.id,
    priority: 'high'
  });

  Task.create({
    title: 'Review design homepage',
    description: 'Verificare design e proporre modifiche',
    status: 'todo',
    project_id: project1.id,
    assigned_to: dipendente.id,
    created_by: dipendente.id,
    priority: 'medium'
  });

  Task.create({
    title: 'Setup ambiente di sviluppo mobile',
    description: 'Configurare React Native e dipendenze',
    status: 'completed',
    project_id: project2.id,
    assigned_to: dipendente.id,
    created_by: dipendente.id,
    priority: 'high',
    completed_at: new Date().toISOString()
  });

  console.log('✅ Created sample tasks');
  console.log('\n🎉 Database initialized successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Direzione: direzione@company.com / password123');
  console.log('   Dipendente: dipendente@company.com / password123');

} catch (error) {
  console.error('❌ Error initializing database:', error.message);
  process.exit(1);
}
