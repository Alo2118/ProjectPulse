# ProjectPulse - Development Rules & Standards

## 🎯 Purpose

Questo documento definisce **regole obbligatorie**, **standard di codifica** e **best practices** che Claude Code DEVE seguire durante lo sviluppo di ProjectPulse.

**IMPORTANTE**: Queste regole sono NON NEGOZIABILI. Ogni deviazione deve essere esplicitamente discussa e approvata.

---

## 📋 Come Usare Questo File

### Per Claude Code:
Leggi questo file PRIMA di generare qualsiasi codice. Segui TUTTE le regole. Se una richiesta viola queste regole, segnalalo e proponi alternative conformi.

### Per il Developer:
Includi questo file nel context quando chiami Claude Code per ogni task di sviluppo.

---

## 🏗️ ARCHITETTURA & DESIGN PATTERNS

### Rule 1: Separation of Concerns (OBBLIGATORIO)

**Backend:**
```
Controller → Service → Repository (Prisma)
   ↓           ↓            ↓
Thin      Business     Data Access
Layer     Logic        Layer
```

**VIETATO:**
- ❌ Business logic nei controllers
- ❌ Query dirette nei controllers
- ❌ Logica UI nei services

**OBBLIGATORIO:**
- ✅ Controllers: solo validazione, chiamata service, response formatting
- ✅ Services: tutta la business logic
- ✅ Prisma: solo accesso dati

**Esempio Corretto:**
```typescript
// ❌ SBAGLIATO
async function createProject(req, res) {
  const project = await prisma.project.create({ data: req.body });
  res.json(project);
}

// ✅ CORRETTO
// Controller
async function createProject(req, res) {
  const validated = createProjectSchema.parse(req.body);
  const project = await projectService.create(validated, req.user.id);
  res.json({ success: true, data: project });
}

// Service
async function create(data, userId) {
  const code = await generateProjectCode();
  const project = await prisma.project.create({ 
    data: { ...data, code, createdBy: userId } 
  });
  await auditService.log('project', project.id, 'create', userId, null, project);
  return project;
}
```

---

### Rule 2: DRY (Don't Repeat Yourself)

**OBBLIGATORIO:**
- ✅ Crea utilities per codice ripetuto (>3 volte)
- ✅ Usa componenti React riutilizzabili
- ✅ Centralizza configurazioni
- ✅ Shared types tra frontend e backend (cartella shared/)

**Esempio:**
```typescript
// ❌ SBAGLIATO - Ripetuto in 10 files
const formattedDate = new Date(date).toLocaleDateString('it-IT');

// ✅ CORRETTO - Utility centralizzata
// utils/dateUtils.ts
export const formatDate = (date: Date) => date.toLocaleDateString('it-IT');
```

---

### Rule 3: Single Responsibility Principle

**OBBLIGATORIO:**
- ✅ Ogni funzione fa UNA cosa
- ✅ Ogni componente ha UNO scopo
- ✅ File max 300 righe (split se supera)

**Esempio:**
```typescript
// ❌ SBAGLIATO
function createAndNotifyUser(data) {
  const user = createUser(data);
  sendEmail(user.email);
  logToAudit(user);
  return user;
}

// ✅ CORRETTO
function createUser(data) {
  return prisma.user.create({ data });
}

async function onUserCreated(user) {
  await notificationService.sendWelcomeEmail(user);
  await auditService.logUserCreation(user);
}
```

---

## 💻 TYPESCRIPT STANDARDS

### Rule 4: Type Safety (OBBLIGATORIO)

**tsconfig.json DEVE avere:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**VIETATO:**
- ❌ `any` type (usa `unknown` se necessario)
- ❌ `@ts-ignore` senza commento che spiega perché
- ❌ Type assertions non sicure (`as any`)

**OBBLIGATORIO:**
- ✅ Interface per tutti gli oggetti
- ✅ Type per tutte le funzioni (parametri + return)
- ✅ Enum per valori fissi
- ✅ Generics dove appropriato

**Esempio:**
```typescript
// ❌ SBAGLIATO
function getUser(id) {
  return prisma.user.findUnique({ where: { id } });
}

// ✅ CORRETTO
interface User {
  id: string;
  email: string;
  role: UserRole;
}

async function getUser(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}
```

---

### Rule 5: Naming Conventions

**OBBLIGATORIO:**

| Tipo | Convenzione | Esempio |
|------|-------------|---------|
| Variables/Functions | camelCase | `getUserById`, `projectData` |
| Interfaces/Types | PascalCase | `User`, `ProjectStatus` |
| Components | PascalCase | `ProjectCard`, `TaskList` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_URL` |
| Files (components) | PascalCase.tsx | `ProjectCard.tsx` |
| Files (utilities) | camelCase.ts | `dateUtils.ts` |
| CSS Classes | kebab-case | `project-card`, `btn-primary` |

**VIETATO:**
- ❌ Abbreviazioni non standard (`usr`, `prj`, `btn`)
- ❌ Single letter (eccetto loop: `i`, `j`, `k`)
- ❌ Nomi generici (`data`, `info`, `temp`, `x`)

**OBBLIGATORIO:**
- ✅ Nomi descrittivi (`projectData`, `userEmail`, `isLoading`)
- ✅ Boolean con prefissi `is`, `has`, `should` (`isActive`, `hasPermission`)
- ✅ Handler con prefissi `handle`, `on` (`handleClick`, `onSubmit`)

---

## 🔒 SECURITY STANDARDS

### Rule 6: Input Validation (OBBLIGATORIO)

**OBBLIGATORIO:**
- ✅ Valida TUTTI gli input con Zod
- ✅ Sanitize input prima di salvare in DB
- ✅ Valida anche sul frontend (doppia validazione)

**Esempio:**
```typescript
// Schema Zod
const createProjectSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: z.string().datetime().optional(),
});

// Controller
const validated = createProjectSchema.parse(req.body); // Throws se invalido
```

---

### Rule 7: Authentication & Authorization

**OBBLIGATORIO:**
- ✅ TUTTE le route protette con `authMiddleware`
- ✅ Verifica permessi con `authorize(...roles)`
- ✅ JWT con expiry (8h access, 7d refresh)
- ✅ Password hash con bcrypt (12 rounds)
- ✅ HttpOnly cookies per refresh token

**VIETATO:**
- ❌ Token in localStorage senza encryption
- ❌ Password in plaintext (mai)
- ❌ Route pubbliche che espongono dati sensibili

**Esempio:**
```typescript
// Tutte le route protette
router.get('/projects', authMiddleware, authorize('direzione', 'admin'), getProjects);
router.post('/tasks', authMiddleware, createTask); // Tutti i ruoli autenticati
```

---

### Rule 8: Data Protection

**OBBLIGATORIO:**
- ✅ Mai restituire password hash nelle response
- ✅ Filtra dati sensibili prima di logging
- ✅ Usa HTTPS in produzione (anche se locale, prepara per futuro)

**Esempio:**
```typescript
// ✅ CORRETTO - Escludi password
const user = await prisma.user.findUnique({ 
  where: { id },
  select: { id: true, email: true, role: true, firstName: true, lastName: true }
});
// Oppure
const { passwordHash, ...userWithoutPassword } = user;
```

---

## 🗄️ DATABASE BEST PRACTICES

### Rule 9: Query Optimization

**OBBLIGATORIO:**
- ✅ Usa `select` per prendere solo campi necessari
- ✅ Usa `include` con parsimonia (solo relazioni necessarie)
- ✅ Pagination per liste >100 items
- ✅ Indexes su colonne filtrate spesso

**Esempio:**
```typescript
// ❌ SBAGLIATO - Prende tutto
const tasks = await prisma.task.findMany();

// ✅ CORRETTO - Solo campi necessari + pagination
const tasks = await prisma.task.findMany({
  select: { id: true, title: true, status: true, priority: true },
  where: { projectId },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
});
```

---

### Rule 10: Transactions (OBBLIGATORIO)

**OBBLIGATORIO:**
Usa transactions per operazioni multi-step:

```typescript
// ✅ CORRETTO
await prisma.$transaction(async (tx) => {
  const project = await tx.project.create({ data: projectData });
  await tx.auditLog.create({ data: { entityType: 'project', ... } });
  await tx.notification.create({ data: { userId: ownerId, ... } });
});
```

**Quando usare:**
- ✅ Create + Audit log
- ✅ Delete + Cascade updates
- ✅ Update + Notification

---

### Rule 11: Soft Delete (OBBLIGATORIO)

**OBBLIGATORIO:**
- ✅ Mai `DELETE` fisico su: projects, tasks, users, documents, risks
- ✅ Usa campo `is_deleted: true`
- ✅ Filter `is_deleted = false` in tutte le query

**Esempio:**
```typescript
// ✅ CORRETTO
async function deleteProject(id: string, userId: string) {
  return prisma.project.update({
    where: { id },
    data: { isDeleted: true, updatedAt: new Date() }
  });
}

// Query escludono soft-deleted
const projects = await prisma.project.findMany({
  where: { isDeleted: false }
});
```

---

## ⚛️ REACT BEST PRACTICES

### Rule 12: Component Structure

**OBBLIGATORIO:**
```typescript
// Ordine fisso
1. Imports (React first, then libraries, then local)
2. Types/Interfaces
3. Component
4. Styled components (se inline)
5. Export

// Esempio:
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common';

interface ProjectCardProps {
  project: Project;
  onEdit: (id: string) => void;
}

export function ProjectCard({ project, onEdit }: ProjectCardProps) {
  // Hooks prima
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Event handlers dopo
  const handleClick = () => {...};
  
  // Render ultimo
  return <div>...</div>;
}
```

---

### Rule 13: Hooks Rules (OBBLIGATORIO)

**OBBLIGATORIO:**
- ✅ Hooks SEMPRE all'inizio del componente
- ✅ Mai dentro condizioni/loops
- ✅ Custom hooks iniziano con `use`
- ✅ Dependencies array completo in useEffect

**VIETATO:**
```typescript
// ❌ SBAGLIATO
if (condition) {
  const [state, setState] = useState(0); // VIETATO
}

// ❌ SBAGLIATO - Missing dependencies
useEffect(() => {
  fetchData(userId);
}, []); // userId mancante
```

**OBBLIGATORIO:**
```typescript
// ✅ CORRETTO
const [state, setState] = useState(0);

useEffect(() => {
  fetchData(userId);
}, [userId]); // Dependencies complete
```

---

### Rule 14: State Management (Zustand)

**OBBLIGATORIO:**
- ✅ Uno store per dominio (authStore, projectStore, taskStore)
- ✅ Actions sempre async
- ✅ Error handling in ogni action

**Esempio:**
```typescript
// stores/projectStore.ts
interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (data: CreateProjectInput) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,
  
  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectService.getProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  createProject: async (data) => {
    try {
      const project = await projectService.createProject(data);
      set({ projects: [...get().projects, project] });
    } catch (error) {
      set({ error: error.message });
      throw error; // Re-throw per UI handling
    }
  }
}));
```

---

### Rule 15: Performance Optimization

**OBBLIGATORIO:**
- ✅ `React.memo` per componenti pesanti che re-renderizzano spesso
- ✅ `useMemo` per calcoli costosi
- ✅ `useCallback` per funzioni passate come props
- ✅ Lazy loading per route (`React.lazy`)
- ✅ Virtual scrolling per liste >100 items

**Esempio:**
```typescript
// ✅ CORRETTO
const MemoizedTaskCard = React.memo(TaskCard);

const expensiveValue = useMemo(() => {
  return tasks.filter(t => t.status === 'completed').length;
}, [tasks]);

const handleClick = useCallback(() => {
  onTaskClick(task.id);
}, [task.id, onTaskClick]);
```

---

## 🎨 STYLING & UI

### Rule 16: Tailwind Best Practices

**OBBLIGATORIO:**
- ✅ Usa classi Tailwind, NO inline styles
- ✅ Crea componenti per pattern ripetuti
- ✅ Dark mode: TUTTE le classi con `dark:` variant
- ✅ Responsive: mobile-first con `sm:`, `md:`, `lg:` breakpoints

**VIETATO:**
- ❌ `style={{ ... }}` (usa Tailwind)
- ❌ CSS custom (usa tailwind.config.js per extend)
- ❌ `!important`

**Esempio:**
```typescript
// ❌ SBAGLIATO
<div style={{ padding: '16px', backgroundColor: '#fff' }}>

// ✅ CORRETTO
<div className="p-4 bg-white dark:bg-slate-800">

// ✅ CORRETTO - Componente riutilizzabile
// components/common/Card.tsx
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`p-4 bg-white dark:bg-slate-800 rounded-lg shadow ${className}`}>
      {children}
    </div>
  );
}
```

---

### Rule 17: Accessibility (a11y)

**OBBLIGATORIO:**
- ✅ Semantic HTML (`<button>`, `<nav>`, `<main>`, `<article>`)
- ✅ ARIA labels su icon buttons
- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ Focus states visibili
- ✅ Color contrast WCAG AA minimum

**Esempio:**
```typescript
// ✅ CORRETTO
<button 
  aria-label="Close modal"
  onClick={onClose}
  className="focus:ring-2 focus:ring-primary-500"
>
  <XIcon />
</button>

// Input con label
<label htmlFor="email" className="block text-sm font-medium">
  Email
  <input id="email" type="email" required />
</label>
```

---

## 🧪 TESTING STANDARDS

### Rule 18: Testing Requirements

**OBBLIGATORIO:**
- ✅ Unit tests per TUTTE le functions in services/
- ✅ Integration tests per TUTTE le API routes
- ✅ Component tests per common/ components
- ✅ Coverage minimum: Backend 70%, Frontend 60%

**Struttura test:**
```typescript
describe('ProjectService', () => {
  describe('createProject', () => {
    it('should create project with generated code', async () => {
      // Arrange
      const data = { name: 'Test Project' };
      const userId = 'user-123';
      
      // Act
      const result = await projectService.createProject(data, userId);
      
      // Assert
      expect(result.code).toMatch(/PRJ-\d{4}-\d{3}/);
      expect(result.name).toBe(data.name);
    });
    
    it('should throw error if name is empty', async () => {
      await expect(
        projectService.createProject({ name: '' }, 'user-123')
      ).rejects.toThrow('Name is required');
    });
  });
});
```

---

## 📝 CODE DOCUMENTATION

### Rule 19: Comments & Documentation

**OBBLIGATORIO:**
- ✅ JSDoc per TUTTE le exported functions
- ✅ Commenti per logica complessa
- ✅ TODO con nome e data: `// TODO(Nicola, 2026-01-21): Implement cache`

**VIETATO:**
- ❌ Commenti ovvi: `// Increment i`
- ❌ Codice commentato (cancella)

**Esempio:**
```typescript
/**
 * Creates a new project with auto-generated code
 * @param data - Project creation data
 * @param userId - ID of user creating the project
 * @returns Created project with generated code
 * @throws {ValidationError} If data is invalid
 */
export async function createProject(
  data: CreateProjectInput,
  userId: string
): Promise<Project> {
  // Generate unique project code (PRJ-YYYY-NNN)
  const code = await generateProjectCode();
  
  // Create project and log to audit trail
  const project = await prisma.project.create({ 
    data: { ...data, code, createdBy: userId } 
  });
  
  await auditService.log('project', project.id, 'create', userId, null, project);
  
  return project;
}
```

---

## 🚨 ERROR HANDLING

### Rule 20: Error Handling (OBBLIGATORIO)

**OBBLIGATORIO:**
- ✅ Try-catch in TUTTI i async functions
- ✅ Error messages user-friendly (frontend)
- ✅ Error logging con Winston (backend)
- ✅ HTTP status codes corretti

**Status Codes Standard:**
- 200: Success
- 201: Created
- 400: Bad Request (validation)
- 401: Unauthorized (no token)
- 403: Forbidden (no permission)
- 404: Not Found
- 500: Internal Server Error

**Esempio:**
```typescript
// Backend
try {
  const project = await projectService.getProject(id);
  if (!project) {
    return res.status(404).json({ 
      success: false, 
      error: 'Project not found' 
    });
  }
  res.json({ success: true, data: project });
} catch (error) {
  logger.error('Error fetching project', { error, projectId: id });
  res.status(500).json({ 
    success: false, 
    error: 'Failed to fetch project' 
  });
}

// Frontend
try {
  await projectStore.createProject(data);
  toast.success('Project created successfully');
  navigate('/projects');
} catch (error) {
  toast.error(error.message || 'Failed to create project');
}
```

---

## 🔄 GIT WORKFLOW

### Rule 21: Commit Standards

**OBBLIGATORIO:**
- ✅ Commit messages format: `type(scope): message`
- ✅ Types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`
- ✅ Commit atomici (una feature/fix per commit)

**Esempio:**
```bash
✅ feat(auth): implement JWT authentication
✅ fix(tasks): resolve timer auto-save issue
✅ refactor(projects): extract validation to service
✅ test(auth): add unit tests for login
✅ docs(readme): update setup instructions
```

**VIETATO:**
```bash
❌ update
❌ fix bug
❌ WIP
❌ asdf
```

---

### Rule 22: Branch Strategy

**OBBLIGATORIO:**
- ✅ `main` branch protetta (sempre working)
- ✅ Feature branches: `feature/nome-feature`
- ✅ Bug fix branches: `fix/nome-bug`
- ✅ Merge a `main` solo dopo test passano

---

## 🎯 CODE REVIEW CHECKLIST

Prima di considerare il codice "completo", verifica:

### Generale
- [ ] Segue tutte le regole in questo documento
- [ ] No `console.log` (usa logger)
- [ ] No codice commentato
- [ ] No warnings TypeScript
- [ ] No warnings ESLint

### Sicurezza
- [ ] Input validato con Zod
- [ ] Autenticazione su route protette
- [ ] Password hashate
- [ ] No dati sensibili in response

### Performance
- [ ] Query ottimizzate (select, pagination)
- [ ] No N+1 queries
- [ ] Memo/Callback dove appropriato

### Testing
- [ ] Unit tests presenti e passano
- [ ] Coverage raggiunto
- [ ] Edge cases testati

### UI/UX
- [ ] Responsive design
- [ ] Dark mode funziona
- [ ] Loading states presenti
- [ ] Error handling user-friendly
- [ ] Accessibile (a11y)

---

## 🚀 CONTINUOUS IMPROVEMENT

### Rule 23: Refactoring

**OBBLIGATORIO:**
- ✅ Refactor quando vedi codice ripetuto 3+ volte
- ✅ Refactor quando funzione >50 righe
- ✅ Refactor quando componente >300 righe

---

### Rule 24: Performance Monitoring

**OBBLIGATORIO:**
- ✅ Log slow queries (>1s)
- ✅ Monitor API response times
- ✅ Track bundle size (frontend)

---

## 📚 RESOURCES & REFERENCES

### Official Documentation
- [TypeScript](https://www.typescriptlang.org/docs/)
- [React](https://react.dev/)
- [Prisma](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zod](https://zod.dev/)

### Best Practices
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [React Best Practices](https://react.dev/learn)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

## ⚠️ VIOLATIONS

Se Claude Code genera codice che viola queste regole:

1. **STOP** - Non procedere
2. **SEGNALA** la violazione
3. **PROPONI** alternativa conforme
4. **ATTENDI** approvazione prima di continuare

---

## 🎓 LEARNING & ADAPTATION

Queste regole possono evolvere. Suggerimenti per miglioramenti sono benvenuti, ma ogni modifica deve essere documentata e approvata.

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Status**: MANDATORY - Non-Negotiable

---

## 📝 QUICK REFERENCE CARD

### Prima di scrivere codice, chiediti:

1. ✅ È type-safe? (no `any`)
2. ✅ È validato? (Zod)
3. ✅ È testabile? (pure function quando possibile)
4. ✅ È documentato? (JSDoc)
5. ✅ È sicuro? (auth, input validation)
6. ✅ È performante? (query optimization, memo)
7. ✅ È accessibile? (a11y)
8. ✅ È responsive? (mobile, tablet, desktop)
9. ✅ È manutenibile? (DRY, SOLID, clean code)
10. ✅ Segue naming conventions?

**Se anche UNA risposta è NO → REFACTOR prima di procedere**

---

**Remember**: Queste regole esistono per creare un'app **professionale**, **scalabile** e **manutenibile**. Non sono ostacoli, sono fondamenta! 💪

---

## 🐛 ERRORI RISOLTI & LESSONS LEARNED

### Errore 1: Schema Prisma non allineato con PRD (2026-01-21)

**Problema**: I services sono stati scritti assumendo campi che non esistevano nello schema Prisma:
- `isDeleted` per soft delete
- `isInternal` per commenti interni
- `isRunning` per timer attivi
- Enum con valori mancanti (TaskStatus senza `blocked`, `cancelled`)

**Soluzione**:
1. SEMPRE verificare lo schema Prisma PRIMA di scrivere services
2. Allineare lo schema con i requisiti del PRD
3. Rigenerare Prisma client dopo modifiche schema

**Regola Aggiunta**: Prima di scrivere business logic, verificare che il data model supporti tutte le operazioni richieste.

### Errore 2: Tipi custom in conflitto con Prisma (2026-01-21)

**Problema**: Definire enum TypeScript separati (es. `TaskStatus`) che non corrispondono agli enum generati da Prisma causa errori di tipo.

**Soluzione**:
1. Usare i tipi generati da Prisma direttamente
2. Se servono tipi custom, estenderli da Prisma types
3. Non ridefinire enum già presenti in Prisma

**Regola Aggiunta**: Usare `import { TaskStatus } from '@prisma/client'` invece di definire enum duplicati.

### Errore 3: Seed file non allineato con schema aggiornato (2026-01-21)

**Problema**: Dopo aggiornamento dello schema Prisma, il file seed.ts conteneva:
- Valori enum obsoleti (`'active'` → `'design'`, `'possible'` → `'medium'`)
- Nomi di campi errati (`mitigation` → `mitigationPlan`)

**Soluzione**:
1. Verificare SEMPRE che il seed file usi i valori enum corretti dallo schema
2. Controllare i nomi dei campi nel modello Prisma prima di modificare il seed
3. Dopo `prisma db push --force-reset`, rigenerare anche il seed

**Regola Aggiunta**: Quando lo schema Prisma cambia, aggiornare immediatamente seed.ts con i nuovi valori enum e nomi campi.

### Errore 4: Nomi campi frontend non allineati con schema (2026-01-22)

**Problema**: Il frontend usava nomi di campi non presenti nello schema Prisma:
- `project.targetDate` invece di `project.targetEndDate`
- `ProjectPriority` con `critical` (non esiste nello schema, solo `TaskPriority` ha `critical`)

**Soluzione**:
1. Verificare i nomi dei campi nel file `types/index.ts` che devono corrispondere esattamente a Prisma
2. Usare TypeScript strict per intercettare questi errori in compilazione
3. Eseguire `npx tsc --noEmit` dopo ogni modifica per verificare

**Regola Aggiunta**: Prima di creare pagine frontend, controllare sempre i nomi esatti dei campi nel file `types/index.ts` che rispecchia lo schema Prisma.

### Errore 5: Configurazione Prisma 7 (2026-01-22)

**Problema**: Prisma 7 ha cambiato la configurazione del datasource - la proprietà `url` nello schema.prisma non è più supportata.

**Soluzione**:
1. Rimuovere `url = env("DATABASE_URL")` dal blocco `datasource` in `schema.prisma`
2. Creare `prisma/prisma.config.ts` per la configurazione di Migrate
3. Usare `@prisma/adapter-mssql` per la connessione diretta al database
4. Passare l'adapter a `PrismaClient` nel costruttore

**Configurazione Corretta**:

```prisma
// schema.prisma
datasource db {
  provider = "sqlserver"
  // NO url property in Prisma 7
}
```

```typescript
// prisma/prisma.config.ts
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    adapter: async () => {
      const { PrismaSqlServer } = await import('@prisma/adapter-mssql')
      const connectionString = process.env.DATABASE_URL
      return new PrismaSqlServer({ connectionString })
    },
  },
})
```

```typescript
// src/models/prismaClient.ts
import { PrismaClient } from '@prisma/client'
import { PrismaSqlServer } from '@prisma/adapter-mssql'

const connectionString = process.env.DATABASE_URL
const adapter = new PrismaSqlServer({ connectionString })

export const prisma = new PrismaClient({ adapter })
```

**Regola Aggiunta**: Con Prisma 7+, usare sempre l'adapter pattern per la connessione al database. Installare `@prisma/adapter-mssql` per SQL Server Express.
