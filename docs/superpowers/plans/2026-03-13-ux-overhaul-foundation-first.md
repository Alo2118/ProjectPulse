# UX Overhaul — Foundation First Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the entire UI/UX with coordinated pages, role-based content filtering, theme effects, and complete tab/content coverage.

**Architecture:** Foundation First — build shared components and backend support (Phase 1), then apply uniformly to all pages (Phase 2). Backend is mostly complete; main work is frontend components + a few backend additions.

**Tech Stack:** React 18, TypeScript, TanStack Query 5, Zustand, shadcn/ui, Tailwind CSS, Framer Motion, Prisma 7, Express, SQL Server

**Spec:** `docs/superpowers/specs/2026-03-13-ux-overhaul-foundation-first-design.md`

**Key discovery:** User model already has `theme`, `themeStyle`, `hourlyRate` fields. Route `PATCH /me/theme` exists. This reduces backend migration work.

---

## Chunk 1: Backend Foundation

### Task 1: DB Migration — TagAssignment.createdById + UserInputReply + User.notificationPreferences

**Files:**
- Modify: `server/prisma/schema.prisma` (TagAssignment model ~line 536, add UserInputReply after line 576, User model ~line 16)
- Create: `server/prisma/migrations/manual/add-ux-overhaul-fields.sql`

- [ ] **Step 1: Add `createdById` to TagAssignment in schema.prisma**

In TagAssignment model (~line 536), add:
```prisma
createdById String?
createdBy   User?    @relation("TagAssignmentCreator", fields: [createdById], references: [id])
```
Note: nullable for backward compat with existing data.

- [ ] **Step 2: Add `notificationPreferences` to User model**

In User model (~line 16), add:
```prisma
notificationPreferences Json?
```

- [ ] **Step 3: Add UserInputReply model**

After Note model (~line 576), add:
```prisma
model UserInputReply {
  id        String   @id @default(uuid())
  inputId   String
  userId    String
  content   String
  createdAt DateTime @default(now())

  input     UserInput @relation(fields: [inputId], references: [id])
  user      User      @relation("UserInputReplyAuthor", fields: [userId], references: [id])

  @@index([inputId])
  @@map("user_input_replies")
}
```

Also add `replies UserInputReply[]` to the UserInput model, and `userInputReplies UserInputReply[] @relation("UserInputReplyAuthor")` to User model.

- [ ] **Step 4: Generate migration**

Run: `npx prisma migrate dev --name add_ux_overhaul_fields`
Expected: Migration created successfully.

**Note**: This migration must also be run on the backend server (192.168.52.22), not just the dev machine. Add to the pending migrations list in `docs/STATUS.md`.

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(db): add TagAssignment.createdById, UserInputReply, User.notificationPreferences"
```

---

### Task 2: Backend — User Preferences Endpoint + Login Enhancement

**Files:**
- Modify: `server/src/schemas/userSchemas.ts`
- Modify: `server/src/services/userService.ts`
- Modify: `server/src/controllers/userController.ts`
- Modify: `server/src/routes/userRoutes.ts`
- Modify: `server/src/services/authService.ts`

- [ ] **Step 1: Add preferences schema in userSchemas.ts**

```typescript
export const updatePreferencesSchema = z.object({
  theme: z.enum(['office-classic', 'asana-like', 'tech-hud']).optional(),
  themeStyle: z.enum(['light', 'dark', 'system']).optional(),
  notificationPreferences: z.object({
    sound: z.boolean(),
    desktop: z.boolean(),
    types: z.object({
      task: z.boolean(),
      risk: z.boolean(),
      doc: z.boolean(),
      automation: z.boolean(),
    }),
  }).optional(),
})
```

- [ ] **Step 2: Add `updatePreferences` to userService.ts**

```typescript
async function updatePreferences(userId: string, data: UpdatePreferencesInput) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.theme !== undefined && { theme: data.theme }),
      ...(data.themeStyle !== undefined && { themeStyle: data.themeStyle }),
      ...(data.notificationPreferences !== undefined && { notificationPreferences: data.notificationPreferences }),
    },
    select: { id: true, theme: true, themeStyle: true, notificationPreferences: true },
  })
}
```

- [ ] **Step 3: Add controller action in userController.ts**

```typescript
export const updateMyPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req)
    const data = updatePreferencesSchema.parse(req.body)
    const result = await userService.updatePreferences(userId, data)
    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
}
```

- [ ] **Step 4: Add route in userRoutes.ts**

Add before the existing `PATCH /me/theme` route:
```typescript
router.patch('/me/preferences', userController.updateMyPreferences)
```

- [ ] **Step 5: Enhance login response in authService.ts**

In the `login()` function (find it in authService.ts), ensure the `user` select includes `theme`, `themeStyle`, and `notificationPreferences` fields. The current login response is `{ token, refreshToken, user }` — the preferences come as part of the `user` object (not a separate `preferences` field), since these fields already exist on the User model:
```typescript
// In the user select clause of login(), add:
theme: true,
themeStyle: true,
notificationPreferences: true,
```

The frontend will read preferences from `data.user.theme` and `data.user.themeStyle` (see Task 6 Step 4).

- [ ] **Step 6: Commit**

```bash
git add server/src/schemas/userSchemas.ts server/src/services/userService.ts server/src/controllers/userController.ts server/src/routes/userRoutes.ts server/src/services/authService.ts
git commit -m "feat(api): add user preferences endpoint and login preferences"
```

---

### Task 3: Backend — Scope=mine Filter on List Services

**Files:**
- Create: `server/src/utils/scopeFilter.ts`
- Modify: `server/src/services/projectService.ts`
- Modify: `server/src/services/taskService.ts`
- Modify: `server/src/services/riskService.ts`
- Modify: `server/src/services/documentService.ts`
- Modify: `server/src/services/userInputService.ts`

- [ ] **Step 1: Create scopeFilter utility**

**Important**: `TagAssignment` is a polymorphic model (`entityType` + `entityId` strings) with no Prisma relations on domain models. Tag filtering must use a two-step approach: first query matching entity IDs from `tag_assignments`, then include them in the main `where` clause.

```typescript
// server/src/utils/scopeFilter.ts
import { prisma } from '../models/prismaClient.js'

const PRIVILEGED_ROLES = ['direzione']

/**
 * Returns an array of entity IDs that the user has tagged.
 * Must be called before the main query to feed into `id: { in: [...] }`.
 */
async function getTaggedEntityIds(userId: string, entityType: string): Promise<string[]> {
  const tagged = await prisma.tagAssignment.findMany({
    where: { entityType, createdById: userId },
    select: { entityId: true },
    distinct: ['entityId'],
  })
  return tagged.map(t => t.entityId)
}

/**
 * Builds a Prisma `where` clause for scope=mine filtering.
 * Direzione sees everything (returns null).
 * Admin/dipendente see: created OR assigned OR tagged by them.
 */
export async function buildPrismaScopeWhere(
  userId: string,
  role: string,
  entityType: string,
): Promise<Record<string, unknown> | null> {
  if (PRIVILEGED_ROLES.includes(role)) return null

  // Get IDs of entities this user has tagged (two-step approach)
  const taggedIds = await getTaggedEntityIds(userId, entityType)

  const orConditions: Record<string, unknown>[] = [
    { createdById: userId },
  ]

  // Entity-specific assignment field (verified against schema.prisma)
  if (entityType === 'project') {
    orConditions.push({ members: { some: { userId } } })
  } else if (entityType === 'task') {
    orConditions.push({ assigneeId: userId })
  } else if (entityType === 'risk') {
    orConditions.push({ ownerId: userId })
  } else if (entityType === 'userInput') {
    orConditions.push({ processedById: userId })  // NOT assignedToId
  }

  // Tag match: include entities this user has tagged
  if (taggedIds.length > 0) {
    orConditions.push({ id: { in: taggedIds } })
  }

  return { OR: orConditions }
}
```

- [ ] **Step 2: Apply scope filter to projectService.getProjects()**

In `projectService.ts`, modify the `getProjects()` function (not `getAll` — use actual function name). Add `userId` and `role` to its params interface:
```typescript
import { buildPrismaScopeWhere } from '../utils/scopeFilter.js'

// Extend ProjectQueryParams interface:
// userId?: string; role?: string;

// In getProjects function, add after existing where conditions:
const scopeWhere = await buildPrismaScopeWhere(userId, role, 'project')
const where = {
  isDeleted: false,
  ...existingFilters,
  ...(scopeWhere ? scopeWhere : {}),
}
```

The `userId` and `role` should be passed from the controller (from `req.user`).

- [ ] **Step 3: Apply scope filter to other services**

Same pattern as Step 2, using actual function names:
- `taskService.getTasks()` → `buildPrismaScopeWhere(userId, role, 'task')`
- `riskService.getRisks()` → `buildPrismaScopeWhere(userId, role, 'risk')`
- `documentService.getDocuments()` → `buildPrismaScopeWhere(userId, role, 'document')`
- `userInputService.getUserInputs()` → `buildPrismaScopeWhere(userId, role, 'userInput')`

Each service's list function needs its query params interface extended with `userId?: string` and `role?: string`.

Note: `buildPrismaScopeWhere` is now `async` due to the tag ID lookup — await it before building the `where` clause.

- [ ] **Step 4: Update controllers to pass userId/role to services**

In each list controller (projectController, taskController, riskController, documentController, userInputController), pass `req.user.id` and `req.user.role` to the service list call.

- [ ] **Step 5: Verify stats endpoints support scope filtering**

Check `statsService` functions (`getProjectStats`, `getTaskKpis`, `getRiskStats`, `getDocumentStats`) — if they return global stats, they should also accept userId/role and apply scope filtering for non-direzione users. Add scope where needed.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/scopeFilter.ts server/src/services/*.ts server/src/controllers/*.ts
git commit -m "feat(api): add scope=mine filter for admin/dipendente on all list services"
```

---

### Task 4: Backend — Document Versions Endpoint + UserInput Reply Endpoint

**Files:**
- Modify: `server/src/services/documentService.ts`
- Modify: `server/src/controllers/documentController.ts`
- Modify: `server/src/routes/documentRoutes.ts`
- Modify: `server/src/services/userInputService.ts`
- Modify: `server/src/controllers/userInputController.ts`
- Modify: `server/src/routes/userInputRoutes.ts`
- Modify: `server/src/schemas/userInputSchemas.ts`

- [ ] **Step 1: Add getVersions to documentService.ts**

```typescript
async function getVersions(documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } })
  if (!doc) throw new AppError('Document not found', 404)

  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { version: 'desc' },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  })
}
```

- [ ] **Step 2: Add getVersions controller + route**

Controller:
```typescript
export const getDocumentVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = uuidParamSchema.parse(req.params)
    const versions = await documentService.getVersions(id)
    sendSuccess(res, versions)
  } catch (error) { next(error) }
}
```

Route: `router.get('/:id/versions', documentController.getDocumentVersions)`

- [ ] **Step 3: Add reply schema for UserInput**

In `server/src/schemas/userInputSchemas.ts`:
```typescript
export const replyInputSchema = z.object({
  content: z.string().min(1).max(5000),
})
```

- [ ] **Step 4: Add reply service + controller + route for UserInput**

Service:
```typescript
async function addReply(inputId: string, userId: string, content: string) {
  const input = await prisma.userInput.findUnique({ where: { id: inputId } })
  if (!input) throw new AppError('Input not found', 404)

  const reply = await prisma.userInputReply.create({
    data: { inputId, userId, content },
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
  })

  // Notify the original author (match CreateNotificationInput interface: userId, type, title, message, data?)
  if (input.createdById !== userId) {
    await notificationService.createNotification({
      userId: input.createdById,
      type: 'input_reply',
      title: 'Nuova risposta alla tua richiesta',
      message: 'Hai ricevuto una nuova risposta alla tua richiesta',
      data: { entityType: 'userInput', entityId: inputId },
    })
  }

  return reply
}
```

Controller: standard pattern (validate, requireUserId, service, sendCreated).
Route: `router.post('/:id/reply', userInputController.addReply)`

- [ ] **Step 5: Update userInputService.getById to include replies**

Add to the `include` clause:
```typescript
replies: {
  orderBy: { createdAt: 'asc' },
  include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
},
```

- [ ] **Step 6: Add frontend hook `useDocumentVersionsQuery` in hooks/api/useDocuments.ts**

```typescript
export function useDocumentVersionsQuery(documentId: string | undefined) {
  return useQuery({
    queryKey: ['documents', 'versions', documentId],
    queryFn: () => api.get(`/documents/${documentId}/versions`).then(r => r.data.data),
    enabled: !!documentId,
    staleTime: 60_000,
  })
}
```

- [ ] **Step 7: Add frontend hook `useReplyToInput` in hooks/api/useInputs.ts**

```typescript
export function useReplyToInput() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ inputId, content }: { inputId: string; content: string }) =>
      api.post(`/inputs/${inputId}/reply`, { content }).then(r => r.data.data),
    onSuccess: (_, { inputId }) => {
      qc.invalidateQueries({ queryKey: ['inputs', inputId] })
    },
  })
}
```

- [ ] **Step 8: Commit**

```bash
git add server/src/ client/src/hooks/api/
git commit -m "feat(api): add document versions endpoint and UserInput reply system"
```

---

### Task 5: Backend — Budget Breakdown Endpoint

**Files:**
- Modify: `server/src/services/statsService.ts`
- Modify: `server/src/controllers/statsController.ts`
- Modify: `server/src/routes/statsRoutes.ts`

- [ ] **Step 1: Add getBudgetBreakdown to statsService.ts**

```typescript
async function getBudgetBreakdown(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, budget: true },
  })
  if (!project) throw new AppError('Project not found', 404)

  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      task: { projectId, isDeleted: false },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, hourlyRate: true } },
    },
  })

  // Group by user
  const byUser = new Map<string, { user: any; totalMinutes: number; totalCost: number }>()
  for (const te of timeEntries) {
    const existing = byUser.get(te.userId) ?? {
      user: te.user,
      totalMinutes: 0,
      totalCost: 0,
    }
    existing.totalMinutes += te.minutes
    const hourlyRate = Number(te.user.hourlyRate ?? 0)
    existing.totalCost += (te.minutes / 60) * hourlyRate
    byUser.set(te.userId, existing)
  }

  const members = Array.from(byUser.values()).map(m => ({
    userId: m.user.id,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    hoursLogged: Math.round((m.totalMinutes / 60) * 100) / 100,
    cost: Math.round(m.totalCost * 100) / 100,
    hourlyRate: Number(m.user.hourlyRate ?? 0),
  }))

  const totalCost = members.reduce((sum, m) => sum + m.cost, 0)
  const totalHours = members.reduce((sum, m) => sum + m.hoursLogged, 0)

  return {
    budget: project.budget ? Number(project.budget) : null,
    totalCost: Math.round(totalCost * 100) / 100,
    totalHours: Math.round(totalHours * 100) / 100,
    budgetUsedPercent: project.budget ? Math.round((totalCost / Number(project.budget)) * 10000) / 100 : null,
    members,
  }
}
```

- [ ] **Step 2: Add controller + route**

Controller: standard pattern.
Route: `router.get('/project/:id/budget-breakdown', statsController.getBudgetBreakdown)`

Ensure this is registered BEFORE the `/:domain` route in statsRoutes.

- [ ] **Step 3: Add frontend hook**

In `hooks/api/useStats.ts`:
```typescript
export function useBudgetBreakdownQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: ['stats', 'budget-breakdown', projectId],
    queryFn: () => api.get(`/stats/project/${projectId}/budget-breakdown`).then(r => r.data.data),
    enabled: !!projectId,
    staleTime: 60_000,
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/statsService.ts server/src/controllers/statsController.ts server/src/routes/statsRoutes.ts client/src/hooks/api/useStats.ts
git commit -m "feat(api): add project budget breakdown endpoint"
```

---

## Chunk 2: Frontend Shared Components

### Task 6: THEME_EFFECTS + useThemeConfig Enhancement

**Files:**
- Modify: `client/src/lib/theme-config.ts`
- Modify: `client/src/stores/themeStore.ts`
- Modify: `client/src/hooks/api/useAuth.ts`

- [ ] **Step 1: Add THEME_EFFECTS to theme-config.ts**

Add after existing `THEME_ANIMATIONS`:
```typescript
export const THEME_EFFECTS = {
  'office-classic': {
    cardHover: 'hover:bg-muted/50 transition-colors duration-150',
    cardShadow: 'shadow-sm',
    cardBorder: 'border',
    badgeStyle: 'border',
    progressStyle: 'rounded-sm',
    kpiStyle: 'bg-card',
    transitionDuration: 150,
    transitionType: 'ease' as const,
  },
  'asana-like': {
    cardHover: 'hover:scale-[1.01] hover:bg-accent/10 transition-all duration-200',
    cardShadow: 'shadow-md',
    cardBorder: 'border border-border/50',
    badgeStyle: 'rounded-full bg-opacity-20',
    progressStyle: 'rounded-full',
    kpiStyle: 'bg-gradient-to-br from-card to-accent/5',
    transitionDuration: 200,
    transitionType: 'spring' as const,
  },
  'tech-hud': {
    cardHover: 'hover:border-primary/30 hover:shadow-[0_0_6px] hover:shadow-primary/20 transition-all duration-[250ms]',
    cardShadow: 'shadow-[0_0_8px] shadow-primary/10',
    cardBorder: 'border border-primary/10',
    badgeStyle: 'border border-primary/20 font-mono text-xs',
    progressStyle: 'rounded shadow-[0_0_4px] shadow-primary/20',
    kpiStyle: 'bg-card border border-primary/10 shadow-[0_0_6px] shadow-primary/5',
    transitionDuration: 250,
    transitionType: 'ease' as const,
  },
} as const

export type ThemeEffects = typeof THEME_EFFECTS[keyof typeof THEME_EFFECTS]
```

- [ ] **Step 2: Update useThemeConfig hook to include effects**

In the hook return, add:
```typescript
effects: THEME_EFFECTS[theme] ?? THEME_EFFECTS['office-classic'],
```

- [ ] **Step 3: Update themeStore to sync with backend on login**

Add a `initFromServer` action:
```typescript
initFromServer: (serverTheme?: string | null, serverMode?: string | null) => {
  if (serverTheme && ['office-classic', 'asana-like', 'tech-hud'].includes(serverTheme)) {
    set({ theme: serverTheme as ThemeStyle })
  }
  if (serverMode && ['light', 'dark', 'system'].includes(serverMode)) {
    set({ mode: serverMode as ThemeMode })
  }
},
```

- [ ] **Step 4: Update useLogin hook to apply server preferences**

In `useAuth.ts`, after successful login. Preferences come from `data.user` (not a separate `data.preferences` — see Task 2 Step 5):
```typescript
// After storing tokens, apply server preferences
const user = data.user
if (user.theme || user.themeStyle) {
  useThemeStore.getState().initFromServer(user.theme, user.themeStyle)
}
```

Note: Also update the `useLogin` return type to include `theme`, `themeStyle` in the User type if not already there.

- [ ] **Step 5: Add background sync on theme change**

In themeStore, add `import api from '@/lib/api'` (new dependency — first time themeStore imports api, which is fine since api is a plain Axios module). Then modify `setTheme` and `setMode`:
```typescript
setTheme: (theme) => {
  set({ theme })
  // Fire-and-forget sync to backend
  api.patch('/users/me/preferences', { theme }).catch(() => {})
},
setMode: (mode) => {
  set({ mode })
  api.patch('/users/me/preferences', { themeStyle: mode }).catch(() => {})
},
```

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/theme-config.ts client/src/stores/themeStore.ts client/src/hooks/api/useAuth.ts
git commit -m "feat(ui): add THEME_EFFECTS and backend theme sync"
```

---

### Task 7: EntityRow Component

**Files:**
- Create: `client/src/components/common/EntityRow.tsx`

- [ ] **Step 1: Create EntityRow component**

```typescript
// See spec section 2.3 for full EntityRowProps interface
// Key elements: icon (from useThemeConfig), name (primary), code (muted secondary),
// status badge, progress bar inline, assignee avatar, deadline with urgency,
// tag badges (max 3 + overflow), problem indicators, chevron right
```

**Important: Component interface notes (verified against codebase):**
- `ProblemIndicators` expects `{ blockedTasks?: number; openRisks?: number; comments?: number; checklistDone?: number; checklistTotal?: number }` — NOT booleans. The EntityRow `indicators` prop must match this interface.
- `DeadlineCell` expects prop `dueDate` (not `date`).
- `ProgressGradient` accepts `value`, `className`, and `context` (defaults to `'project'`). Pass `context` based on `entityType`.
- Import `StatusBadge` from `@/components/common/StatusBadge`.

Updated `indicators` prop type in EntityRowProps:
```typescript
indicators?: {
  blockedTasks?: number
  openRisks?: number
  comments?: number
  checklistDone?: number
  checklistTotal?: number
}
```

Component structure:
```
<motion.div onClick className={cn('flex items-center gap-3 p-3 cursor-pointer', effects.cardHover, effects.cardBorder)}>
  <DomainIcon />                        {/* from useThemeConfig */}
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2">
      <span className="font-medium truncate">{name}</span>
      {code && <span className="text-xs text-muted-foreground">{code}</span>}
      <TagInline tags={tags} />
      {extraBadges}
    </div>
    {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
  </div>
  <StatusBadge status={status} />
  {progress != null && <ProgressGradient value={progress} context={entityType} className="w-20" />}
  {assignee && <Avatar ... />}
  {deadline && <DeadlineCell dueDate={deadline} />}
  {indicators && <ProblemIndicators {...indicators} />}
  <ChevronRight className="w-4 h-4 text-muted-foreground" />
</motion.div>
```

Must handle:
- Loading: skeleton variant (pass `isLoading` prop)
- Empty: handled by parent EntityList
- Theme effects: read from `useThemeConfig().effects`
- Framer Motion: `whileHover` based on theme animation config

- [ ] **Step 2: Commit**

```bash
git add client/src/components/common/EntityRow.tsx
git commit -m "feat(ui): add EntityRow rich list row component"
```

---

### Task 8: TagInline + TagEditor + TagFilter Components

**Files:**
- Create: `client/src/components/common/TagInline.tsx`
- Create: `client/src/components/common/TagEditor.tsx`
- Create: `client/src/components/common/TagFilter.tsx`

- [ ] **Step 1: Create TagInline**

Shows max 3 tag badges + "+N" overflow. Each tag is a small colored Badge.
```typescript
interface TagInlineProps {
  tags: Array<{ id: string; name: string; color?: string }>
  max?: number  // default 3
  onTagClick?: (tagId: string) => void
}
```

- [ ] **Step 2: Create TagEditor**

Inline editor with autocomplete from `useTagListQuery()`. Shows current tags + "add" button that opens a Popover with Command (shadcn/ui) for search/select.

Uses: `useEntityTagsQuery(entityType, entityId)`, `useAssignTag()`, `useUnassignTag()`

- [ ] **Step 3: Create TagFilter**

Multi-select filter for ListFilters. Uses Popover + Command with checkboxes for tag selection.
```typescript
interface TagFilterProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/common/Tag*.tsx
git commit -m "feat(ui): add TagInline, TagEditor, TagFilter components"
```

---

### Task 9: NoteTab + ActivityTab Reusable Components

**Files:**
- Create: `client/src/components/common/NoteTab.tsx`
- Create: `client/src/components/common/ActivityTab.tsx`

- [ ] **Step 1: Create NoteTab**

Reusable tab for notes CRUD. Props:
```typescript
interface NoteTabProps {
  entityType: string
  entityId: string
}
```

Uses: `useNoteListQuery(entityType, entityId)`, `useCreateNote()`, `useUpdateNote()`, `useDeleteNote()`

Mutation variable shapes (from `hooks/api/useNotes.ts`):
- `useCreateNote()` → `{ entityType, entityId, content }`
- `useUpdateNote()` → `{ id, content, entityType, entityId }`
- `useDeleteNote()` → `{ id, entityType, entityId }`

Layout:
- List of notes (avatar, author, date, content, edit/delete buttons)
- Form at bottom (Textarea + Submit button)
- Empty state: "Nessuna nota"
- Loading: Skeleton (3 rows)

- [ ] **Step 2: Create ActivityTab**

Reusable tab for audit log timeline. Props:
```typescript
interface ActivityTabProps {
  entityType: string
  entityId: string
  limit?: number  // default 20
}
```

Uses: `useActivityQuery(entityType, entityId)`

Layout:
- Vertical timeline with dots
- Each item: avatar, user name, action description, field change (old → new), date
- Empty state: "Nessuna attività"
- Loading: Skeleton timeline

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/NoteTab.tsx client/src/components/common/ActivityTab.tsx
git commit -m "feat(ui): add reusable NoteTab and ActivityTab components"
```

---

## Chunk 3: Template Enhancement

### Task 10: Enhance EntityList with Mandatory KpiStrip + Theme Effects

**Files:**
- Modify: `client/src/components/common/EntityList.tsx`
- Modify: `client/src/components/common/KpiStrip.tsx` (if needed)

- [ ] **Step 1: Enhance KpiStrip + AlertStrip integration in EntityList**

**Important**: EntityList already has a `kpiStrip?: KpiCard[]` prop (line ~72) and renders it when provided. Keep this existing prop-driven pattern — do NOT add a `domain` prop that auto-fetches inside EntityList (that would break the current pattern of EntityList as a presentation component). Instead, each page is responsible for fetching KPI data and passing it via the existing `kpiStrip` prop.

Add new props for AlertStrip and custom row rendering:

```typescript
interface EntityListProps<T> {
  // ... existing props (kpiStrip already exists)
  alertItems?: AlertItem[]  // for AlertStrip (use AlertItem type from AlertStrip.tsx, NOT AttentionItem)
  renderRow?: (item: T) => React.ReactNode  // for EntityRow custom rendering in list view mode
}
```

**Type note**: `AlertItem` has `{ id, severity, title, subtitle?, projectName?, time }`. If the page uses `useAttentionItemsQuery()` which returns `AttentionItem[]`, convert using the existing `attentionToAlerts()` pattern from HomePage.tsx before passing to EntityList.

**`renderRow` integration**: When `renderRow` is provided and view mode is "list" (not "table"), use `renderRow(item)` instead of the default DataTable row. When view mode is "table", continue using DataTable columns as before. This gives pages the option to use EntityRow for rich list rendering while keeping DataTable for tabular view.

At the top of the component, before filters:
```tsx
{kpiStrip && kpiStrip.length > 0 && <KpiStrip cards={kpiStrip} />}
{alertItems && alertItems.length > 0 && <AlertStrip alerts={alertItems} />}
```

- [ ] **Step 2: Apply theme effects to EntityList**

Read `useThemeConfig().effects` and apply:
- Card hover classes on rows
- Card shadow/border classes on the container
- Stagger animation timing from effects.transitionDuration

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/EntityList.tsx
git commit -m "feat(ui): enhance EntityList with mandatory KpiStrip and theme effects"
```

---

### Task 11: Enhance EntityDetail with Mandatory KpiRow + Sidebar + Standard Tabs

**Files:**
- Modify: `client/src/components/common/EntityDetail.tsx`

- [ ] **Step 1: Enhance EntityDetail props**

Ensure these props exist (some already do):
```typescript
interface EntityDetailProps {
  // ... existing props
  kpiRow?: React.ReactNode       // KPI row below hero (already exists as prop)
  sidebar?: React.ReactNode      // Sidebar (already exists)
  // Ensure tabs support ActivityTab and NoteTab integration
}
```

The main change is in how pages USE EntityDetail — they must always provide `kpiRow` and `sidebar`. This is enforced by convention (spec rule: "if no KPI → it's a bug"), not by making props required.

- [ ] **Step 2: Apply theme effects to EntityDetail**

Read `useThemeConfig().effects` and apply with `cn()`:
- Detail container: `cn('...existing classes', effects.cardShadow, effects.cardBorder)`
- Tab buttons: `cn('...existing classes', effects.cardHover)` for hover effect on tab items
- Sidebar cards (MetaRow sections): `cn('...existing classes', effects.kpiStyle)` for sidebar info cards
- KpiRow cards: `cn('...existing classes', effects.kpiStyle)` for KPI metric cards

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/EntityDetail.tsx
git commit -m "feat(ui): enhance EntityDetail with theme effects"
```

---

## Chunk 4: Phase 2 — Lists & Details Uniformization

### Task 12: Uniformize All List Pages

**Files:**
- Modify: `client/src/pages/projects/ProjectListPage.tsx`
- Modify: `client/src/pages/tasks/TaskListPage.tsx`
- Modify: `client/src/pages/risks/RiskListPage.tsx`
- Modify: `client/src/pages/documents/DocumentListPage.tsx`
- Modify: `client/src/pages/admin/UserListPage.tsx`
- Modify: `client/src/pages/inputs/UserInputListPage.tsx`

- [ ] **Step 1: ProjectListPage — add KpiStrip, AlertStrip, rich rows with tags**

- Fetch KPI data with `useStatsQuery('projects')` and pass as `kpiStrip` prop to EntityList
- Add `useAttentionItemsQuery()` filtered for project-related items, convert to `AlertItem[]`
- Ensure rows show: name (not code), status badge, progress, team avatars, deadline, phase, tags
- Add TagFilter to filter config

- [ ] **Step 2: TaskListPage — same pattern**

- Fetch KPI with `useStatsQuery('tasks')` and pass as `kpiStrip` prop
- Rows: name, status, priority badge, assignee avatar, deadline, parent project, tags, problem indicators
- Add TagFilter

- [ ] **Step 3: RiskListPage — same pattern**

- Fetch KPI with `useStatsQuery('risks')` and pass as `kpiStrip` prop
- Rows: name, risk score badge (colored), probability/impact, project name, owner, tags
- Add TagFilter

- [ ] **Step 4: DocumentListPage — same pattern**

- Fetch KPI with `useStatsQuery('documents')` and pass as `kpiStrip` prop
- Rows: name, status badge, type, project, version, tags
- Add TagFilter

- [ ] **Step 5: UserListPage — same pattern (admin-only page)**

- **No KpiStrip for users** — there is no backend stats endpoint for the `users` domain. Skip `kpiStrip` prop for this page. If KPI is needed later, a `GET /api/stats/users` endpoint must be created first.
- Rows: name, role badge, department, last login, status (active/inactive)

- [ ] **Step 6: UserInputListPage — rewrite with full pattern**

- Fetch KPI with `useStatsQuery('inputs')` and pass as `kpiStrip` prop (verify backend has stats for inputs domain)
- KpiStrip: pending, processing, resolved counts, avg response time
- Rows: title, author avatar, status, date, reply count, priority, tags
- GroupBy: status
- Add TagFilter

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/
git commit -m "feat(ui): uniformize all list pages with KpiStrip, tags, rich rows"
```

---

### Task 13: Uniformize All Detail Pages

**Note**: UserInputDetailPage is excluded here — it is fully rewritten in Task 16. WeeklyReportPage is out of scope for this plan.

**Files:**
- Modify: `client/src/pages/projects/ProjectDetailPage.tsx`
- Modify: `client/src/pages/tasks/TaskDetailPage.tsx`
- Modify: `client/src/pages/risks/RiskDetailPage.tsx`
- Modify: `client/src/pages/documents/DocumentDetailPage.tsx`

- [ ] **Step 1: ProjectDetailPage — add KpiRow, enhance sidebar, add tags**

- Add KpiRow with 6 cards: advancement %, tasks, hours, budget %, risks, team
- Ensure sidebar always shows: meta info, related risks, related docs, team
- Add TagEditor to hero area
- Replace Activity tab content with ActivityTab component
- Keep existing tabs, add Budget and Team tabs (Task 15)

- [ ] **Step 2: TaskDetailPage — add KpiRow, enhance sidebar, fix Allegati, add tags**

- Add KpiRow with 5 cards: completion %, subtasks, hours logged/estimated, remaining, assignee
- Ensure sidebar shows: parent project, related risks, attachments count
- Add TagEditor to hero area
- Replace Activity tab content with ActivityTab component
- Fix Allegati tab upload handler (wire useUploadAttachment)
- Add dependencies section to Details tab

- [ ] **Step 3: RiskDetailPage — add KpiRow, add tabs, add tags**

- Add KpiRow (inline computed): score, mitigation tasks, days open, project link
- Add TagEditor to hero area
- Replace Note placeholder with NoteTab component
- Add "Task collegati" tab using useRelatedQuery
- Add "Attività" tab using ActivityTab component
- Enhance sidebar with related project, mitigation tasks

- [ ] **Step 4: DocumentDetailPage — add KpiRow, add tabs, add tags**

- Add KpiRow (inline computed): status, version, days in current status, project link
- Add TagEditor to hero area
- Replace Note placeholder with NoteTab component
- Add "Versioni" tab using useDocumentVersionsQuery
- Replace Activity tab with ActivityTab component
- Enhance sidebar with related project, versions count

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/
git commit -m "feat(ui): uniformize all detail pages with KpiRow, sidebar, tags, real tabs"
```

---

## Chunk 5: Phase 2 — HomePage + New Pages

### Task 14: HomePage Rewrite — Operational Dashboard

**Files:**
- Modify: `client/src/pages/home/HomePage.tsx`

- [ ] **Step 1: Restructure HomePage layout**

The current HomePage uses a tab-based layout (Milestone, Calendario, Task, Progetti tabs, ~400 lines of sub-components). Replace with the single dense view structure — this is a significant rewrite:

```
Header (greeting + date + week)
KpiStrip (role-filtered)
AlertStrip (attention items)
2-column layout:
  Left (60%): My tasks today, Deadlines 7 days, Projects overview
  Right (40%): Activity feed (live), Notifications, Frequent tags
```

Use existing hooks (all verified in `hooks/api/useDashboard.ts`):
- `useDashboardStatsQuery()` for KPI
- `useAttentionItemsQuery()` for alerts
- `useMyTasksTodayQuery()` for tasks
- `useRecentActivityQuery()` for feed
- `useNotificationListQuery()` for notifications (from `hooks/api/useNotifications.ts`)

- [ ] **Step 2: Build section components**

Extract each section as a sub-component within HomePage or in `components/domain/home/`:
- `MyTasksSection` — task list with status dots, quick actions
- `DeadlinesSection` — 7-day timeline, deadline urgency colors
- `ProjectsOverviewSection` — top projects with progress bars
- `ActivityFeedSection` — chronological feed
- `NotificationsSection` — recent unread with mark-as-read
- `FrequentTagsSection` — user's frequently used tags as chips

- [ ] **Step 3: Implement role-based content**

```typescript
const isDirezione = user?.role === 'direzione'
```

Direzione: all data, team task grouping
Admin/Dipendente: filtered to own scope (backend already filters via scope=mine)

- [ ] **Step 4: Add socket.io live feed updates**

**Important**: The existing `useSocket` hook (in `hooks/useSocket.ts`) does NOT use an event-listener pattern — it takes `(token, userId)` and is already called from `AppShell.tsx`. It already invalidates `['dashboard']` queries on `task:statusChanged` events. So live query updates already work via TanStack Query reactivity.

What needs to be added:
1. **Disconnect indicator**: detect socket connection state and show "Aggiornamento in pausa" badge when disconnected. Either expose a `connected` state from the existing `useSocket` hook, or create a new lightweight `useSocketStatus()` hook that reads the socket.io client connection state.
2. **On reconnect**: invalidate all dashboard queries to refresh stale data (may already happen via existing hook — verify).

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/home/HomePage.tsx
git commit -m "feat(ui): rewrite HomePage as operational dashboard with live feed"
```

---

### Task 15: ProjectDetailPage — Budget + Team Tabs

**Files:**
- Modify: `client/src/pages/projects/ProjectDetailPage.tsx`
- Create: `client/src/components/domain/projects/BudgetTab.tsx`
- Create: `client/src/components/domain/projects/TeamTab.tsx`

- [ ] **Step 1: Create BudgetTab component**

Uses `useBudgetBreakdownQuery(projectId)`.

Layout:
- Summary cards: total budget, total spent, remaining, % used (ProgressGradient)
- Hours cards: estimated vs logged (ProgressGradient)
- Member breakdown table: name, hours, cost, hourly rate
- Empty state if no budget set: "Budget non configurato"

- [ ] **Step 2: Create TeamTab component**

Uses `useProjectMembersQuery(projectId)`.

Layout:
- Grid of member cards: avatar, name, role badge, hours logged, tasks assigned count
- Add member button (if privileged): opens Popover with user search
- Remove member button (if privileged): confirmation dialog

- [ ] **Step 3: Add tabs to ProjectDetailPage**

Insert Budget and Team tabs into the tabs array:
```typescript
const tabs = [
  { key: 'overview', label: 'Panoramica', content: <OverviewTab /> },
  { key: 'tasks', label: 'Task', content: <TasksTab /> },
  { key: 'budget', label: 'Budget', content: <BudgetTab projectId={project.id} /> },
  { key: 'team', label: 'Team', content: <TeamTab projectId={project.id} /> },
  { key: 'risks', label: 'Rischi', content: <RisksTab /> },
  { key: 'documents', label: 'Documenti', content: <DocumentsTab /> },
  { key: 'activity', label: 'Attività', content: <ActivityTab entityType="project" entityId={project.id} /> },
]
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/projects/ client/src/components/domain/projects/
git commit -m "feat(ui): add Budget and Team tabs to ProjectDetailPage"
```

---

### Task 16: UserInputDetailPage — Conversation Rewrite

**Files:**
- Modify: `client/src/pages/inputs/UserInputDetailPage.tsx`
- Create: `client/src/components/domain/inputs/ConversationTab.tsx`

- [ ] **Step 1: Create ConversationTab**

Uses `useInputQuery(id)` (replies included) + `useReplyToInput()`.

Layout:
- Vertical thread: original request message at top, then replies chronologically
- Each message: avatar, author name, date, content
- Distinguish original author vs operator (different bg colors)
- Reply form at bottom: Textarea + Submit button
- Empty state if no replies: "Nessuna risposta ancora"

- [ ] **Step 2: Rewrite UserInputDetailPage with full tabs**

```typescript
const tabs = [
  { key: 'conversation', label: 'Conversazione', content: <ConversationTab inputId={input.id} /> },
  { key: 'details', label: 'Dettagli', content: <DetailsTab input={input} /> },
  { key: 'activity', label: 'Attività', content: <ActivityTab entityType="userInput" entityId={input.id} /> },
]
```

Add KpiRow (inline): status, author, created date, response count, time to resolve.
Add sidebar: meta info, assignee, status transitions.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/inputs/ client/src/components/domain/inputs/
git commit -m "feat(ui): rewrite UserInputDetailPage with conversation thread"
```

---

### Task 17: UserDetailPage — New Page

**Files:**
- Create: `client/src/pages/admin/UserDetailPage.tsx`
- Modify: `client/src/App.tsx` (add route)

- [ ] **Step 1: Create UserDetailPage**

Uses: `useUserQuery(id)`, `useActivityQuery('user', id)`, `useRelatedQuery('user', id)`

Tabs:
```typescript
const tabs = [
  { key: 'overview', label: 'Panoramica', content: <OverviewTab user={user} /> },
  { key: 'projects', label: 'Progetti', content: <ProjectsTab userId={user.id} /> },
  { key: 'tasks', label: 'Task', content: <TasksTab userId={user.id} /> },
  { key: 'hours', label: 'Ore', content: <HoursTab userId={user.id} /> },
  { key: 'activity', label: 'Attività', content: <ActivityTab entityType="user" entityId={user.id} /> },
]
```

Uses EntityDetail template with breadcrumbs: Home > Utenti > [Nome].

- [ ] **Step 2: Add route in App.tsx**

Add lazy import at top of App.tsx:
```typescript
const UserDetailPage = lazy(() => import('./pages/admin/UserDetailPage'))
```

Add route — must be AFTER `/admin/users/new` (to avoid `new` matching as `:id`) but BEFORE `/admin/users/:id/edit`:
```typescript
<Route path="/admin/users/new" element={<UserFormPage />} />
<Route path="/admin/users/:id" element={<UserDetailPage />} />
<Route path="/admin/users/:id/edit" element={<UserFormPage />} />
```

**Note**: Verify `useRelatedQuery('user', id)` is supported by the backend `relatedEntitiesService`. If not, the sub-tabs (Projects, Tasks, Hours) will need dedicated query hooks or backend support.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/UserDetailPage.tsx client/src/App.tsx
git commit -m "feat(ui): add UserDetailPage with full tabs"
```

---

### Task 18: ProfilePage — Preferences

**Files:**
- Modify: `client/src/pages/profile/ProfilePage.tsx`

- [ ] **Step 1: Add theme preferences section**

```tsx
<Card>
  <CardHeader><CardTitle>Aspetto</CardTitle></CardHeader>
  <CardContent className="space-y-4">
    <div>
      <Label>Tema</Label>
      <Select value={theme} onValueChange={setTheme}>
        <SelectItem value="office-classic">Office Classic</SelectItem>
        <SelectItem value="asana-like">Asana Like</SelectItem>
        <SelectItem value="tech-hud">Tech HUD</SelectItem>
      </Select>
    </div>
    <div>
      <Label>Modalità</Label>
      <Select value={mode} onValueChange={setMode}>
        <SelectItem value="light">Chiaro</SelectItem>
        <SelectItem value="dark">Scuro</SelectItem>
        <SelectItem value="system">Sistema</SelectItem>
      </Select>
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 2: Add notification preferences section**

```tsx
<Card>
  <CardHeader><CardTitle>Notifiche</CardTitle></CardHeader>
  <CardContent className="space-y-3">
    <div className="flex items-center justify-between">
      <Label>Suono</Label>
      <Switch checked={sound} onCheckedChange={(v) => {
        toggleSound()
        // Sync to backend (fire-and-forget, same pattern as theme sync)
        api.patch('/users/me/preferences', { notificationPreferences: { ...currentPrefs, sound: v } }).catch(() => {})
      }} />
    </div>
    <div className="flex items-center justify-between">
      <Label>Desktop</Label>
      <Switch checked={desktop} onCheckedChange={(v) => {
        toggleDesktop()
        api.patch('/users/me/preferences', { notificationPreferences: { ...currentPrefs, desktop: v } }).catch(() => {})
      }} />
    </div>
    <Separator />
    <Label className="text-sm text-muted-foreground">Tipi di notifica</Label>
    {/* Toggle per: Task, Rischi, Documenti, Automazioni — same sync pattern */}
  </CardContent>
</Card>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/profile/ProfilePage.tsx
git commit -m "feat(ui): add theme and notification preferences to ProfilePage"
```

---

## Chunk 6: Phase 2 — Notifications + Final Coordination

### Task 19: Notification Badge in Header + Actionable Notifications

**Files:**
- Modify: `client/src/components/layout/Header.tsx`
- Modify: `client/src/components/features/NotificationPanel.tsx`

- [ ] **Step 1: Verify and enhance notification badge in Header**

**Already implemented**: Header.tsx already has the bell icon with unread count badge (`useUnreadCountQuery`, lines ~159-177) and opening NotificationPanel. The socket hook in AppShell already invalidates notification queries for real-time updates.

**Enhancement needed**: Apply theme effects to the badge styling. Verify the badge counts update reactively when socket events fire. No code to write if already working — just verify.

- [ ] **Step 2: Enhance notifications — group by date**

**Already implemented**: NotificationPanel already has click-to-navigate (`handleNavigate`), individual mark-as-read, and "Segna tutti come letti" button.

**Enhancement needed**: Add grouping by date (today, yesterday, this week, older). This is the only genuinely missing feature. Add date group headers using the existing notification list data.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/Header.tsx client/src/components/features/NotificationPanel.tsx
git commit -m "feat(ui): add notification badge to Header and actionable notifications"
```

---

### Task 20: Breadcrumb Consistency + Final Coordination Pass

**Files:**
- Modify: All detail pages (ProjectDetailPage, TaskDetailPage, RiskDetailPage, DocumentDetailPage, UserInputDetailPage, UserDetailPage)

- [ ] **Step 1: Ensure hierarchical breadcrumbs everywhere**

Pattern for task under project:
```typescript
const breadcrumbs = [
  { label: 'Home', href: '/' },
  { label: 'Progetti', href: '/projects' },
  { label: project?.name ?? '...', href: `/projects/${task.projectId}` },
  { label: 'Task', href: `/projects/${task.projectId}?tab=tasks` },
  { label: task.title },
]
```

Pattern for risk under project:
```typescript
const breadcrumbs = [
  { label: 'Home', href: '/' },
  { label: 'Progetti', href: '/projects' },
  { label: project?.name ?? '...', href: `/projects/${risk.projectId}` },
  { label: 'Rischi', href: `/projects/${risk.projectId}?tab=risks` },
  { label: risk.title },
]
```

Each entity should always include its parent project in the breadcrumb chain when applicable.

- [ ] **Step 2: Final visual coordination check (verification only — fix issues if found)**

Verify all pages follow:
- Lists: KpiStrip → AlertStrip → Filters → Grouped table → Pagination
- Details: Breadcrumb → Stepper → Hero+KpiRow → Tabs+Sidebar
- All use theme effects from THEME_EFFECTS
- All use EntityRow for list rendering
- All have TagInline/TagEditor where appropriate
- No hex hardcoded colors
- No placeholder tabs

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/
git commit -m "feat(ui): finalize breadcrumb consistency and visual coordination"
```

---

## Implementation Notes

### File Reference Summary

**Backend files to create:**
- `server/src/utils/scopeFilter.ts`

**Backend files to modify:**
- `server/prisma/schema.prisma`
- `server/src/schemas/userSchemas.ts`
- `server/src/services/userService.ts`, `authService.ts`, `statsService.ts`, `documentService.ts`, `userInputService.ts`
- `server/src/services/projectService.ts`, `taskService.ts`, `riskService.ts`
- `server/src/controllers/userController.ts`, `statsController.ts`, `documentController.ts`, `userInputController.ts`
- `server/src/routes/userRoutes.ts`, `statsRoutes.ts`, `documentRoutes.ts`, `userInputRoutes.ts`

**Frontend files to create:**
- `client/src/components/common/EntityRow.tsx`
- `client/src/components/common/TagInline.tsx`
- `client/src/components/common/TagEditor.tsx`
- `client/src/components/common/TagFilter.tsx`
- `client/src/components/common/NoteTab.tsx`
- `client/src/components/common/ActivityTab.tsx`
- `client/src/components/domain/projects/BudgetTab.tsx`
- `client/src/components/domain/projects/TeamTab.tsx`
- `client/src/components/domain/inputs/ConversationTab.tsx`
- `client/src/pages/admin/UserDetailPage.tsx`

**Frontend files to modify:**
- `client/src/lib/theme-config.ts`
- `client/src/stores/themeStore.ts`
- `client/src/hooks/api/useAuth.ts`, `useStats.ts`, `useDocuments.ts`, `useInputs.ts`
- `client/src/components/common/EntityList.tsx`, `EntityDetail.tsx`
- `client/src/components/layout/Header.tsx`
- `client/src/components/features/NotificationPanel.tsx`
- `client/src/pages/home/HomePage.tsx`
- `client/src/pages/projects/ProjectDetailPage.tsx`, `ProjectListPage.tsx`
- `client/src/pages/tasks/TaskDetailPage.tsx`, `TaskListPage.tsx`
- `client/src/pages/risks/RiskDetailPage.tsx`, `RiskListPage.tsx`
- `client/src/pages/documents/DocumentDetailPage.tsx`, `DocumentListPage.tsx`
- `client/src/pages/inputs/UserInputListPage.tsx`, `UserInputDetailPage.tsx`
- `client/src/pages/admin/UserListPage.tsx`
- `client/src/pages/profile/ProfilePage.tsx`
- `client/src/App.tsx`

### Execution Order

Tasks 1-5 (Backend) can run in parallel with minor exceptions (Task 1 must complete before Tasks 3-5).
Tasks 6-9 (Shared Components) can run in parallel after Task 1-2 are done.
Tasks 10-11 (Template Enhancement) depend on Tasks 6-9.
Tasks 12-13 (Uniformization) depend on Tasks 10-11.
Tasks 14-20 (Pages) depend on Tasks 12-13, but are independent of each other.
