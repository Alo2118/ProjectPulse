# ProjectPulse - Product Requirements Document

## 📋 Overview

**ProjectPulse** è una web application per la gestione progetti conforme alla struttura logica ISO 13485 per aziende in ambito medicale.

### Obiettivi Principali
- ✅ Tracciabilità completa per audit (audit trail)
- 🏥 Struttura ISO 13485 (Design Control, Risk Management, Document Control)
- 👥 Gestione multi-ruolo (Admin, Direzione, Dipendente)
- ⚡ Interfaccia moderna e intuitiva
- 🔧 Massima manutenibilità

### Target Users
- **5-10 utenti simultanei**
- **Ambiente**: Server locale (localhost)
- **Settore**: Medicale/Dispositivi medici

---

## 👥 User Roles & Permissions

### 1. Admin
- ✅ Gestione completa utenti (CRUD)
- ✅ Configurazione template progetti
- ✅ Accesso audit logs
- ✅ Configurazione sistema
- ✅ Backup e manutenzione

### 2. Direzione
- ✅ Vista globale progetti e task
- ✅ Approvazioni e review
- ✅ Risk management oversight
- ✅ Analytics e reportistica avanzata
- ✅ Commenti su task dipendenti
- ✅ Gestione stati progetti

### 3. Dipendente
- ✅ Creazione/gestione task personali
- ✅ Time tracking con timer
- ✅ Cambio stati task (Todo → In Progress → Completed/Blocked)
- ✅ Comunicazione tramite commenti
- ✅ Export report giornaliero PDF

---

## 🏗️ Technical Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client
- **Animations**: Framer Motion
- **Charts**: Recharts
- **PDF**: jsPDF / react-pdf
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express + TypeScript
- **Database**: SQL Server Express
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.io
- **PDF Generation**: PDFKit
- **Validation**: Zod
- **Logging**: Winston
- **API Documentation**: Swagger/OpenAPI

### Development
- **Package Manager**: npm
- **Linting**: ESLint
- **Formatting**: Prettier
- **Git Hooks**: Husky + lint-staged

---

## 🎯 Core Features

### 1. Authentication & Authorization
- Email/password login
- JWT-based authentication
- Role-based access control (RBAC)
- Password requirements: min 8 char, 1 uppercase, 1 number, 1 special
- Session management (8h token expiry)
- Password reset via email

### 2. Project Management (ISO 13485 Design Control)
- **Project Lifecycle**:
  - Planning → Design → Verification → Validation → Transfer → Maintenance
- **Fields**:
  - Unique code (PRJ-YYYY-NNN)
  - Name, description
  - Status, priority
  - Owner, team members
  - Start date, target date, completion date
  - Template association
- **Features**:
  - Template-based creation
  - Custom fields per template
  - Phase gates con approvazioni
  - Deliverables checklist per fase

### 3. Task Management
- **Task Properties**:
  - Title, description
  - Project association (opzionale - le task possono esistere senza progetto)
  - Parent task (opzionale - per task ramificate/subtask)
  - Status: Todo → In Progress → Completed/Blocked/Cancelled
  - Priority: Low, Medium, High, Critical
  - Assigned user
  - Estimated hours, actual hours
  - Due date
  - Tags (flexible JSONB)
- **Features**:
  - Kanban board view
  - List view con filtri
  - Time tracking integrato
  - Drag & drop stati
  - Bulk operations
  - Dependencies (nice-to-have fase 3)
  - **Standalone Tasks**: Task senza progetto associato (per attività generiche)
  - **Task Hierarchy**: Task con subtask (parent → children)

### 4. Time Tracking
- **Timer integrato** su ogni task
- Start/Stop/Pause
- Auto-save ogni 5 minuti
- Time entries storiche
- Aggregazione ore per task/progetto/utente
- Report ore lavorate

### 5. Communication
- **Thread commenti** su ogni task
- Menzioni utenti (@username)
- Notifiche push real-time
- Allegati (file upload)
- Flag commenti interni (solo direzione)

### 6. User Inputs (Segnalazioni/Suggerimenti)
Sistema per raccogliere input da tutti gli utenti dell'organizzazione.

- **Input Properties**:
  - Title, description
  - Category: Bug, Feature Request, Improvement, Question, Other
  - Priority: Low, Medium, High (solo suggerimento, può essere modificata durante processing)
  - Status: Pending → Processing → Resolved
  - Allegati (file upload opzionale)
  - Creator (automatico)
  - Processor (chi prende in carico l'input)
  - Resolution type, resolution notes

- **Permissions**:
  - ✅ **Tutti gli utenti** possono creare input
  - ✅ **Ogni utente** può modificare/eliminare solo i propri input (se status = Pending)
  - ✅ **Admin** può fare tutto (CRUD completo su tutti gli input)
  - ✅ **Dipendente/Direzione** possono processare gli input

- **Processing Workflow**:
  Un input può essere risolto in tre modi:
  1. **Converti in Task**: Crea una nuova task (con o senza progetto associato)
  2. **Converti in Progetto**: Crea un nuovo progetto (con template opzionale)
  3. **Presa Visione**: Archivia come "letto e valutato" senza azioni

- **Resolution Types**:
  - `converted_to_task` - Input convertito in task
  - `converted_to_project` - Input convertito in progetto
  - `acknowledged` - Presa visione
  - `rejected` - Rifiutato (con motivazione)
  - `duplicate` - Duplicato di altro input/task

- **Traceability**:
  - Link bidirezionale tra input e task/progetto creato
  - Audit trail completo di tutte le operazioni
  - Storico modifiche input

- **Features**:
  - Lista input con filtri (status, category, creator, date range)
  - Dashboard widget con conteggio input pending
  - Notifica al creator quando input viene processato
  - Notifica ad admin/direzione per nuovi input ad alta priorità

### 7. Risk Management (ISO 13485)
- **Risk Registry**:
  - Title, description
  - Category (Technical, Regulatory, Resource, Schedule)
  - Probability (Low, Medium, High)
  - Impact (Low, Medium, High)
  - Risk Level (calcolato: Probability × Impact)
  - Mitigation plan
  - Status (Open, Mitigated, Accepted, Closed)
  - Owner
- **Risk Matrix** visualization
- Risk trend analysis

### 8. Document Control (ISO 13485)
- **Document Types**:
  - Design Input
  - Design Output
  - Verification Report
  - Validation Report
  - Change Control
- **Properties**:
  - Title, version
  - Status (Draft, Review, Approved, Obsolete)
  - File upload
  - Approval workflow
  - Version history
- **Features**:
  - Document numbering (DOC-YYYY-NNN)
  - Digital signatures (approvazioni)
  - Obsolete document archiving

### 9. Audit Trail
- **Log completo** ogni operazione:
  - Entity type (project, task, risk, document, user)
  - Action (create, update, delete, status_change)
  - User, timestamp
  - IP address, user agent
  - Old data vs New data (JSONB diff)
- **Viewer** con filtri avanzati
- Export audit trail per compliance
- Retention policy configurabile

### 10. Notifications (Push)
- **Eventi notificabili**:
  - Nuovo commento
  - Task assegnato
  - Task bloccato
  - Approvazione richiesta
  - Risk critico identificato
  - Documento caricato per review
  - Nuovo input ricevuto (per admin/direzione)
  - Input processato (per creator)
  - Input convertito in task/progetto
- **Delivery**:
  - In-app (Socket.io real-time)
  - Badge counter
  - Mark as read/unread
  - Email per eventi critici (opzionale)

### 11. Reporting & Analytics
- **Report Giornaliero (PDF)**:
  - Task completati
  - Task in progress
  - Blocchi attivi
  - Ore lavorate
  - Export automatico
- **Dashboard Analytics**:
  - Task completion rate
  - Burndown chart
  - Velocity team
  - Lead time medio
  - Distribuzione ore per progetto
  - Risk exposure
- **Export**:
  - PDF reports
  - Excel exports (task list, time entries)
  - CSV bulk export

### 12. Project Templates
- **Template editor** (Admin)
- **Componenti template**:
  - Fasi predefinite
  - Task standard per fase
  - Milestone
  - Checklist deliverables
  - Custom fields
- **Template library**:
  - "Sviluppo Software"
  - "Validazione Dispositivo Medico"
  - "Clinical Evaluation"
  - Custom templates

---

## 🎨 UI/UX Requirements

### Design System
- **Tailwind CSS** per styling consistente
- **Palette colori**:
  - Primary: Blue (#0ea5e9)
  - Success: Green (#10b981)
  - Warning: Yellow (#f59e0b)
  - Danger: Red (#ef4444)
  - Neutral: Gray scale
- **Typography**: Inter font family
- **Spacing**: Tailwind scale (4px base)
- **Shadows**: Subtle, modern
- **Borders**: Rounded (4-8px)

### Dark/Light Mode
- Toggle in header
- Persistenza preferenza (localStorage)
- Palette colori adattata per dark mode
- Transizioni smooth tra mode

### Animations (Framer Motion)
- **Principi**:
  - Subtle (200-300ms)
  - Purpose-driven
  - GPU-accelerated (transform, opacity)
- **Use cases**:
  - Card hover effects
  - Modal open/close
  - Status badge transitions
  - Notification toasts
  - List item add/remove

### Responsive Design
- **Desktop-first** (primary use case)
- Responsive tablet/mobile (secondary)
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

### Accessibility
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus states
- Color contrast WCAG AA

---

## 🗄️ Data Model

Vedi **server/prisma/schema.prisma** per schema completo.

### Entità Principali
1. **users** - Utenti sistema
2. **projects** - Progetti
3. **project_templates** - Template progetti
4. **tasks** - Task (con supporto per hierarchy e standalone)
5. **time_entries** - Tracciamento tempo
6. **comments** - Comunicazione
7. **risks** - Risk management
8. **documents** - Document control
9. **audit_logs** - Audit trail
10. **notifications** - Notifiche
11. **user_inputs** - Segnalazioni/suggerimenti utenti

### Relazioni Chiave
- User → Projects (owner)
- User → Tasks (assigned)
- Project → Tasks (1:N, opzionale - task possono esistere senza progetto)
- Project → Risks (1:N)
- Project → Documents (1:N)
- Task → Comments (1:N)
- Task → TimeEntries (1:N)
- Task → SubTasks (1:N, self-reference per hierarchy)
- User → UserInputs (creator, 1:N)
- UserInput → Task (opzionale, quando convertito)
- UserInput → Project (opzionale, quando convertito)

---

## 🔐 Security Requirements

### Authentication
- Password hashing: bcrypt (12 rounds)
- JWT tokens (8h expiry)
- Refresh tokens (7 days, httpOnly cookie)
- CSRF protection
- Rate limiting (login attempts)

### Authorization
- Role-based access control (RBAC)
- Middleware per route protection
- Resource-level permissions

### Data Protection
- Input validation (Zod schemas)
- SQL injection prevention (Prisma ORM)
- XSS protection
- CORS configuration (localhost only)
- Helmet.js security headers

### Audit & Compliance
- Tutte le operazioni CRUD loggato
- IP address tracking
- Session management
- Data retention policies

---

## 📊 Performance Requirements

### Response Times
- API endpoints: < 200ms (avg)
- Page load: < 2s
- Real-time notifications: < 100ms latency

### Scalability
- Support 5-10 concurrent users (initial)
- Database: SQL Server Express con indexes appropriati
- Pagination per liste grandi (>100 items)

### Caching
- API response caching (Redis nice-to-have)
- Static asset caching
- Browser caching headers

---

## 🧪 Testing Strategy

### Frontend
- Unit tests: Vitest
- Component tests: React Testing Library
- E2E tests: Playwright (fase 3)

### Backend
- Unit tests: Jest
- Integration tests: Supertest
- API tests: Postman/Thunder Client

### Coverage Target
- Critical paths: 80%+
- Overall: 60%+

---

## 📦 Deployment (Localhost)

### Requirements
- Node.js 18+
- SQL Server Express
- Git

### Setup
```bash
# Install dependencies
npm install

# Setup database
npm run db:setup

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development
npm run dev
```

### Environment
- Development: localhost:5173 (frontend) + localhost:3000 (backend)
- Database: localhost:1433

---

## 🚀 Development Phases

### Phase 1 - MVP Core (3-4 weeks)
- [ ] Project setup & infrastructure
- [ ] Database schema & migrations
- [ ] Authentication system
- [ ] Basic CRUD (Projects, Tasks)
- [ ] Time tracking
- [ ] Comments
- [ ] Basic dashboards (Dipendente, Direzione)

### Phase 2 - ISO Features (2-3 weeks)
- [ ] Project templates
- [ ] Risk management
- [ ] Document control
- [ ] Audit trail complete
- [ ] PDF reports

### Phase 3 - Advanced Features (2 weeks)
- [ ] Real-time notifications (Socket.io)
- [ ] Advanced analytics
- [ ] Bulk operations
- [ ] Dark mode
- [ ] Animations

### Phase 4 - Polish & Testing (1 week)
- [ ] Testing complete
- [ ] Performance optimization
- [ ] Documentation
- [ ] Bug fixes

---

## 📝 Key Design Decisions

### Why Zustand over Redux?
- Più semplice e leggero
- Meno boilerplate
- Performance migliori
- Più facile da mantenere

### Why Prisma over TypeORM?
- Type-safety eccellente
- Migrations chiare
- Query builder intuitivo
- Auto-completion IDE

### Why Socket.io?
- Real-time bidirezionale
- Fallback automatico
- Room-based broadcasting
- Reconnection automatica

### Monorepo vs Separate Repos?
- **Scelta**: Monorepo
- Condivisione types
- Sviluppo sincronizzato
- Deploy più semplice (localhost)

---

## 🎯 Success Metrics

### User Adoption
- Daily active users: 80%+
- Feature usage rate: 60%+

### Performance
- Page load time: < 2s
- API response time: < 200ms
- Uptime: 99%+

### Quality
- Bug rate: < 5 critical bugs/month
- User satisfaction: 4/5+

---

## 📚 Additional Resources

- **IMPLEMENTATION_GUIDE.md** - Step-by-step development guide
- **TECH_STACK.md** - Detailed technical specifications
- **server/prisma/schema.prisma** - Database schema
- **PROJECT_STRUCTURE.md** - File system structure
- **SETUP_LOCALHOST.md** - Local setup instructions
- **PROMPTS_FOR_CLAUDE.md** - Optimized prompts for Claude Code

---

## 🤝 Team & Stakeholders

### Development Team
- Developer: [Your name]
- AI Assistant: Claude Code

### Stakeholders
- End Users: 5-10 team members (Admin, Direzione, Dipendenti)
- Industry: Medical devices / ISO 13485 compliance

---

## ✅ Definition of Done

Una feature è "Done" quando:
- [ ] Codice implementato e testato
- [ ] Tests passano (unit + integration)
- [ ] Code review completato
- [ ] Documentazione aggiornata
- [ ] UI/UX reviewed
- [ ] Performance acceptable
- [ ] Security checked
- [ ] Deployed su localhost

---

## 📞 Support & Maintenance

### Known Limitations
- Localhost only (non production-ready initially)
- Single server (no load balancing)
- File upload size limit: 10MB
- Concurrent users: 5-10

### Future Enhancements (Post-MVP)
- Multi-language support (i18n)
- Mobile app (React Native)
- Advanced reporting (BI integration)
- Email notifications
- SSO integration
- Cloud deployment

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: Nicola (with Claude)
