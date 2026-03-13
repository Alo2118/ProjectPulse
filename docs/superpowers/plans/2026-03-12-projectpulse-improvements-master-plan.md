# ProjectPulse — Piano di Miglioramento Completo

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare ProjectPulse da MVP funzionale a prodotto production-ready coprendo 8 aree: test automatizzati, view mode complete, notifiche real-time, ricerca avanzata, analytics, automazione UX, fix tecnici, e feature aggiuntive.

**Architecture:** Il piano e' organizzato in 8 chunk indipendenti, eseguibili in parallelo da agenti diversi. Ogni chunk produce software funzionante e testabile autonomamente. L'ordine suggerito segue la priorita' di impatto.

**Tech Stack:** Node.js, Express, Prisma 7, SQL Server, React 18, TypeScript, TanStack Query 5, Zustand, shadcn/ui, Vite, Jest, Supertest, Vitest, React Testing Library, @dnd-kit, socket.io-client, Recharts, Framer Motion

---

## Indice Chunk

| # | Chunk | Priorita' | Effort | Dipendenze |
|---|-------|-----------|--------|------------|
| 1 | Infrastruttura Test Automatizzati | Critico | Alto | Nessuna |
| 2 | View Mode Complete (Board, Gantt, Calendar) | Alto | Medio | Nessuna |
| 3 | Notifiche Real-Time (Socket.io Client) | Alto | Medio | Nessuna |
| 4 | Ricerca Avanzata (Faceted Search) | Medio | Medio | Nessuna |
| 5 | Analytics Avanzate (Burndown, Velocity) | Medio | Medio | Nessuna |
| 6 | Automazione UX (Recommendations, Logs) | Medio | Basso | Nessuna |
| 7 | Fix Tecnici Minori | Basso | Basso | Nessuna |
| 8 | Feature Aggiuntive (Bulk Ops, Shortcuts, Activity Log) | Variabile | Variabile | Nessuna |

---

## Chunk 1: Infrastruttura Test Automatizzati

**Obiettivo:** Configurare Jest (backend) e Vitest (frontend), creare test helper/factory, scrivere test per i service e componenti critici.

**Stato attuale:** Dipendenze installate (jest, ts-jest, supertest, vitest, @testing-library/react), directory `server/tests/` esiste ma vuota, nessun file di configurazione.

### Task 1.1: Configurazione Jest Backend

**Files:**
- Create: `server/jest.config.ts`
- Create: `server/tests/setup.ts`
- Create: `server/tests/helpers/prisma-mock.ts`
- Create: `server/tests/helpers/factory.ts`

- [ ] **Step 1: Creare jest.config.ts**

```typescript
// server/jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterSetup: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/controllers/**/*.ts',
    'src/utils/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
}

export default config
```

- [ ] **Step 2: Creare setup.ts per test environment**

```typescript
// server/tests/setup.ts
import { jest } from '@jest/globals'

// Mock logger to suppress output during tests
jest.mock('../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing'
process.env.NODE_ENV = 'test'
```

- [ ] **Step 3: Creare Prisma mock helper**

```typescript
// server/tests/helpers/prisma-mock.ts
import { PrismaClient } from '@prisma/client'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'

// Install: npm install -D jest-mock-extended (in server workspace)

export type MockPrismaClient = DeepMockProxy<PrismaClient>

export const createMockPrisma = (): MockPrismaClient => {
  return mockDeep<PrismaClient>()
}

// Re-export for convenience
export { mockDeep }
```

- [ ] **Step 4: Creare factory per test data**

```typescript
// server/tests/helpers/factory.ts
import { randomUUID } from 'crypto'

export const factory = {
  user: (overrides = {}) => ({
    id: randomUUID(),
    email: `user-${Date.now()}@test.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'dipendente' as const,
    passwordHash: '$2b$12$fakehashfortest',
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  project: (overrides = {}) => ({
    id: randomUUID(),
    code: `PRJ-2026-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
    name: 'Test Project',
    description: 'A test project',
    status: 'active' as const,
    priority: 'medium' as const,
    startDate: new Date(),
    targetEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    progress: 0,
    isDeleted: false,
    createdBy: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  task: (overrides = {}) => ({
    id: randomUUID(),
    code: `PRJ-2026-001-T${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
    title: 'Test Task',
    description: 'A test task',
    status: 'todo' as const,
    priority: 'medium' as const,
    taskType: 'task' as const,
    projectId: randomUUID(),
    assigneeId: null,
    parentId: null,
    estimatedHours: 8,
    actualHours: 0,
    sortOrder: 0,
    isDeleted: false,
    createdBy: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  risk: (overrides = {}) => ({
    id: randomUUID(),
    code: `PRJ-2026-001-R${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
    title: 'Test Risk',
    description: 'A test risk',
    probability: 'medium' as const,
    impact: 'medium' as const,
    status: 'open' as const,
    projectId: randomUUID(),
    isDeleted: false,
    createdBy: randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  notification: (overrides = {}) => ({
    id: randomUUID(),
    userId: randomUUID(),
    type: 'task_assigned' as const,
    title: 'Task Assigned',
    message: 'You were assigned a task',
    data: {},
    isRead: false,
    isDeleted: false,
    createdAt: new Date(),
    ...overrides,
  }),
}
```

- [ ] **Step 5: Installare jest-mock-extended**

Run: `cd server && npm install -D jest-mock-extended`

- [ ] **Step 6: Verificare che `npm test` funzioni (nessun test ancora, ma config OK)**

Run: `cd server && npx jest --passWithNoTests`
Expected: "No tests found" con exit 0

- [ ] **Step 7: Commit**

```bash
git add server/jest.config.ts server/tests/setup.ts server/tests/helpers/
git commit -m "test(backend): configure Jest with TypeScript, Prisma mock, and test factory"
```

---

### Task 1.2: Configurazione Vitest Frontend

**Files:**
- Create: `client/vitest.config.ts`
- Create: `client/src/test/setup.ts`
- Create: `client/src/test/test-utils.tsx`
- Create: `client/src/test/query-wrapper.tsx`

- [ ] **Step 1: Creare vitest.config.ts**

```typescript
// client/vitest.config.ts
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/components/**', 'src/hooks/**', 'src/lib/**', 'src/stores/**'],
      exclude: ['src/test/**', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Creare setup.ts**

```typescript
// client/src/test/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock matchMedia for theme tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
})

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
})
```

- [ ] **Step 3: Creare test-utils con QueryClient wrapper**

```typescript
// client/src/test/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ReactElement, ReactNode } from 'react'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface WrapperProps {
  children: ReactNode
  initialEntries?: string[]
}

function createWrapper(initialEntries: string[] = ['/']) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const queryClient = createTestQueryClient()
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

function customRender(
  ui: ReactElement,
  options?: RenderOptions & { initialEntries?: string[] }
) {
  const { initialEntries, ...renderOptions } = options ?? {}
  return render(ui, {
    wrapper: createWrapper(initialEntries),
    ...renderOptions,
  })
}

export * from '@testing-library/react'
export { customRender as render, createTestQueryClient }
```

- [ ] **Step 4: Verificare che `npm test` funzioni nel client**

Run: `cd client && npx vitest --run --passWithNoTests`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add client/vitest.config.ts client/src/test/
git commit -m "test(frontend): configure Vitest with React Testing Library, query wrapper, and browser mocks"
```

---

### Task 1.3: Test Backend — authService

**Files:**
- Create: `server/tests/unit/services/authService.test.ts`

- [ ] **Step 1: Scrivere test per login, token generation, password hashing**

```typescript
// server/tests/unit/services/authService.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Test password hashing and JWT generation without hitting DB
describe('authService', () => {
  describe('password hashing', () => {
    it('should hash password with bcrypt', async () => {
      const bcrypt = await import('bcrypt')
      const hash = await bcrypt.hash('testPassword123', 12)
      expect(hash).toBeDefined()
      expect(hash).not.toBe('testPassword123')
      const match = await bcrypt.compare('testPassword123', hash)
      expect(match).toBe(true)
    })

    it('should reject wrong password', async () => {
      const bcrypt = await import('bcrypt')
      const hash = await bcrypt.hash('testPassword123', 12)
      const match = await bcrypt.compare('wrongPassword', hash)
      expect(match).toBe(false)
    })
  })

  describe('JWT tokens', () => {
    it('should generate and verify access token', async () => {
      const jwt = await import('jsonwebtoken')
      const payload = { userId: 'test-id', email: 'test@test.com', role: 'admin' }
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '8h' })
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as typeof payload
      expect(decoded.userId).toBe('test-id')
      expect(decoded.email).toBe('test@test.com')
      expect(decoded.role).toBe('admin')
    })

    it('should reject expired token', async () => {
      const jwt = await import('jsonwebtoken')
      const payload = { userId: 'test-id' }
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '0s' })
      // Wait for token to expire
      await new Promise(r => setTimeout(r, 1100))
      expect(() => jwt.verify(token, process.env.JWT_SECRET!)).toThrow()
    })

    it('should reject token with wrong secret', async () => {
      const jwt = await import('jsonwebtoken')
      const token = jwt.sign({ userId: 'test-id' }, 'wrong-secret', { expiresIn: '1h' })
      expect(() => jwt.verify(token, process.env.JWT_SECRET!)).toThrow()
    })
  })
})
```

- [ ] **Step 2: Eseguire test**

Run: `cd server && npx jest tests/unit/services/authService.test.ts --verbose`
Expected: 5 test PASS

- [ ] **Step 3: Commit**

```bash
git add server/tests/unit/services/authService.test.ts
git commit -m "test(backend): add authService unit tests for password hashing and JWT"
```

---

### Task 1.4: Test Backend — codeGenerator

**Files:**
- Create: `server/tests/unit/utils/codeGenerator.test.ts`

- [ ] **Step 1: Scrivere test per tutti i generatori di codice**

```typescript
// server/tests/unit/utils/codeGenerator.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock Prisma client for code generators
const mockPrisma = {
  project: { count: jest.fn() },
  task: { count: jest.fn() },
  risk: { count: jest.fn() },
  document: { count: jest.fn() },
  userInput: { count: jest.fn() },
}

jest.mock('../../src/models/prismaClient', () => ({
  prisma: mockPrisma,
}))

describe('codeGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateProjectCode', () => {
    it('should generate PRJ-YYYY-NNN format', async () => {
      mockPrisma.project.count.mockResolvedValue(5)
      const { generateProjectCode } = await import('../../src/utils/codeGenerator')
      const code = await generateProjectCode()
      const year = new Date().getFullYear()
      expect(code).toMatch(new RegExp(`^PRJ-${year}-\\d{3}$`))
    })

    it('should increment from existing count', async () => {
      mockPrisma.project.count.mockResolvedValue(42)
      const { generateProjectCode } = await import('../../src/utils/codeGenerator')
      const code = await generateProjectCode()
      expect(code).toContain('043')
    })
  })

  describe('generateDocumentCode', () => {
    it('should generate DOC-YYYY-NNN format', async () => {
      mockPrisma.document.count.mockResolvedValue(0)
      const { generateDocumentCode } = await import('../../src/utils/codeGenerator')
      const code = await generateDocumentCode()
      const year = new Date().getFullYear()
      expect(code).toMatch(new RegExp(`^DOC-${year}-\\d{3}$`))
    })
  })
})
```

- [ ] **Step 2: Eseguire test**

Run: `cd server && npx jest tests/unit/utils/codeGenerator.test.ts --verbose`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/tests/unit/utils/codeGenerator.test.ts
git commit -m "test(backend): add codeGenerator unit tests"
```

---

### Task 1.5: Test Backend — errorMiddleware

**Files:**
- Create: `server/tests/unit/middleware/errorMiddleware.test.ts`

- [ ] **Step 1: Scrivere test per ogni tipo di errore gestito**

```typescript
// server/tests/unit/middleware/errorMiddleware.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../../src/middleware/errorMiddleware'

describe('AppError', () => {
  it('should create error with status code', () => {
    const error = new AppError('Not found', 404)
    expect(error.message).toBe('Not found')
    expect(error.statusCode).toBe(404)
    expect(error.isOperational).toBe(true)
  })

  it('should default to operational error', () => {
    const error = new AppError('Bad request', 400)
    expect(error.isOperational).toBe(true)
  })
})

describe('errorMiddleware', () => {
  const mockReq = {} as Request
  const mockNext = jest.fn() as unknown as NextFunction
  let mockRes: Partial<Response>

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis() as unknown as Response['status'],
      json: jest.fn().mockReturnThis() as unknown as Response['json'],
    }
  })

  it('should handle AppError with correct status', async () => {
    const { errorHandler } = await import('../../../src/middleware/errorMiddleware')
    const error = new AppError('Forbidden', 403)
    errorHandler(error, mockReq, mockRes as Response, mockNext)
    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Forbidden' })
    )
  })

  it('should handle unknown errors as 500', async () => {
    const { errorHandler } = await import('../../../src/middleware/errorMiddleware')
    const error = new Error('Something broke')
    errorHandler(error, mockReq, mockRes as Response, mockNext)
    expect(mockRes.status).toHaveBeenCalledWith(500)
  })
})
```

- [ ] **Step 2: Eseguire test**

Run: `cd server && npx jest tests/unit/middleware/errorMiddleware.test.ts --verbose`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/tests/unit/middleware/errorMiddleware.test.ts
git commit -m "test(backend): add errorMiddleware unit tests for AppError and error handler"
```

---

### Task 1.6: Test Frontend — StatusBadge Component

**Files:**
- Create: `client/src/components/common/__tests__/StatusBadge.test.tsx`

- [ ] **Step 1: Scrivere test per StatusBadge**

```tsx
// client/src/components/common/__tests__/StatusBadge.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders label text', () => {
    render(<StatusBadge status="todo" label="Da iniziare" />)
    expect(screen.getByText('Da iniziare')).toBeInTheDocument()
  })

  it('applies correct CSS class for status', () => {
    const { container } = render(<StatusBadge status="done" label="Completato" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-green')
  })

  it('renders with different statuses', () => {
    const statuses = ['todo', 'in_progress', 'review', 'done', 'blocked']
    statuses.forEach(status => {
      const { unmount } = render(<StatusBadge status={status} label={status} />)
      expect(screen.getByText(status)).toBeInTheDocument()
      unmount()
    })
  })
})
```

- [ ] **Step 2: Eseguire test**

Run: `cd client && npx vitest run src/components/common/__tests__/StatusBadge.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/__tests__/StatusBadge.test.tsx
git commit -m "test(frontend): add StatusBadge component tests"
```

---

### Task 1.7: Test Frontend — EmptyState Component

**Files:**
- Create: `client/src/components/common/__tests__/EmptyState.test.tsx`

- [ ] **Step 1: Scrivere test per EmptyState**

```tsx
// client/src/components/common/__tests__/EmptyState.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { EmptyState } from '../EmptyState'
import { Inbox } from 'lucide-react'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Nessun progetto"
        description="Crea il tuo primo progetto"
      />
    )
    expect(screen.getByText('Nessun progetto')).toBeInTheDocument()
    expect(screen.getByText('Crea il tuo primo progetto')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Nessun progetto"
        action={{ label: 'Crea progetto', href: '/projects/new' }}
      />
    )
    expect(screen.getByText('Crea progetto')).toBeInTheDocument()
  })

  it('renders without action button', () => {
    render(<EmptyState icon={Inbox} title="Vuoto" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Eseguire test**

Run: `cd client && npx vitest run src/components/common/__tests__/EmptyState.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/__tests__/EmptyState.test.tsx
git commit -m "test(frontend): add EmptyState component tests"
```

---

### Task 1.8: Test Frontend — constants e utility

**Files:**
- Create: `client/src/lib/__tests__/constants.test.ts`
- Create: `client/src/lib/__tests__/utils.test.ts`

- [ ] **Step 1: Test per constants (STATUS_COLORS, isPrivileged)**

```typescript
// client/src/lib/__tests__/constants.test.ts
import { describe, it, expect } from 'vitest'
import { STATUS_COLORS, isPrivileged, PRIVILEGED_ROLES } from '../constants'

describe('STATUS_COLORS', () => {
  it('has colors for all task statuses', () => {
    const statuses = ['todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled']
    statuses.forEach(s => {
      expect(STATUS_COLORS[s]).toBeDefined()
      expect(STATUS_COLORS[s]).toContain('bg-')
    })
  })

  it('includes dark mode variants', () => {
    Object.values(STATUS_COLORS).forEach(cls => {
      if (typeof cls === 'string') {
        expect(cls).toContain('dark:')
      }
    })
  })
})

describe('isPrivileged', () => {
  it('returns true for admin', () => {
    expect(isPrivileged('admin')).toBe(true)
  })

  it('returns true for direzione', () => {
    expect(isPrivileged('direzione')).toBe(true)
  })

  it('returns false for dipendente', () => {
    expect(isPrivileged('dipendente')).toBe(false)
  })

  it('returns false for guest', () => {
    expect(isPrivileged('guest')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isPrivileged('')).toBe(false)
  })
})
```

- [ ] **Step 2: Test per utils (cn, formatDate, formatHours)**

```typescript
// client/src/lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('p-4', 'mt-2')).toBe('p-4 mt-2')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active')
  })

  it('deduplicates Tailwind conflicts', () => {
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2') // tailwind-merge keeps last
  })

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null)).toBe('base')
  })
})
```

- [ ] **Step 3: Eseguire test**

Run: `cd client && npx vitest run src/lib/__tests__/ --verbose`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/__tests__/
git commit -m "test(frontend): add constants and utils unit tests"
```

---

## Chunk 2: View Mode Complete (Board, Gantt, Calendar)

**Obiettivo:** Integrare KanbanBoard, GanttChart e CalendarView in TaskListPage rimuovendo i placeholder "In arrivo nella Fase 9".

**Stato attuale:** I 3 componenti esistono gia' (`KanbanBoard.tsx` 586 righe, `GanttChart.tsx` 1065 righe, `CalendarView.tsx` 88 righe). KanbanBoard ha DnD completo con @dnd-kit. Il problema e' che TaskListPage ha un guard che mostra un placeholder per board/gantt/calendar.

### Task 2.1: Integrare KanbanBoard in TaskListPage

**Files:**
- Modify: `client/src/pages/tasks/TaskListPage.tsx`

- [ ] **Step 1: Individuare il guard placeholder**

Nel file `TaskListPage.tsx`, cercare il blocco che controlla `viewMode !== "list" && viewMode !== "table"` e mostra il placeholder "In arrivo nella Fase 9". Questo blocco va sostituito con il rendering condizionale dei 3 componenti.

- [ ] **Step 2: Importare i componenti view**

```tsx
// Aggiungere agli import di TaskListPage.tsx
import { KanbanBoard } from '@/components/domain/tasks/KanbanBoard'
import { GanttChart } from '@/components/domain/gantt/GanttChart'
import { CalendarView } from '@/components/domain/calendar/CalendarView'
```

- [ ] **Step 3: Sostituire il placeholder con rendering condizionale**

Sostituire il blocco placeholder con:

```tsx
// Dopo la sezione dei filtri, prima di EntityList
if (viewMode === 'board') {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* Header con filtri e view toggle - riusare la toolbar esistente */}
      <div className="space-y-4">
        {filterToolbar}
        <KanbanBoard
          projectId={filters.projectId}
          filters={filters}
        />
      </div>
    </motion.div>
  )
}

if (viewMode === 'gantt') {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="space-y-4">
        {filterToolbar}
        <GanttChart projectId={filters.projectId} />
      </div>
    </motion.div>
  )
}

if (viewMode === 'calendar') {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <div className="space-y-4">
        {filterToolbar}
        <CalendarView projectId={filters.projectId} />
      </div>
    </motion.div>
  )
}

// Default: EntityList per list/table mode (codice esistente)
```

- [ ] **Step 4: Estrarre toolbar filtri in variabile riusabile**

Il blocco toolbar (filtri + ViewToggle) deve essere estratto in una variabile `filterToolbar` per evitare duplicazione tra le 5 view mode.

- [ ] **Step 5: Verificare compilazione TypeScript**

Run: `cd client && npx tsc --noEmit`
Expected: nessun errore

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/tasks/TaskListPage.tsx
git commit -m "feat(tasks): integrate Board, Gantt, Calendar views in TaskListPage"
```

---

### Task 2.2: Verificare e migliorare KanbanBoard

**Files:**
- Modify: `client/src/components/domain/tasks/KanbanBoard.tsx` (se necessario)

- [ ] **Step 1: Verificare che KanbanBoard accetti i filtri dal parent**

KanbanBoard gia' supporta `projectId` e `filters` props. Verificare che il componente:
- Filtra i task in base ai filtri passati
- Mostra empty state se non ci sono task
- Gestisce correttamente il loading state

- [ ] **Step 2: Aggiungere filtro per progetto se mancante**

Se KanbanBoard non filtra per `projectId`, aggiungere il parametro alla query:

```tsx
const { data, isLoading } = useTaskListQuery({
  ...filters,
  projectId: projectId,
  limit: 200, // Kanban carica tutti
})
```

- [ ] **Step 3: Testare drag-and-drop tra colonne**

Verificare manualmente che il DnD funzioni:
- Trascinare un task da "Da iniziare" a "In corso" → deve chiamare `useChangeTaskStatus`
- Trascinare un task da "In corso" a "Bloccato" → deve mostrare dialog per `blockedReason`
- Verificare che la UI si aggiorni ottimisticamente

- [ ] **Step 4: Commit se ci sono modifiche**

```bash
git add client/src/components/domain/tasks/KanbanBoard.tsx
git commit -m "fix(kanban): ensure project filter and loading states"
```

---

### Task 2.3: Verificare GanttChart e CalendarView

**Files:**
- Modify: `client/src/components/domain/gantt/GanttChart.tsx` (se necessario)
- Modify: `client/src/components/domain/calendar/CalendarView.tsx` (se necessario)

- [ ] **Step 1: Verificare che GanttChart accetti projectId prop**

GanttChart usa `useGanttTasksQuery()` — verificare che passi il filtro progetto. Se non ha `projectId` prop, aggiungerlo.

- [ ] **Step 2: Verificare che CalendarView accetti projectId prop**

CalendarView usa `useCalendarTasksQuery()` — verificare che passi il filtro. Se mancante, aggiungerlo.

- [ ] **Step 3: Verificare rendering con dati vuoti**

Entrambi i componenti devono mostrare un EmptyState quando non ci sono dati, non un errore.

- [ ] **Step 4: Verificare compilazione e commit**

Run: `cd client && npx tsc --noEmit`

```bash
git add client/src/components/domain/gantt/GanttChart.tsx client/src/components/domain/calendar/CalendarView.tsx
git commit -m "fix(views): ensure Gantt and Calendar accept project filter and handle empty state"
```

---

## Chunk 3: Notifiche Real-Time (Socket.io Client)

**Obiettivo:** Connettere il frontend al backend Socket.io per notifiche real-time, toast automatici, e invalidazione cache TanStack Query.

**Stato attuale:** Backend Socket.io completo (auth JWT, room `user:{id}`, emissione eventi). Frontend: NotificationPanel, NotificationItem, TanStack Query hooks con polling 60s. **Manca completamente** il client Socket.io.

### Task 3.1: Installare socket.io-client

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Installare la dipendenza**

Run: `cd client && npm install socket.io-client`

- [ ] **Step 2: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "deps(client): add socket.io-client for real-time notifications"
```

---

### Task 3.2: Creare hook useSocket

**Files:**
- Create: `client/src/hooks/useSocket.ts`

- [ ] **Step 1: Creare l'hook con connessione, auth, e lifecycle**

```typescript
// client/src/hooks/useSocket.ts
import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNotificationUiStore } from '@/stores/notificationUiStore'

interface NotificationEvent {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}

export function useSocket(token: string | null, userId: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const queryClient = useQueryClient()
  const { soundEnabled } = useNotificationUiStore()

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.3
      audio.play().catch(() => {}) // Ignore autoplay restrictions
    } catch {
      // Ignore audio errors
    }
  }, [soundEnabled])

  useEffect(() => {
    if (!token || !userId) return

    // Connect to backend Socket.io
    const socket = io(import.meta.env.VITE_API_URL || '', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      socket.emit('join', `user:${userId}`)
    })

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message)
    })

    // Notification events — invalidate cache + show toast
    socket.on('notification', (notif: NotificationEvent) => {
      // Invalidate notification queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })

      // Show toast with navigation
      toast(notif.title, {
        description: notif.message,
        action: notif.data?.taskId
          ? { label: 'Vai', onClick: () => window.location.href = `/tasks/${notif.data!.taskId}` }
          : notif.data?.projectId
          ? { label: 'Vai', onClick: () => window.location.href = `/projects/${notif.data!.projectId}` }
          : undefined,
      })

      playNotificationSound()
    })

    // Task events — invalidate task queries
    socket.on('task:created', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    })

    socket.on('task:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    })

    socket.on('task:statusChanged', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    })

    socket.on('task:deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    })

    // Comment events — invalidate comment queries
    socket.on('comment:created', () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    })

    // Cleanup on unmount
    return () => {
      socket.emit('leave', `user:${userId}`)
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, userId, queryClient, playNotificationSound])

  return socketRef
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useSocket.ts
git commit -m "feat(socket): create useSocket hook with real-time notification handling"
```

---

### Task 3.3: Integrare useSocket in AppShell

**Files:**
- Modify: `client/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Importare e inizializzare useSocket**

In `AppShell.tsx`, aggiungere l'inizializzazione del socket dopo il login check:

```tsx
import { useSocket } from '@/hooks/useSocket'

// Dentro AppShell component, dopo aver ottenuto user/token
const token = localStorage.getItem('pp-token') // o dal auth context
const { data: currentUser } = useCurrentUserQuery()
useSocket(token, currentUser?.id ?? null)
```

- [ ] **Step 2: Verificare che la connessione Socket.io venga stabilita**

Controllare nella console del browser che il WebSocket si connetta correttamente al backend. Cercare nella tab Network le richieste `/socket.io/`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/AppShell.tsx
git commit -m "feat(socket): initialize Socket.io connection in AppShell"
```

---

### Task 3.4: Aggiungere badge unread count nell'header

**Files:**
- Modify: `client/src/components/layout/Header.tsx`

- [ ] **Step 1: Verificare che il bell icon gia' mostri il contatore**

Controllare Header.tsx — il bell icon dovrebbe gia' usare `useUnreadCountQuery()` per mostrare un badge. Se mancante, aggiungere:

```tsx
import { useUnreadCountQuery } from '@/hooks/api/useNotifications'

// Nel component Header
const { data: unreadCount } = useUnreadCountQuery()

// Nel JSX, accanto al Bell icon
<Button variant="ghost" size="icon" onClick={() => setNotifOpen(true)} className="relative">
  <Bell className="h-5 w-5" />
  {(unreadCount ?? 0) > 0 && (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</Button>
```

- [ ] **Step 2: Rimuovere il polling 60s ora che abbiamo WebSocket**

In `useNotifications.ts`, rimuovere o ridurre il `refetchInterval: 60000` dalla query `useUnreadCountQuery` poiche' ora il Socket.io invalida la cache in tempo reale. Opzionale: mantenere un polling lungo (5 min) come fallback.

```typescript
// useNotifications.ts — cambiare refetchInterval
export function useUnreadCountQuery() {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data.data),
    refetchInterval: 5 * 60 * 1000, // 5 min fallback (was 60s)
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/Header.tsx client/src/hooks/api/useNotifications.ts
git commit -m "feat(notifications): add unread badge, replace polling with Socket.io + 5min fallback"
```

---

## Chunk 4: Ricerca Avanzata (Faceted Search)

**Obiettivo:** Estendere CommandPalette con filtri per dominio, ricerca recente, risultati piu' ricchi, e navigazione veloce.

**Stato attuale:** CommandPalette funzionante con ricerca substring su 5 entita', 300ms debounce, max 5 risultati per categoria, 3 quick actions.

### Task 4.1: Aggiungere filtro per dominio nel backend

**Files:**
- Modify: `server/src/services/searchService.ts`
- Modify: `server/src/schemas/commonSchemas.ts` (o creare `searchSchemas.ts`)
- Modify: `server/src/controllers/searchController.ts`

- [ ] **Step 1: Estendere lo schema di ricerca**

```typescript
// In server/src/schemas/commonSchemas.ts o nuovo file searchSchemas.ts
import { z } from 'zod'

export const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().min(1).max(20).default(5),
  domain: z.enum(['all', 'tasks', 'projects', 'users', 'risks', 'documents']).default('all'),
  status: z.string().optional(), // Filtro opzionale per status
  priority: z.string().optional(), // Filtro opzionale per priorita'
})
```

- [ ] **Step 2: Modificare searchService per supportare domain filter**

```typescript
// In searchService.ts — aggiungere parametro domain
export async function globalSearch(
  query: string,
  limit: number = 5,
  domain: string = 'all',
  filters?: { status?: string; priority?: string }
) {
  const searches: Promise<unknown>[] = []

  const shouldSearch = (d: string) => domain === 'all' || domain === d

  if (shouldSearch('tasks')) {
    searches.push(searchTasks(query, limit, filters))
  }
  if (shouldSearch('projects')) {
    searches.push(searchProjects(query, limit, filters))
  }
  if (shouldSearch('users')) {
    searches.push(searchUsers(query, limit))
  }
  if (shouldSearch('risks')) {
    searches.push(searchRisks(query, limit, filters))
  }
  if (shouldSearch('documents')) {
    searches.push(searchDocuments(query, limit, filters))
  }

  const results = await Promise.all(searches)

  // Ricostruire l'oggetto risultato in base ai domini cercati
  let idx = 0
  return {
    tasks: shouldSearch('tasks') ? results[idx++] : [],
    projects: shouldSearch('projects') ? results[idx++] : [],
    users: shouldSearch('users') ? results[idx++] : [],
    risks: shouldSearch('risks') ? results[idx++] : [],
    documents: shouldSearch('documents') ? results[idx++] : [],
  }
}
```

- [ ] **Step 3: Aggiornare il controller**

```typescript
// searchController.ts
export const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit, domain, status, priority } = searchQuerySchema.parse(req.query)
    const results = await searchService.globalSearch(q, limit, domain, { status, priority })
    sendSuccess(res, results)
  } catch (error) {
    next(error)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/searchService.ts server/src/controllers/searchController.ts server/src/schemas/
git commit -m "feat(search): add domain and status filters to global search API"
```

---

### Task 4.2: Aggiungere ricerca recente e navigazione veloce

**Files:**
- Modify: `client/src/components/features/CommandPalette.tsx`
- Modify: `client/src/hooks/api/useSearch.ts`
- Modify: `client/src/stores/uiStore.ts`

- [ ] **Step 1: Aggiungere search history in uiStore**

```typescript
// In uiStore.ts — aggiungere recent searches
interface UIState {
  // ... campi esistenti ...
  recentSearches: Array<{ query: string; timestamp: number }>
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
}

// Nell'implementazione:
recentSearches: [],
addRecentSearch: (query) => set((state) => ({
  recentSearches: [
    { query, timestamp: Date.now() },
    ...state.recentSearches.filter(s => s.query !== query),
  ].slice(0, 10), // Max 10 ricerche recenti
})),
clearRecentSearches: () => set({ recentSearches: [] }),
```

- [ ] **Step 2: Aggiungere filtro dominio nella UI CommandPalette**

```tsx
// In CommandPalette.tsx — aggiungere domain tabs sopra i risultati
const DOMAIN_TABS = [
  { key: 'all', label: 'Tutto', icon: Search },
  { key: 'tasks', label: 'Task', icon: CheckSquare },
  { key: 'projects', label: 'Progetti', icon: FolderKanban },
  { key: 'users', label: 'Utenti', icon: Users },
  { key: 'risks', label: 'Rischi', icon: AlertTriangle },
  { key: 'documents', label: 'Documenti', icon: FileText },
]

// State
const [activeDomain, setActiveDomain] = useState<string>('all')

// Render tabs sopra i risultati
<div className="flex gap-1 px-3 py-2 border-b border-border">
  {DOMAIN_TABS.map(tab => (
    <button
      key={tab.key}
      onClick={() => setActiveDomain(tab.key)}
      className={cn(
        "px-2 py-1 text-xs rounded-md transition-colors",
        activeDomain === tab.key
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted"
      )}
    >
      <tab.icon className="h-3 w-3 inline mr-1" />
      {tab.label}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Mostrare ricerche recenti quando input e' vuoto**

```tsx
// In CommandPalette.tsx — sezione ricerche recenti
{!debouncedQuery && recentSearches.length > 0 && (
  <CommandGroup heading="Ricerche recenti">
    {recentSearches.map((s) => (
      <CommandItem key={s.query} onSelect={() => setQuery(s.query)}>
        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
        {s.query}
      </CommandItem>
    ))}
    <CommandItem onSelect={clearRecentSearches}>
      <X className="h-4 w-4 mr-2 text-muted-foreground" />
      <span className="text-muted-foreground">Cancella cronologia</span>
    </CommandItem>
  </CommandGroup>
)}
```

- [ ] **Step 4: Aggiornare useSearch hook con domain param**

```typescript
// useSearch.ts
export function useSearchQuery(q: string, domain: string = 'all') {
  return useQuery({
    queryKey: ['search', q, domain],
    queryFn: () => api.get('/search', { params: { q, limit: 5, domain } }).then(r => r.data.data),
    enabled: q.length >= 2,
  })
}
```

- [ ] **Step 5: Salvare la ricerca nella history al momento della selezione**

Nella `handleSelect` di CommandPalette, aggiungere:
```tsx
const handleSelect = (path: string) => {
  if (query.length >= 2) {
    addRecentSearch(query)
  }
  navigate(path)
  setOpen(false)
}
```

- [ ] **Step 6: Verificare compilazione**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add client/src/components/features/CommandPalette.tsx client/src/hooks/api/useSearch.ts client/src/stores/uiStore.ts
git commit -m "feat(search): add domain filter tabs, recent searches, and enhanced navigation"
```

---

## Chunk 5: Analytics Avanzate (Burndown, Velocity, Confronto Progetti)

**Obiettivo:** Aggiungere burndown chart, velocity tracking, e confronto tra progetti alla pagina Analytics.

**Stato attuale:** AnalyticsPage ha 4 KPI + 4 grafici (pie status, bar ore/progetto, line trend 30gg, bar contributori). Backend ha gia' `getDeliveryForecast()` e `getBudgetOverview()` che non sono visualizzati.

### Task 5.1: Aggiungere endpoint burndown chart

**Files:**
- Modify: `server/src/services/analyticsService.ts`
- Modify: `server/src/controllers/analyticsController.ts`
- Modify: `server/src/routes/analyticsRoutes.ts`

- [ ] **Step 1: Creare funzione getBurndownData nel service**

```typescript
// In analyticsService.ts — aggiungere
export async function getBurndownData(projectId: string, days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Total tasks for project at start
  const totalTasks = await prisma.task.count({
    where: {
      projectId,
      isDeleted: false,
      taskType: { in: ['task', 'subtask'] },
    },
  })

  // Daily completed task counts
  const dailyCompleted = await prisma.task.groupBy({
    by: ['updatedAt'],
    where: {
      projectId,
      isDeleted: false,
      status: 'done',
      updatedAt: { gte: startDate },
    },
    _count: true,
  })

  // Build daily series
  const series: Array<{ date: string; remaining: number; ideal: number }> = []
  let remaining = totalTasks

  for (let d = 0; d <= days; d++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + d)
    const dateStr = date.toISOString().split('T')[0]

    // Count completed on this day
    const completedToday = dailyCompleted.filter(
      (c) => new Date(c.updatedAt).toISOString().split('T')[0] === dateStr
    ).reduce((sum, c) => sum + c._count, 0)

    remaining -= completedToday

    series.push({
      date: dateStr,
      remaining: Math.max(0, remaining),
      ideal: Math.max(0, totalTasks - Math.round((totalTasks / days) * d)),
    })
  }

  return { totalTasks, series }
}
```

- [ ] **Step 2: Aggiungere controller e route**

```typescript
// analyticsController.ts — aggiungere
export const getBurndown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(req.params)
    const { days } = z.object({ days: z.coerce.number().min(7).max(365).default(30) }).parse(req.query)
    const data = await analyticsService.getBurndownData(projectId, days)
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}
```

```typescript
// analyticsRoutes.ts — aggiungere
router.get('/burndown/:projectId', requireRole('admin', 'direzione'), analyticsController.getBurndown)
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/analyticsService.ts server/src/controllers/analyticsController.ts server/src/routes/analyticsRoutes.ts
git commit -m "feat(analytics): add burndown chart API endpoint"
```

---

### Task 5.2: Aggiungere hook e componente BurndownChart

**Files:**
- Modify: `client/src/hooks/api/useAnalytics.ts`
- Create: `client/src/components/domain/analytics/BurndownChart.tsx`

- [ ] **Step 1: Aggiungere hook**

```typescript
// In useAnalytics.ts
export function useBurndownQuery(projectId: string | null, days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'burndown', projectId, days],
    queryFn: () => api.get(`/analytics/burndown/${projectId}`, { params: { days } }).then(r => r.data.data),
    enabled: !!projectId,
  })
}
```

- [ ] **Step 2: Creare BurndownChart component**

```tsx
// client/src/components/domain/analytics/BurndownChart.tsx
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface BurndownChartProps {
  data: Array<{ date: string; remaining: number; ideal: number }> | undefined
  isLoading: boolean
  totalTasks: number
}

export function BurndownChart({ data, isLoading, totalTasks }: BurndownChartProps) {
  if (isLoading) return <Skeleton className="h-[300px] w-full" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Burndown Chart</CardTitle>
        <p className="text-sm text-muted-foreground">{totalTasks} task totali</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => new Date(v).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
            />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="remaining"
              name="Rimanenti"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ideal"
              name="Ideale"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/api/useAnalytics.ts client/src/components/domain/analytics/BurndownChart.tsx
git commit -m "feat(analytics): add BurndownChart component with ideal vs actual lines"
```

---

### Task 5.3: Aggiungere sezione Delivery Forecast e Budget alla AnalyticsPage

**Files:**
- Modify: `client/src/pages/analytics/AnalyticsPage.tsx`

- [ ] **Step 1: Importare hook e componenti mancanti**

I hook `useDeliveryForecastQuery()` e `useBudgetOverviewQuery()` esistono gia' ma non sono usati nella pagina. Aggiungerli:

```tsx
// In AnalyticsPage.tsx — aggiungere agli import
import { useDeliveryForecastQuery, useBudgetOverviewQuery } from '@/hooks/api/useAnalytics'
import { BurndownChart } from '@/components/domain/analytics/BurndownChart'
```

- [ ] **Step 2: Aggiungere sezione Delivery Forecast**

Dopo i grafici esistenti, aggiungere una nuova sezione con:
- Tabella progetti con velocity (task/settimana), data stimata completamento, ritardo previsto
- Badge colorato: on_track (verde), at_risk (giallo), delayed (rosso)

```tsx
// Sezione Delivery Forecast
const { data: forecast, isLoading: forecastLoading } = useDeliveryForecastQuery()

<Card>
  <CardHeader>
    <CardTitle className="text-base">Previsione Consegna</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Progetto</TableHead>
          <TableHead>Velocity</TableHead>
          <TableHead>Task rimanenti</TableHead>
          <TableHead>Stima completamento</TableHead>
          <TableHead>Stato</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {forecast?.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell>{p.velocity} task/sett</TableCell>
            <TableCell>{p.remainingTasks}</TableCell>
            <TableCell>{formatDate(p.estimatedCompletion)}</TableCell>
            <TableCell>
              <Badge className={
                p.status === 'on_track' ? STATUS_COLORS.active
                : p.status === 'at_risk' ? STATUS_COLORS.on_hold
                : STATUS_COLORS.blocked
              }>
                {p.status === 'on_track' ? 'In tempo' : p.status === 'at_risk' ? 'A rischio' : 'In ritardo'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

- [ ] **Step 3: Aggiungere sezione Budget**

Simile a Delivery Forecast, visualizzare i dati budget con ProgressGradient:

```tsx
const { data: budget, isLoading: budgetLoading } = useBudgetOverviewQuery()

<Card>
  <CardHeader>
    <CardTitle className="text-base">Budget Ore</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {budget?.map((p) => (
      <div key={p.id} className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{p.name}</span>
          <span className="text-muted-foreground">
            {formatHours(p.loggedHours)} / {formatHours(p.estimatedHours)} ore
          </span>
        </div>
        <ProgressGradient
          value={p.budgetUsage}
          context={p.budgetStatus === 'over_budget' ? 'danger' : p.budgetStatus === 'at_risk' ? 'warning' : 'success'}
        />
      </div>
    ))}
  </CardContent>
</Card>
```

- [ ] **Step 4: Aggiungere BurndownChart con selettore progetto**

```tsx
const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
const { data: burndown, isLoading: burndownLoading } = useBurndownQuery(selectedProjectId)

// Aggiungere un Select per scegliere il progetto, poi il chart
<div className="space-y-4">
  <Select value={selectedProjectId ?? ''} onValueChange={setSelectedProjectId}>
    <SelectTrigger className="w-64">
      <SelectValue placeholder="Seleziona progetto per burndown" />
    </SelectTrigger>
    <SelectContent>
      {projects?.map(p => (
        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  {selectedProjectId && (
    <BurndownChart
      data={burndown?.series}
      isLoading={burndownLoading}
      totalTasks={burndown?.totalTasks ?? 0}
    />
  )}
</div>
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/analytics/AnalyticsPage.tsx
git commit -m "feat(analytics): add Delivery Forecast, Budget Overview, and Burndown Chart sections"
```

---

## Chunk 6: Automazione UX (Recommendations, Logs Viewer)

**Obiettivo:** Mostrare le raccomandazioni automazione e i log di esecuzione nella UI admin.

**Stato attuale:** Backend completo (8 pattern analyzer, API recommendations/logs). Frontend hooks esistono (`useAutomationRecommendationsQuery`, `useAutomationLogsQuery`). **Mancano i componenti UI.**

### Task 6.1: Creare RecommendationsPanel

**Files:**
- Create: `client/src/components/domain/automation/RecommendationsPanel.tsx`

- [ ] **Step 1: Creare il componente**

```tsx
// client/src/components/domain/automation/RecommendationsPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Lightbulb, Check, X, RefreshCw, Zap } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAutomationRecommendationsQuery,
  useApplyRecommendation,
  useDismissRecommendation,
  useGenerateRecommendations,
} from '@/hooks/api/useAutomations'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
}

export function RecommendationsPanel() {
  const { data: recommendations, isLoading } = useAutomationRecommendationsQuery()
  const applyMutation = useApplyRecommendation()
  const dismissMutation = useDismissRecommendation()
  const generateMutation = useGenerateRecommendations()

  const handleApply = (id: string) => {
    applyMutation.mutate(id, {
      onSuccess: () => toast.success('Regola creata dalla raccomandazione'),
      onError: () => toast.error('Errore nell\'applicazione'),
    })
  }

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id, {
      onSuccess: () => toast.success('Raccomandazione nascosta'),
    })
  }

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base">Raccomandazioni</CardTitle>
          {recommendations && recommendations.length > 0 && (
            <Badge variant="secondary">{recommendations.length}</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1", generateMutation.isPending && "animate-spin")} />
          Analizza
        </Button>
      </CardHeader>
      <CardContent>
        {!recommendations || recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessuna raccomandazione. Clicca "Analizza" per generare suggerimenti.
          </p>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {recommendations.map((rec: { id: string; pattern: string; description: string; impact: string; evidence: string }) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{rec.pattern}</span>
                      <Badge className={IMPACT_COLORS[rec.impact] ?? IMPACT_COLORS.low}>
                        {rec.impact}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.description}</p>
                    <p className="text-xs text-muted-foreground mt-1 italic">{rec.evidence}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => handleApply(rec.id)} title="Applica">
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDismiss(rec.id)} title="Ignora">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/domain/automation/RecommendationsPanel.tsx
git commit -m "feat(automation): create RecommendationsPanel component"
```

---

### Task 6.2: Creare AutomationLogsViewer

**Files:**
- Create: `client/src/components/domain/automation/AutomationLogsViewer.tsx`

- [ ] **Step 1: Creare il componente**

```tsx
// client/src/components/domain/automation/AutomationLogsViewer.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity } from 'lucide-react'
import { useAutomationLogsQuery } from '@/hooks/api/useAutomations'
import { formatDateTime } from '@/lib/utils'

interface AutomationLogsViewerProps {
  ruleId: string
}

const LOG_STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  skipped: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
}

export function AutomationLogsViewer({ ruleId }: AutomationLogsViewerProps) {
  const { data: logs, isLoading } = useAutomationLogsQuery(ruleId)

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Log Esecuzioni</CardTitle>
          {logs && <Badge variant="secondary">{logs.length}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessuna esecuzione registrata.
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Entita'</TableHead>
                  <TableHead>Dettagli</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: { id: string; createdAt: string; status: string; entityId?: string; details?: string }) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge className={LOG_STATUS_COLORS[log.status] ?? LOG_STATUS_COLORS.skipped}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {log.entityId ? log.entityId.slice(0, 8) + '...' : '-'}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {log.details ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/domain/automation/AutomationLogsViewer.tsx
git commit -m "feat(automation): create AutomationLogsViewer table component"
```

---

### Task 6.3: Integrare in AutomationsTab

**Files:**
- Modify: `client/src/pages/admin/tabs/AutomationsTab.tsx`

- [ ] **Step 1: Importare e aggiungere i nuovi componenti**

In `AutomationsTab.tsx`:

```tsx
import { RecommendationsPanel } from '@/components/domain/automation/RecommendationsPanel'
import { AutomationLogsViewer } from '@/components/domain/automation/AutomationLogsViewer'
```

- [ ] **Step 2: Aggiungere RecommendationsPanel sopra la lista regole**

```tsx
// Prima della lista regole
<div className="space-y-6">
  <RecommendationsPanel />
  {/* Lista regole esistente */}
</div>
```

- [ ] **Step 3: Aggiungere AutomationLogsViewer nel dettaglio regola**

Se esiste un dialog/pannello dettaglio regola, aggiungere i log. Se non esiste, creare un collapsible per ogni regola:

```tsx
// Nella card di ogni regola, aggiungere un bottone "Mostra log" che espande
{expandedRuleId === rule.id && (
  <AutomationLogsViewer ruleId={rule.id} />
)}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/tabs/AutomationsTab.tsx
git commit -m "feat(automation): integrate RecommendationsPanel and LogsViewer in admin tab"
```

---

## Chunk 7: Fix Tecnici Minori

**Obiettivo:** Correggere i 6 problemi tecnici identificati nell'analisi.

### Task 7.1: Fix Error throws → AppError

**Files:**
- Modify: `server/src/controllers/projectMemberController.ts` (line 34)
- Modify: `server/src/utils/codeGenerator.ts` (line 84)

- [ ] **Step 1: Fix projectMemberController.ts**

Cambiare:
```typescript
// OLD
throw new Error('Unauthenticated request reached controller')
// NEW
throw new AppError('Unauthenticated', 401)
```

Aggiungere import se mancante:
```typescript
import { AppError } from '../middleware/errorMiddleware'
```

- [ ] **Step 2: Fix codeGenerator.ts**

Cambiare:
```typescript
// OLD
throw new Error('Could not generate unique task code after max attempts')
// NEW
throw new AppError('Could not generate unique entity code after max attempts', 500)
```

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/projectMemberController.ts server/src/utils/codeGenerator.ts
git commit -m "fix(backend): use AppError instead of Error for proper HTTP status codes"
```

---

### Task 7.2: Fix GanttChart hardcoded RGBA

**Files:**
- Modify: `client/src/components/domain/gantt/GanttChart.tsx` (lines ~358-361)

- [ ] **Step 1: Sostituire RGBA hardcoded con classi semantic-safe**

Cercare le linee con `shadow-[0_0_8px_rgba(` e sostituire:

```tsx
// OLD
isOverdue ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
: isDone ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"

// NEW
isOverdue ? "bg-red-500 shadow-md shadow-red-500/40"
: isDone ? "bg-green-500 shadow-md shadow-green-500/40"
: "bg-purple-500 shadow-md shadow-purple-500/40"
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/domain/gantt/GanttChart.tsx
git commit -m "fix(gantt): replace hardcoded RGBA with Tailwind shadow utilities"
```

---

### Task 7.3: Fix EntityForm dynamic border class

**Files:**
- Modify: `client/src/components/common/EntityForm.tsx` (line ~89)

- [ ] **Step 1: Sostituire classe dinamica con lookup**

```tsx
// OLD
className={cn("space-y-6", ctx && `border-t-2 border-${ctx.color}-500`)}

// NEW — creare un lookup object
const BORDER_COLORS: Record<string, string> = {
  blue: 'border-blue-500',
  purple: 'border-purple-500',
  red: 'border-red-500',
  green: 'border-green-500',
  amber: 'border-amber-500',
  slate: 'border-slate-500',
}

className={cn("space-y-6", ctx && `border-t-2 ${BORDER_COLORS[ctx.color] ?? 'border-primary'}`)}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/EntityForm.tsx
git commit -m "fix(ui): use lookup object for dynamic border colors in EntityForm"
```

---

### Task 7.4: Fix $queryRawUnsafe → $queryRaw

**Files:**
- Modify: `server/src/services/automation/recommendationService.ts` (line ~62)

- [ ] **Step 1: Sostituire $queryRawUnsafe con $queryRaw template literal**

```typescript
// OLD
const lateCount = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
  `SELECT COUNT(*) as cnt FROM tasks WHERE project_id = @P1 AND ...`,
  project.id
)

// NEW
const lateCount = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
  SELECT COUNT(*) as cnt FROM tasks
  WHERE project_id = ${project.id}
  AND is_deleted = 0
  AND status = 'done'
  AND due_date IS NOT NULL
  AND updated_at > due_date
`
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/automation/recommendationService.ts
git commit -m "fix(backend): use $queryRaw template literal instead of $queryRawUnsafe"
```

---

### Task 7.5: Aggiungere index su User.isActive

**Files:**
- Create: nuova migration Prisma

- [ ] **Step 1: Aggiungere index nel schema.prisma**

Nel modello `User`, aggiungere:

```prisma
@@index([isActive])
```

- [ ] **Step 2: Generare migration**

Run: `cd server && npx prisma migrate dev --name add_user_is_active_index`

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "perf(db): add index on User.isActive for query optimization"
```

---

## Chunk 8: Feature Aggiuntive

**Obiettivo:** Implementare le feature nice-to-have con il miglior rapporto valore/effort.

### Task 8.1: Bulk Operations su Task

**Files:**
- Modify: `client/src/pages/tasks/TaskListPage.tsx`
- Modify: `client/src/components/common/EntityList.tsx`

**Stato:** `useBulkUpdateTasks()` e `useBulkDeleteTasks()` hooks esistono gia'. Serve solo la UI.

- [ ] **Step 1: Verificare che EntityList supporti selezione bulk**

EntityList ha gia' un prop `selectable` e usa `selectionStore` per mantenere gli ID selezionati. Verificare che TaskListPage lo abiliti.

- [ ] **Step 2: Aggiungere bulk action bar**

Quando ci sono task selezionati, mostrare una barra azioni sopra la lista:

```tsx
// In TaskListPage.tsx
const { selectedIds, clearSelection } = useSelectionStore()
const bulkUpdate = useBulkUpdateTasks()
const bulkDelete = useBulkDeleteTasks()

{selectedIds.length > 0 && (
  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
    <span className="text-sm font-medium">{selectedIds.length} selezionati</span>
    <Button size="sm" variant="outline" onClick={() => bulkUpdate.mutate({
      ids: selectedIds,
      data: { status: 'in_progress' },
    })}>
      Avvia
    </Button>
    <Button size="sm" variant="outline" onClick={() => bulkUpdate.mutate({
      ids: selectedIds,
      data: { status: 'done' },
    })}>
      Completa
    </Button>
    <Button size="sm" variant="destructive" onClick={() => bulkDelete.mutate(selectedIds)}>
      Elimina
    </Button>
    <Button size="sm" variant="ghost" onClick={clearSelection}>
      Deseleziona
    </Button>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/tasks/TaskListPage.tsx
git commit -m "feat(tasks): add bulk action bar for status change and delete"
```

---

### Task 8.2: Keyboard Shortcuts contestuali

**Files:**
- Modify: `client/src/components/features/KeyboardShortcutsModal.tsx`
- Modify: `client/src/pages/tasks/TaskListPage.tsx`
- Modify: `client/src/pages/projects/ProjectListPage.tsx`

- [ ] **Step 1: Aggiungere navigazione J/K nelle liste**

Creare un hook riusabile `useListKeyboardNav`:

```typescript
// client/src/hooks/ui/useListKeyboardNav.ts
import { useCallback, useEffect, useState } from 'react'

export function useListKeyboardNav(items: Array<{ id: string }>, onSelect: (id: string) => void) {
  const [focusIndex, setFocusIndex] = useState(-1)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIndex(prev => Math.min(prev + 1, items.length - 1))
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && focusIndex >= 0) {
      e.preventDefault()
      onSelect(items[focusIndex].id)
    }
  }, [items, focusIndex, onSelect])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { focusIndex, setFocusIndex }
}
```

- [ ] **Step 2: Integrare in TaskListPage e ProjectListPage**

```tsx
// In TaskListPage.tsx
const { focusIndex } = useListKeyboardNav(
  tasks ?? [],
  (id) => navigate(`/tasks/${id}`)
)

// Passare focusIndex a EntityList per highlight della riga
<EntityList focusedIndex={focusIndex} ... />
```

- [ ] **Step 3: Aggiungere highlight riga nel DataTable**

In `DataTable.tsx`, aggiungere prop `focusedIndex` e applicare classe `ring-2 ring-primary` alla riga corrispondente.

- [ ] **Step 4: Aggiornare KeyboardShortcutsModal con le nuove shortcuts**

```tsx
// Aggiungere alla lista shortcuts
{ key: 'J / ↓', description: 'Prossimo elemento nella lista' },
{ key: 'K / ↑', description: 'Elemento precedente nella lista' },
{ key: 'Enter', description: 'Apri elemento selezionato' },
```

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/ui/useListKeyboardNav.ts client/src/pages/tasks/TaskListPage.tsx client/src/pages/projects/ProjectListPage.tsx client/src/components/common/DataTable.tsx client/src/components/features/KeyboardShortcutsModal.tsx
git commit -m "feat(ux): add J/K keyboard navigation for list pages"
```

---

### Task 8.3: Activity Log per Progetto

**Files:**
- Modify: `client/src/pages/projects/ProjectDetailPage.tsx`
- Create: `client/src/components/domain/projects/ProjectActivityLog.tsx`
- Modify: `client/src/hooks/api/useProjects.ts` (o useAudit.ts)

- [ ] **Step 1: Creare hook per audit log filtrato per progetto**

```typescript
// In useAudit.ts — aggiungere
export function useProjectAuditLogQuery(projectId: string) {
  return useQuery({
    queryKey: ['audit', 'project', projectId],
    queryFn: () => api.get('/audit', { params: { entityType: 'project', entityId: projectId, limit: 50 } }).then(r => r.data.data),
    enabled: !!projectId,
  })
}
```

- [ ] **Step 2: Creare ProjectActivityLog component**

```tsx
// client/src/components/domain/projects/ProjectActivityLog.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity } from 'lucide-react'
import { useProjectAuditLogQuery } from '@/hooks/api/useAudit'
import { formatRelative } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ProjectActivityLogProps {
  projectId: string
}

export function ProjectActivityLog({ projectId }: ProjectActivityLogProps) {
  const { data: logs, isLoading } = useProjectAuditLogQuery(projectId)

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Attivita' recente</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {logs?.map((log: { id: string; action: string; userName: string; details: string; createdAt: string }) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" />
                <div className="flex-1">
                  <p>
                    <span className="font-medium">{log.userName}</span>{' '}
                    <span className="text-muted-foreground">{log.action}</span>{' '}
                    <span>{log.details}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatRelative(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Aggiungere come tab in ProjectDetailPage**

In ProjectDetailPage, aggiungere un tab "Attivita'" che mostra il ProjectActivityLog:

```tsx
// Nell'array tabs di ProjectDetailPage
{ key: 'activity', label: 'Attivita'', content: <ProjectActivityLog projectId={project.id} /> }
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/domain/projects/ProjectActivityLog.tsx client/src/hooks/api/useAudit.ts client/src/pages/projects/ProjectDetailPage.tsx
git commit -m "feat(projects): add activity log tab in project detail page"
```

---

### Task 8.4: Filtri salvati condivisi (SavedView visibility)

**Files:**
- Modify: `server/src/services/savedViewService.ts`
- Modify: `server/src/controllers/savedViewController.ts`
- Modify: `client/src/components/features/SavedViewsBar.tsx`

- [ ] **Step 1: Aggiungere campo isPublic al SavedView (se non presente)**

Verificare nel schema.prisma se `SavedView` ha un campo `isPublic: Boolean @default(false)`. Se mancante, aggiungerlo con migration.

- [ ] **Step 2: Modificare savedViewService per restituire view pubbliche + proprie**

```typescript
// In savedViewService.ts
export async function getViews(userId: string, page: string) {
  return prisma.savedView.findMany({
    where: {
      isDeleted: false,
      page,
      OR: [
        { userId }, // Le mie
        { isPublic: true }, // Condivise da altri
      ],
    },
    orderBy: { createdAt: 'desc' },
  })
}
```

- [ ] **Step 3: Aggiungere toggle isPublic nella SavedViewsBar**

```tsx
// In SavedViewsBar.tsx — aggiungere un toggle nel form di salvataggio
<div className="flex items-center gap-2">
  <Switch
    checked={isPublic}
    onCheckedChange={setIsPublic}
  />
  <Label className="text-sm">Condividi con il team</Label>
</div>
```

- [ ] **Step 4: Mostrare badge "condiviso" sulle view pubbliche di altri**

```tsx
{view.userId !== currentUser?.id && (
  <Badge variant="outline" className="text-xs">Condiviso</Badge>
)}
```

- [ ] **Step 5: Commit**

```bash
git add server/src/services/savedViewService.ts client/src/components/features/SavedViewsBar.tsx
git commit -m "feat(views): add shared saved views with isPublic toggle"
```

---

## Riepilogo Esecuzione

| Chunk | Task | Descrizione | Effort stimato |
|-------|------|-------------|----------------|
| **1** | 1.1-1.8 | Infrastruttura test + primi test | ~3-4 ore |
| **2** | 2.1-2.3 | Integrazione Board/Gantt/Calendar | ~1-2 ore |
| **3** | 3.1-3.4 | Socket.io client + notifiche RT | ~2-3 ore |
| **4** | 4.1-4.2 | Ricerca faceted + history | ~2-3 ore |
| **5** | 5.1-5.3 | Burndown + Forecast + Budget | ~3-4 ore |
| **6** | 6.1-6.3 | Automation UX panels | ~1-2 ore |
| **7** | 7.1-7.5 | Fix tecnici minori | ~30 min |
| **8** | 8.1-8.4 | Bulk ops, shortcuts, activity, views | ~3-4 ore |

**Tutti i chunk sono indipendenti** e possono essere eseguiti in parallelo da agenti diversi con `superpowers:subagent-driven-development`.

**Ordine consigliato se sequenziale:** 7 → 2 → 3 → 6 → 4 → 1 → 5 → 8 (dal piu' veloce al piu' impattante)
