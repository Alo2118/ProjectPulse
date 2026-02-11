# ProjectPulse - Documentazione Completa

## 📚 Benvenuto

Questa è la documentazione completa per **ProjectPulse**, un sistema di gestione progetti conforme alla struttura logica ISO 13485 per aziende in ambito medicale.

---

## 📁 File della Documentazione

### 🎯 Documenti Principali

1. **[PRD.md](./PRD.md)** - Product Requirements Document
   - Panoramica completa del progetto
   - Requisiti funzionali e tecnici
   - Definizione ruoli utente
   - Features dettagliate
   - Metriche di successo

2. **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Guida Implementazione
   - Istruzioni step-by-step per lo sviluppo
   - Suddivisione in 10 fasi
   - Checklist di verifica per ogni fase
   - Best practices per Claude Code

3. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Struttura Progetto
   - File system completo (client + server)
   - Package.json examples
   - Configurazioni (Vite, TypeScript, Tailwind, Prisma)
   - Data flow diagrams

5. **[SETUP_LOCALHOST.md](./SETUP_LOCALHOST.md)** - Setup Localhost
   - Installazione prerequisiti (Node.js, SQL Server Express, Git)
   - Setup database
   - Configurazione environment variables
   - Comandi per avvio sviluppo
   - Troubleshooting comune

6. **[PROMPTS_FOR_CLAUDE.md](./PROMPTS_FOR_CLAUDE.md)** - Prompt per Claude Code
   - Prompt copy-paste ready per ogni fase
   - Ottimizzati per Claude Code
   - Checklist di verifica
   - 50+ prompt specifici

---

## 🚀 Come Iniziare

### Per lo Sviluppo

1. **Leggi prima il PRD.md**
   - Comprendi requisiti e obiettivi
   - Familiarizza con features e tecnologie

2. **Segui SETUP_LOCALHOST.md**
   - Installa prerequisiti
   - Configura database
   - Verifica che tutto funzioni

3. **Usa IMPLEMENTATION_GUIDE.md + PROMPTS_FOR_CLAUDE.md**
   - Sviluppa fase per fase
   - Usa prompt ottimizzati con Claude Code
   - Verifica con checklist

4. **Consulta PROJECT_STRUCTURE.md**
   - Per capire organizzazione file
   - Per vedere esempi di configurazione

5. **Riferisciti a `server/prisma/schema.prisma`**
   - Per comprendere data model
   - Per query e migrations

---

## 🎯 Workflow Raccomandato

```
1. Setup Ambiente (SETUP_LOCALHOST.md)
   ↓
2. Leggi PRD per visione d'insieme
   ↓
3. Inizia Fase 1 (IMPLEMENTATION_GUIDE.md)
   ↓
4. Copia prompt da PROMPTS_FOR_CLAUDE.md
   ↓
5. Dai prompt a Claude Code
   ↓
6. Verifica con checklist
   ↓
7. Commit codice
   ↓
8. Passa a fase successiva
```

---

## 📊 Caratteristiche Principali

### ✨ Features Core
- ✅ Autenticazione JWT multi-ruolo (Admin, Direzione, Dipendente)
- ✅ Gestione progetti con template
- ✅ Task management con Kanban board
- ✅ Time tracking integrato
- ✅ Comunicazione tramite commenti
- ✅ Risk management con Risk Matrix
- ✅ Document control con versioning
- ✅ Audit trail completo
- ✅ Notifiche real-time (Socket.io)
- ✅ Analytics dashboard
- ✅ Report PDF giornalieri

### 🛠️ Stack Tecnologico

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- React Router v6
- Framer Motion (animations)
- Socket.io Client
- Recharts (charts)

**Backend:**
- Node.js + Express + TypeScript
- SQL Server Express
- Prisma ORM
- JWT + bcrypt
- Socket.io
- Winston (logging)
- PDFKit (reports)

---

## 📖 Ordine di Lettura Consigliato

### Per Developer (tu)

1. **PRD.md** - Overview completa (30 min)
2. **SETUP_LOCALHOST.md** - Setup ambiente (60 min)
3. **PROJECT_STRUCTURE.md** - Familiarizza con struttura (20 min)
4. **IMPLEMENTATION_GUIDE.md** - Studia roadmap sviluppo (40 min)
5. **PROMPTS_FOR_CLAUDE.md** - Pronto per sviluppare! (uso ongoing)
6. **server/prisma/schema.prisma** - Reference durante sviluppo (uso ongoing)

### Per Claude Code

Quando usi Claude Code, dagli questi file come context:

1. **PRD.md** - sempre
2. **PROMPTS_FOR_CLAUDE.md** - per prompt specifici
3. **PROJECT_STRUCTURE.md** - quando crei file
4. **server/prisma/schema.prisma** - quando lavori con database
5. **IMPLEMENTATION_GUIDE.md** - per capire fase corrente

---

## 🎓 Fasi di Sviluppo

### Phase 1: Setup (1-2 settimane)
- Monorepo structure
- Database schema
- Authentication system
- Base UI components

### Phase 2: Core Features (2-3 settimane)
- Projects module
- Tasks module
- Time tracking
- Comments

### Phase 3: ISO Features (2-3 settimane)
- Risk management
- Document control
- Audit trail
- Project templates

### Phase 4: Advanced (1-2 settimane)
- Real-time notifications
- Analytics dashboard
- PDF reports
- Dark mode + animations

### Phase 5: Polish (1 settimana)
- Testing
- Performance optimization
- Documentation
- Bug fixes

**Totale: 7-11 settimane**

---

## 🔧 Comandi Rapidi

```bash
# Setup iniziale
npm run install:all
npm run db:migrate
npm run db:seed

# Sviluppo
npm run dev

# Database
npm run db:studio

# Build production
npm run build
npm run start:prod

# Testing
npm run test
npm run test:coverage

# Formatting
npm run lint
npm run format
```

---

## 📞 Support & Troubleshooting

### Problemi Comuni

**"Cannot connect to database"**
→ Vedi SETUP_LOCALHOST.md sezione Troubleshooting

**"Port already in use"**
→ Cambia porta in .env o vite.config.ts

**"Prisma Client not generated"**
→ Esegui `npx prisma generate`

**"Module not found"**
→ Reinstalla dependencies: `npm run install:all`

### Risorse Utili

- SQL Server GUI: SQL Server Management Studio (SSMS) o Prisma Studio
- API Testing: Thunder Client (VS Code) o Postman
- Git GUI: GitHub Desktop o GitKraken
- Database Backup: vedi SETUP_LOCALHOST.md

---

## ✅ Checklist Finale

Prima di considerare il progetto completo:

### Backend
- [ ] Tutte le routes funzionano
- [ ] Validazione input con Zod
- [ ] Audit trail per tutte le operazioni critiche
- [ ] Error handling appropriato
- [ ] Logging con Winston
- [ ] Tests passano (coverage >70%)
- [ ] API documentata (Swagger)

### Frontend
- [ ] Tutte le pagine renderizzano
- [ ] Navigazione funziona
- [ ] Form validati
- [ ] Loading states
- [ ] Error handling
- [ ] Dark mode funziona
- [ ] Responsive design
- [ ] Animazioni smooth
- [ ] Tests passano (coverage >60%)

### Database
- [ ] Migrations applicate
- [ ] Seed data caricato
- [ ] Indexes configurati
- [ ] Backup testato

### Deployment
- [ ] Build production funziona
- [ ] Environment variables settate
- [ ] Runs su localhost senza errori
- [ ] Performance accettabile (<2s page load)

---

## 🎉 Cosa Fare Dopo il Completamento

1. **User Acceptance Testing**
   - Testa con utenti reali
   - Raccogli feedback
   - Itera su miglioramenti

2. **Documentazione Utente**
   - Crea USER_GUIDE.md
   - Screenshots
   - Video tutorial

3. **Ottimizzazioni**
   - Performance monitoring
   - Query optimization
   - Caching strategy

4. **Deploy Cloud** (opzionale)
   - Setup su server remoto
   - CI/CD pipeline
   - Monitoring & alerting

---

## 💡 Best Practices

### Durante lo Sviluppo

1. **Commit spesso** - dopo ogni feature funzionante
2. **Test prima di proseguire** - non saltare testing
3. **Leggi i commenti** - codice generato è commentato
4. **Usa checklist** - verifica ogni fase
5. **Backup database** - prima di migrations importanti
6. **Branch strategy** - usa git branches per features
7. **Code review** - chiedi a Claude Code di revieware il suo codice

### Con Claude Code

1. **Sii specifico** - più dettagli = risultati migliori
2. **Un task alla volta** - non sovraccaricare
3. **Verifica output** - sempre testa il codice generato
4. **Itera se necessario** - chiedi modifiche se serve
5. **Usa prompt da PROMPTS_FOR_CLAUDE.md** - sono ottimizzati

---

## 📄 License & Credits

**ProjectPulse**
Developed by: Nicola (with Claude)
Date: January 2026
Version: 1.0.0

---

## 🤝 Contributing

Questo è un progetto personale, ma se vuoi migliorarlo:

1. Fork il repository
2. Crea feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

## 📬 Contatti

Per domande o supporto:
- Consulta prima la documentazione in questa cartella
- Verifica troubleshooting in SETUP_LOCALHOST.md
- Usa Claude Code per debugging

---

**Buon lavoro con ProjectPulse! 🚀**

Remember: Sviluppa fase per fase, testa costantemente, e goditi il processo di creazione di un'app professionale! 💪
