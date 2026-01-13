// Template predefiniti per Mikai - Dispositivi Ortopedici

export const PROJECT_TEMPLATES = [
  {
    id: 'custom',
    name: 'Progetto Personalizzato',
    description: 'Crea un progetto da zero',
    icon: '📝',
    data: null
  },
  {
    id: 'fissatore',
    name: 'Fissatore Ortopedico',
    description: 'Sviluppo nuovo sistema di fissazione esterna',
    icon: '🔧',
    data: {
      description: 'Progetto di sviluppo e validazione di un nuovo sistema di fissatore ortopedico per fratture complesse',
      milestones: [
        { name: 'Analisi e Design', description: 'Analisi biomeccanica e design preliminare', duration_days: 30 },
        { name: 'Prototipazione', description: 'Realizzazione prototipi e test preliminari', duration_days: 45 },
        { name: 'Test Meccanici', description: 'Validazione resistenza e performance', duration_days: 30 },
        { name: 'Test Clinici', description: 'Validazione clinica e feedback medici', duration_days: 60 },
        { name: 'Certificazione CE', description: 'Documentazione e certificazione CE', duration_days: 45 }
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
        { name: 'Studio Biomeccanico', description: 'Analisi cinematica e dinamica articolare', duration_days: 30 },
        { name: 'Selezione Materiali', description: 'Test biocompatibilità e resistenza', duration_days: 20 },
        { name: 'Design CAD', description: 'Modellazione 3D e simulazioni FEM', duration_days: 30 },
        { name: 'Prototipazione', description: 'Stampa 3D e realizzazione prototipi', duration_days: 40 },
        { name: 'Test Funzionali', description: 'Test di usura e affidabilità', duration_days: 50 },
        { name: 'Validazione Clinica', description: 'Trial clinici e raccolta dati', duration_days: 90 }
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
        { name: 'Analisi Requisiti', description: 'Raccolta feedback chirurghi e analisi procedure', duration_days: 20 },
        { name: 'Design Ergonomico', description: 'Progettazione ergonomica e usabilità', duration_days: 25 },
        { name: 'Prototipazione Rapida', description: 'Realizzazione prototipi per test', duration_days: 30 },
        { name: 'Test Operatori', description: 'Validazione con chirurghi', duration_days: 40 },
        { name: 'Sterilizzazione', description: 'Test protocolli sterilizzazione', duration_days: 20 },
        { name: 'Produzione', description: 'Setup produzione e QA', duration_days: 30 }
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
        { name: 'Ricerca Bibliografica', description: 'Studio stato dell\'arte e letteratura', duration_days: 15 },
        { name: 'Sperimentazione', description: 'Test e validazione concetti', duration_days: 60 },
        { name: 'Analisi Risultati', description: 'Elaborazione dati e conclusioni', duration_days: 20 },
        { name: 'Brevettazione', description: 'Valutazione IP e deposito brevetto', duration_days: 30 },
        { name: 'Pubblicazione', description: 'Paper scientifico e presentazioni', duration_days: 25 }
      ]
    }
  }
];

export const TASK_TEMPLATES = [
  {
    id: 'custom',
    name: 'Task Personalizzato',
    description: 'Crea un task da zero',
    icon: '📋',
    data: null
  },
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

export const MILESTONE_TEMPLATES = [
  {
    id: 'custom',
    name: 'Milestone Personalizzata',
    description: 'Crea una milestone da zero',
    icon: '🎯',
    data: null
  },
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

// Smart defaults configuration
export const SMART_DEFAULTS = {
  task: {
    // Default priority based on project type
    priorityByContext: {
      fissatore: 'high',
      protesi: 'high',
      strumentario: 'medium',
      ricerca: 'medium',
      default: 'medium'
    },
    // Default deadline offset in days
    deadlineOffset: 7,
    // Auto-assign to last used user (stored in localStorage)
    rememberLastAssignee: true,
    // Auto-calculate start_date based on deadline and estimated hours
    // Logic: deadline - (estimated_hours / 8 working hours per day)
    // Falls back to today if no deadline or no estimated hours
    autoCalculateStartDate: true,
    // Hours per working day for start date calculation
    hoursPerWorkingDay: 8
  },
  project: {
    // Default status for new projects
    status: 'active',
    // Auto-create first milestone
    createDefaultMilestone: true
  },
  milestone: {
    // Default duration in days
    defaultDuration: 30,
    // Auto-calculate due date based on project start + duration
    autoCalculateDueDate: true
  }
};

export default {
  PROJECT_TEMPLATES,
  TASK_TEMPLATES,
  MILESTONE_TEMPLATES,
  SMART_DEFAULTS
};
