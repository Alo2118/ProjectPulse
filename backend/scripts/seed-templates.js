import Template from '../src/models/Template.js';

// Template definitions (copied from frontend templates.js)
const PROJECT_TEMPLATES = [
  {
    id: 'fissatore',
    name: 'Fissatore Ortopedico',
    description: 'Sviluppo nuovo sistema di fissazione esterna',
    icon: '🔧',
    data: {
      description: 'Progetto di sviluppo e validazione di un nuovo sistema di fissatore ortopedico per fratture complesse',
      milestones: [
        { name: 'Analisi e Design', description: 'Analisi biomeccanica e design preliminare', duration_days: 30, tasks: ['analisi_biomeccanica', 'doc_tecnica'] },
        { name: 'Prototipazione', description: 'Realizzazione prototipi e test preliminari', duration_days: 45, tasks: ['prototipazione', 'controllo_qualita'] },
        { name: 'Test Meccanici', description: 'Validazione resistenza e performance', duration_days: 30, tasks: ['test_meccanici'] },
        { name: 'Test Clinici', description: 'Validazione clinica e feedback medici', duration_days: 60, tasks: ['validazione_clinica', 'meeting_review'] },
        { name: 'Certificazione CE', description: 'Documentazione e certificazione CE', duration_days: 45, tasks: ['certificazione_ce', 'doc_tecnica'] }
      ]
    }
  },
  {
    id: 'protesi',
    name: 'Protesi Articolare',
    description: 'Sviluppo protesi per articolazioni',
    icon: '🦴',
    data: {
      description: 'Progetto di sviluppo protesi articolare con focus su biocompatibilità e durata',
      milestones: [
        { name: 'Studio Biomeccanico', description: 'Analisi cinematica e dinamica articolare', duration_days: 30, tasks: ['analisi_biomeccanica'] },
        { name: 'Selezione Materiali', description: 'Test biocompatibilità e resistenza', duration_days: 20, tasks: ['test_meccanici'] },
        { name: 'Design CAD', description: 'Modellazione 3D e simulazioni FEM', duration_days: 30, tasks: ['analisi_biomeccanica', 'doc_tecnica'] },
        { name: 'Prototipazione', description: 'Stampa 3D e realizzazione prototipi', duration_days: 40, tasks: ['prototipazione', 'controllo_qualita'] },
        { name: 'Test Funzionali', description: 'Test di usura e affidabilità', duration_days: 50, tasks: ['test_meccanici', 'controllo_qualita'] },
        { name: 'Validazione Clinica', description: 'Trial clinici e raccolta dati', duration_days: 90, tasks: ['validazione_clinica', 'doc_tecnica'] }
      ]
    }
  },
  {
    id: 'strumentario',
    name: 'Strumentario Chirurgico',
    description: 'Sviluppo set strumenti per interventi',
    icon: '⚕️',
    data: {
      description: 'Progetto di sviluppo strumentario chirurgico specializzato',
      milestones: [
        { name: 'Analisi Requisiti', description: 'Raccolta feedback chirurghi e analisi procedure', duration_days: 20, tasks: ['meeting_review', 'doc_tecnica'] },
        { name: 'Design Ergonomico', description: 'Progettazione ergonomica e usabilità', duration_days: 25, tasks: ['analisi_biomeccanica'] },
        { name: 'Prototipazione Rapida', description: 'Realizzazione prototipi per test', duration_days: 30, tasks: ['prototipazione'] },
        { name: 'Test Operatori', description: 'Validazione con chirurghi', duration_days: 40, tasks: ['validazione_clinica', 'meeting_review'] },
        { name: 'Sterilizzazione', description: 'Test protocolli sterilizzazione', duration_days: 20, tasks: ['test_meccanici', 'doc_tecnica'] },
        { name: 'Produzione', description: 'Setup produzione e QA', duration_days: 30, tasks: ['controllo_qualita'] }
      ]
    }
  },
  {
    id: 'ricerca',
    name: 'Ricerca & Innovazione',
    description: 'Progetto di ricerca e sviluppo innovativo',
    icon: '🔬',
    data: {
      description: 'Progetto di ricerca per nuove tecnologie e materiali innovativi',
      milestones: [
        { name: 'Ricerca Bibliografica', description: 'Studio stato dell\'arte e letteratura', duration_days: 15, tasks: ['doc_tecnica'] },
        { name: 'Sperimentazione', description: 'Test e validazione concetti', duration_days: 60, tasks: ['test_meccanici', 'analisi_biomeccanica'] },
        { name: 'Analisi Risultati', description: 'Elaborazione dati e conclusioni', duration_days: 20, tasks: ['doc_tecnica', 'meeting_review'] },
        { name: 'Brevettazione', description: 'Valutazione IP e deposito brevetto', duration_days: 30, tasks: ['doc_tecnica'] },
        { name: 'Pubblicazione', description: 'Paper scientifico e presentazioni', duration_days: 25, tasks: ['doc_tecnica', 'meeting_review'] }
      ]
    }
  }
];

const TASK_TEMPLATES = [
  {
    id: 'analisi_biomeccanica',
    name: 'Analisi Biomeccanica',
    description: 'Studio forze e resistenze del dispositivo',
    icon: '📊',
    data: {
      description: 'Analisi biomeccanica completa con simulazioni FEM e validazione strutturale',
      priority: 'high',
      estimated_hours: 20,
      subtasks: [
        'Definizione carichi e condizioni al contorno',
        'Setup simulazione FEM',
        'Analisi distribuzione tensioni',
        'Verifica fattori di sicurezza',
        'Report risultati e raccomandazioni'
      ]
    }
  },
  {
    id: 'prototipazione',
    name: 'Prototipazione',
    description: 'Realizzazione prototipi fisici',
    icon: '🔨',
    data: {
      description: 'Realizzazione prototipi per test e validazione design',
      priority: 'medium',
      estimated_hours: 30,
      subtasks: [
        'Preparazione file CAD per produzione',
        'Selezione tecnologia di produzione',
        'Realizzazione prototipi',
        'Controllo qualità dimensionale',
        'Documentazione fotografica'
      ]
    }
  },
  {
    id: 'test_meccanici',
    name: 'Test Meccanici',
    description: 'Validazione resistenza e durata',
    icon: '⚙️',
    data: {
      description: 'Test meccanici di resistenza, fatica e affidabilità secondo normative',
      priority: 'high',
      estimated_hours: 25,
      subtasks: [
        'Preparazione campioni di test',
        'Setup strumentazione di misura',
        'Esecuzione test di trazione/compressione',
        'Test di fatica ciclica',
        'Analisi risultati e report conformità'
      ]
    }
  },
  {
    id: 'doc_tecnica',
    name: 'Documentazione Tecnica',
    description: 'Preparazione documentazione e manuali',
    icon: '📄',
    data: {
      description: 'Redazione documentazione tecnica completa per certificazione e uso',
      priority: 'medium',
      estimated_hours: 15,
      subtasks: [
        'Manuale d\'uso e manutenzione',
        'Schede tecniche prodotto',
        'File tecnici di produzione',
        'Documentazione rischio (ISO 14971)',
        'Revisione e approvazione'
      ]
    }
  },
  {
    id: 'validazione_clinica',
    name: 'Validazione Clinica',
    description: 'Test e feedback da professionisti medici',
    icon: '🏥',
    data: {
      description: 'Validazione clinica con raccolta feedback e dati di utilizzo',
      priority: 'high',
      estimated_hours: 40,
      subtasks: [
        'Selezione centri clinici partner',
        'Preparazione protocollo studio',
        'Training personale medico',
        'Raccolta dati e feedback',
        'Analisi risultati e report clinico'
      ]
    }
  },
  {
    id: 'certificazione_ce',
    name: 'Certificazione CE',
    description: 'Preparazione per marcatura CE',
    icon: '✓',
    data: {
      description: 'Preparazione documentazione e processo per certificazione CE MDR',
      priority: 'high',
      estimated_hours: 50,
      subtasks: [
        'Classificazione dispositivo',
        'Analisi rischio completa',
        'File tecnico di documentazione',
        'Verifica conformità normative',
        'Audit organismo notificato'
      ]
    }
  },
  {
    id: 'controllo_qualita',
    name: 'Controllo Qualità',
    description: 'Ispezione e validazione QA',
    icon: '✔️',
    data: {
      description: 'Controllo qualità e validazione conformità specifiche',
      priority: 'medium',
      estimated_hours: 10,
      subtasks: [
        'Ispezione visiva e dimensionale',
        'Test funzionali',
        'Verifica tracciabilità',
        'Compilazione report QA',
        'Approvazione per rilascio'
      ]
    }
  },
  {
    id: 'meeting_review',
    name: 'Meeting di Review',
    description: 'Revisione progetto con stakeholder',
    icon: '👥',
    data: {
      description: 'Meeting di revisione avanzamento progetto e decisioni strategiche',
      priority: 'medium',
      estimated_hours: 3,
      subtasks: [
        'Preparazione presentazione',
        'Raccolta feedback team',
        'Meeting di revisione',
        'Verbalizzazione decisioni',
        'Pianificazione azioni successive'
      ]
    }
  }
];

const MILESTONE_TEMPLATES = [
  {
    id: 'design_phase',
    name: 'Fase Design',
    description: 'Analisi, progettazione e design preliminare',
    icon: '✏️',
    data: {
      description: 'Fase di analisi requisiti, design concettuale e progettazione preliminare',
      duration_days: 30,
      tasks: ['analisi_biomeccanica', 'doc_tecnica', 'meeting_review']
    }
  },
  {
    id: 'prototyping_phase',
    name: 'Fase Prototipazione',
    description: 'Realizzazione e test prototipi',
    icon: '🔨',
    data: {
      description: 'Realizzazione prototipi, test preliminari e ottimizzazione design',
      duration_days: 45,
      tasks: ['prototipazione', 'test_meccanici', 'controllo_qualita']
    }
  },
  {
    id: 'validation_phase',
    name: 'Fase Validazione',
    description: 'Validazione tecnica e clinica',
    icon: '✓',
    data: {
      description: 'Test completi, validazione clinica e verifica conformità normative',
      duration_days: 60,
      tasks: ['test_meccanici', 'validazione_clinica', 'doc_tecnica']
    }
  },
  {
    id: 'certification_phase',
    name: 'Fase Certificazione',
    description: 'Certificazione CE e approvazioni',
    icon: '📜',
    data: {
      description: 'Preparazione documentazione, certificazione CE e approvazioni regolatorie',
      duration_days: 45,
      tasks: ['certificazione_ce', 'doc_tecnica', 'controllo_qualita']
    }
  }
];

async function seedTemplates() {
  console.log('🌱 Seeding templates into database...\n');

  let seededCount = 0;

  try {
    // Get system user (administrator with id=1, or create a placeholder)
    const systemUserId = 1; // Assumes admin user exists with id=1

    // Seed Project Templates
    console.log('📁 Seeding Project Templates...');
    for (const template of PROJECT_TEMPLATES) {
      try {
        // Check if already exists
        const existing = Template.getAll({ type: 'project' }).find(t => t.name === template.name);
        if (existing) {
          console.log(`  ⏭️  Skipped: ${template.name} (already exists)`);
          continue;
        }

        Template.create({
          name: template.name,
          description: template.description,
          type: 'project',
          icon: template.icon,
          data: template.data,
          created_by: systemUserId,
          is_public: true
        });
        console.log(`  ✅ Created: ${template.name}`);
        seededCount++;
      } catch (error) {
        console.error(`  ❌ Failed to create ${template.name}:`, error.message);
      }
    }

    // Seed Task Templates
    console.log('\n📋 Seeding Task Templates...');
    for (const template of TASK_TEMPLATES) {
      try {
        const existing = Template.getAll({ type: 'task' }).find(t => t.name === template.name);
        if (existing) {
          console.log(`  ⏭️  Skipped: ${template.name} (already exists)`);
          continue;
        }

        Template.create({
          name: template.name,
          description: template.description,
          type: 'task',
          icon: template.icon,
          data: template.data,
          created_by: systemUserId,
          is_public: true
        });
        console.log(`  ✅ Created: ${template.name}`);
        seededCount++;
      } catch (error) {
        console.error(`  ❌ Failed to create ${template.name}:`, error.message);
      }
    }

    // Seed Milestone Templates
    console.log('\n🎯 Seeding Milestone Templates...');
    for (const template of MILESTONE_TEMPLATES) {
      try {
        const existing = Template.getAll({ type: 'milestone' }).find(t => t.name === template.name);
        if (existing) {
          console.log(`  ⏭️  Skipped: ${template.name} (already exists)`);
          continue;
        }

        Template.create({
          name: template.name,
          description: template.description,
          type: 'milestone',
          icon: template.icon,
          data: template.data,
          created_by: systemUserId,
          is_public: true
        });
        console.log(`  ✅ Created: ${template.name}`);
        seededCount++;
      } catch (error) {
        console.error(`  ❌ Failed to create ${template.name}:`, error.message);
      }
    }

    console.log(`\n✅ Template seeding completed! ${seededCount} templates created.`);
  } catch (error) {
    console.error('\n❌ Error during template seeding:', error);
    process.exit(1);
  }
}

// Run seeding
seedTemplates()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
