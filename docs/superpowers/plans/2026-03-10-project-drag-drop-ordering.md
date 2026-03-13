# Project Drag & Drop Ordering — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admin/direzione to set project display order via drag & drop in ProjectListPage; order is persisted in DB and visible to all users.

**Architecture:** Add `sortOrder Int` field to Project model. New `PATCH /api/projects/reorder` endpoint accepts batch position updates. Frontend integrates `@dnd-kit/sortable` into DataTable as an optional feature, activated when `sortBy=sortOrder` (new default).

**Tech Stack:** Prisma 7 (SQL Server), Express, Zod, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`, TanStack Query 5, React 18

**Spec:** `docs/superpowers/specs/2026-03-10-project-drag-drop-ordering-design.md`

---

## Chunk 1: Backend — Schema, Service, API

### Task 1: Add `sortOrder` field to Prisma schema

**Files:**
- Modify: `server/prisma/schema.prisma:80-118` (Project model)
- Modify: `server/src/utils/selectFields.ts:58-75` (projectSelectFields)

- [ ] **Step 1: Add `sortOrder` field to Project model**

In `server/prisma/schema.prisma`, add after `isDeleted` (line 95):

```prisma
  sortOrder       Int       @default(0) @map("sort_order")
```

Also add an index after line 116:

```prisma
  @@index([sortOrder])
```

- [ ] **Step 2: Add `sortOrder` to projectSelectFields**

In `server/src/utils/selectFields.ts`, add `sortOrder: true` to `projectSelectFields` (after line 71, before `ownerId`):

```typescript
export const projectSelectFields = {
  id: true,
  code: true,
  name: true,
  description: true,
  status: true,
  priority: true,
  startDate: true,
  targetEndDate: true,
  actualEndDate: true,
  budget: true,
  sortOrder: true,       // ← ADD
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  ownerId: true,
  templateId: true,
  createdById: true,
} as const
```

- [ ] **Step 3: Create and apply migration**

```bash
cd server
npx prisma migrate dev --name add_project_sort_order
```

- [ ] **Step 4: Backfill existing projects with sequential sortOrder**

Run a one-time backfill script via Prisma Studio or a seed update. Add to `server/prisma/seed.ts` or run directly:

```sql
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM projects
  WHERE is_deleted = 0
)
UPDATE projects
SET sort_order = ordered.rn
FROM ordered
WHERE projects.id = ordered.id;
```

Alternatively, add backfill logic at the end of the migration SQL file before committing.

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/ server/src/utils/selectFields.ts
git commit -m "feat(db): add sortOrder field to Project model"
```

---

### Task 2: Update types and schemas

**Files:**
- Modify: `server/src/types/index.ts:210-217` (ProjectQueryParams)
- Modify: `server/src/schemas/projectSchemas.ts:39-54` (projectQuerySchema)

- [ ] **Step 1: Update ProjectQueryParams type**

In `server/src/types/index.ts`, update the `sortBy` union at line 215:

```typescript
export interface ProjectQueryParams extends PaginationParams {
  status?: string
  priority?: string
  ownerId?: string
  search?: string
  sortBy?: 'createdAt' | 'name' | 'targetEndDate' | 'priority' | 'status' | 'sortOrder'
  sortOrder?: 'asc' | 'desc'
}
```

- [ ] **Step 2: Update projectQuerySchema**

In `server/src/schemas/projectSchemas.ts`, update lines 46-52:

```typescript
  sortBy: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['createdAt', 'name', 'targetEndDate', 'priority', 'status', 'sortOrder']).default('sortOrder')
  ),
  sortOrder: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['asc', 'desc']).default('asc')
  ),
```

- [ ] **Step 3: Add reorder schema**

In `server/src/schemas/projectSchemas.ts`, add at the end of the file:

```typescript
export const reorderProjectsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ).min(1).max(100),
})
```

- [ ] **Step 4: Commit**

```bash
git add server/src/types/index.ts server/src/schemas/projectSchemas.ts
git commit -m "feat(schema): add sortOrder to project query params and reorder schema"
```

---

### Task 3: Update project service

**Files:**
- Modify: `server/src/services/projectService.ts:28-64` (createProject)
- Modify: `server/src/services/projectService.ts:74-155` (getProjects)
- Modify: `server/src/services/projectService.ts:577-586` (exports)

- [ ] **Step 1: Update createProject to set sortOrder**

In `server/src/services/projectService.ts`, inside `createProject`, before the `prisma.$transaction` call (line 32), add the max sortOrder query:

```typescript
export async function createProject(data: CreateProjectInput, userId: string) {
  const code = await generateProjectCode()

  // Get next sortOrder
  const maxResult = await prisma.project.aggregate({
    _max: { sortOrder: true },
    where: { isDeleted: false },
  })
  const nextSortOrder = (maxResult._max.sortOrder ?? -1) + 1

  const project = await prisma.$transaction(async (tx) => {
    const newProject = await tx.project.create({
      data: {
        code,
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        templateId: data.templateId,
        startDate: data.startDate,
        targetEndDate: data.targetEndDate,
        budget: data.budget,
        priority: (data.priority as ProjectPriority) || 'medium',
        createdById: userId,
        sortOrder: nextSortOrder,
      },
      select: projectWithRelationsSelect,
    })
    // ... rest of transaction unchanged
```

- [ ] **Step 2: Update getProjects to handle sortOrder sorting**

In `server/src/services/projectService.ts`, update the sorting logic at lines 96-100. `sortOrder` is a normal DB field, so it uses Prisma sorting (same as `name`, `createdAt`, etc.):

```typescript
  // Priority sorting is done in-memory (string values need semantic ordering)
  const usePrismaSorting = sortBy !== 'priority'
  const orderBy: Prisma.ProjectOrderByWithRelationInput = usePrismaSorting
    ? { [sortBy]: sortOrder }
    : { createdAt: 'desc' }
```

No change needed here — `sortOrder` is already a DB column, so `usePrismaSorting` will be `true` and Prisma will sort by `{ sortOrder: 'asc' }` directly. The existing logic handles it.

- [ ] **Step 3: Add reorderProjects function**

Add before the `export const projectService` block (before line 577):

```typescript
/**
 * Reorders projects by updating their sortOrder values
 * @param items - Array of { id, sortOrder } pairs
 * @param userId - User making the change
 */
export async function reorderProjects(
  items: Array<{ id: string; sortOrder: number }>,
  userId: string
) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.project.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder, updatedAt: new Date() },
      })
    )
  )

  logger.info(`Projects reordered: ${items.length} items`, { userId })
}
```

- [ ] **Step 4: Add reorderProjects to exports**

Update the `projectService` export object:

```typescript
export const projectService = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectStats,
  changeProjectStatus,
  getMilestoneValidation,
  reorderProjects,
}
```

- [ ] **Step 5: Commit**

```bash
git add server/src/services/projectService.ts
git commit -m "feat(service): add reorderProjects and sortOrder to createProject"
```

---

### Task 4: Add controller and route

**Files:**
- Modify: `server/src/controllers/projectController.ts` (add reorderProjects)
- Modify: `server/src/routes/projectRoutes.ts` (add PATCH /reorder route)

- [ ] **Step 1: Add reorderProjects controller**

In `server/src/controllers/projectController.ts`, add import for the new schema at line 14:

```typescript
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema as querySchema,
  projectStatusChangeSchema as statusChangeSchema,
  reorderProjectsSchema,
} from '../schemas/projectSchemas.js'
```

Add the controller function at the end of the file (before the closing):

```typescript
/**
 * Reorders projects
 * @route PATCH /api/projects/reorder
 */
export async function reorderProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items } = reorderProjectsSchema.parse(req.body)
    const userId = requireUserId(req)

    await projectService.reorderProjects(items, userId)

    sendSuccess(res, null)
  } catch (error) {
    next(error)
  }
}
```

- [ ] **Step 2: Add route**

In `server/src/routes/projectRoutes.ts`, add import for `reorderProjects` at line 8:

```typescript
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  changeStatus,
  getProjectStats,
  getMilestoneValidation,
  reorderProjects,
} from '../controllers/projectController.js'
```

Add the route **before** the `/:id` routes (after line 25, before line 27):

```typescript
// PATCH /api/projects/reorder - Reorder projects (admin, direzione only)
router.patch('/reorder', requireRole('admin', 'direzione'), reorderProjects)
```

**Important:** This must be before `router.get('/:id', ...)` to avoid Express matching "reorder" as an `:id` param.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/projectController.ts server/src/routes/projectRoutes.ts
git commit -m "feat(api): add PATCH /api/projects/reorder endpoint"
```

---

## Chunk 2: Frontend — DnD Integration

### Task 5: Install @dnd-kit

**Files:**
- Modify: `client/package.json`

- [ ] **Step 1: Install dependencies**

```bash
cd client
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "feat(deps): add @dnd-kit for drag and drop"
```

Note: `package-lock.json` is at root level — check if it's there or in `client/`.

---

### Task 6: Add useReorderProjects mutation

**Files:**
- Modify: `client/src/hooks/api/useProjects.ts`

- [ ] **Step 1: Add the reorder mutation**

In `client/src/hooks/api/useProjects.ts`, add after `useDeleteProject` (before the `export { KEYS }` line):

```typescript
export function useReorderProjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: Array<{ id: string; sortOrder: number }>) => {
      const { data } = await api.patch('/projects/reorder', { items })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/api/useProjects.ts
git commit -m "feat(hook): add useReorderProjects mutation"
```

---

### Task 7: Add drag & drop support to DataTable

**Files:**
- Modify: `client/src/components/common/DataTable.tsx`

- [ ] **Step 1: Add DnD imports and types**

At the top of `client/src/components/common/DataTable.tsx`, add:

```typescript
import { GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
```

Note: `restrictToVerticalAxis` requires `@dnd-kit/modifiers`. If not available, omit and use no modifiers. Check package — if missing:

```bash
cd client && npm install @dnd-kit/modifiers
```

- [ ] **Step 2: Extend DataTableProps**

Add DnD-related props to the interface:

```typescript
interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort?: (key: string) => void
  selectedIds?: Set<string>
  onSelectToggle?: (id: string) => void
  onSelectAll?: (ids: string[]) => void
  getId?: (item: T) => string
  isLoading?: boolean
  loadingRows?: number
  // Drag & drop
  draggable?: boolean
  onReorder?: (activeId: string, overId: string) => void
}
```

- [ ] **Step 3: Create SortableRow component**

Add inside `DataTable.tsx`, before the `DataTable` function:

```typescript
function SortableRow<T>({
  item,
  id,
  columns,
  isSelected,
  onRowClick,
  hasSelection,
  onSelectToggle,
  theme,
  draggable,
}: {
  item: T
  id: string
  columns: Column<T>[]
  isSelected: boolean
  onRowClick?: (item: T) => void
  hasSelection: boolean
  onSelectToggle?: (id: string) => void
  theme: string
  draggable: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-state={isSelected ? "selected" : undefined}
      className={cn(
        onRowClick && "cursor-pointer",
        "transition-colors",
        isDragging && "z-50 bg-accent/30",
        theme === "tech-hud" &&
          "hover:bg-primary/5 hover:shadow-[inset_0_0_12px_hsl(var(--primary)/0.06)]",
        theme === "asana-like" && "hover:bg-accent/50"
      )}
      onClick={() => onRowClick?.(item)}
    >
      {draggable && (
        <TableCell className="w-8 px-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-accent"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </TableCell>
      )}
      {hasSelection && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelectToggle?.(id)}
            aria-label={`Seleziona riga ${id}`}
          />
        </TableCell>
      )}
      {columns.map((col) => (
        <TableCell key={col.key} className={col.className}>
          {col.cell(item)}
        </TableCell>
      ))}
    </TableRow>
  )
}
```

- [ ] **Step 4: Update DataTable body to use DnD**

Replace the entire `DataTable` function body. The key changes:
1. Accept `draggable` and `onReorder` props
2. Set up DnD sensors
3. Wrap `TableBody` content with `DndContext` + `SortableContext` when `draggable`
4. Use `SortableRow` instead of plain `TableRow` when `draggable`
5. Add a grip column header when `draggable`

```typescript
export function DataTable<T>({
  columns,
  data,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  getId,
  isLoading = false,
  loadingRows = 5,
  draggable = false,
  onReorder,
}: DataTableProps<T>) {
  const theme = useThemeStore((s) => s.theme)
  const hasSelection = onSelectToggle != null && getId != null

  const allIds = hasSelection ? data.map((item) => getId(item)) : []
  const allSelected = hasSelection && allIds.length > 0 && allIds.every((id) => selectedIds?.has(id))
  const someSelected = hasSelection && allIds.some((id) => selectedIds?.has(id)) && !allSelected

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorder?.(String(active.id), String(over.id))
    }
  }

  const itemIds = getId ? data.map((item) => getId(item)) : data.map((_, i) => String(i))

  const tableContent = (
    <Table>
      <TableHeader>
        <TableRow>
          {draggable && <TableHead className="w-8 px-1" />}
          {hasSelection && (
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as unknown as HTMLButtonElement).dataset.state = someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"
                  }
                }}
                onCheckedChange={() => onSelectAll?.(allIds)}
                aria-label="Seleziona tutti"
              />
            </TableHead>
          )}
          {columns.map((col) => (
            <TableHead key={col.key} className={col.className}>
              {col.sortable && onSort ? (
                <button
                  type="button"
                  className="inline-flex items-center hover:text-foreground transition-colors -ml-2 px-2 py-1 rounded-md"
                  onClick={() => onSort(col.key)}
                >
                  {col.header}
                  <SortIcon column={col.key} sortBy={sortBy} sortOrder={sortOrder} />
                </button>
              ) : (
                col.header
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading
          ? Array.from({ length: loadingRows }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {draggable && <TableCell className="w-8 px-1"><Skeleton className="h-4 w-4" /></TableCell>}
                {hasSelection && (
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    <Skeleton className="h-4 w-full max-w-[200px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : draggable && getId
            ? (
              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                {data.map((item) => {
                  const id = getId(item)
                  return (
                    <SortableRow
                      key={id}
                      item={item}
                      id={id}
                      columns={columns}
                      isSelected={selectedIds?.has(id) ?? false}
                      onRowClick={onRowClick}
                      hasSelection={hasSelection}
                      onSelectToggle={onSelectToggle}
                      theme={theme}
                      draggable={draggable}
                    />
                  )
                })}
              </SortableContext>
            )
            : data.map((item, idx) => {
                const id = getId ? getId(item) : String(idx)
                const isSelected = selectedIds?.has(id) ?? false
                return (
                  <TableRow
                    key={id}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(
                      onRowClick && "cursor-pointer",
                      "transition-colors",
                      theme === "tech-hud" && "hover:bg-primary/5 hover:shadow-[inset_0_0_12px_hsl(var(--primary)/0.06)]",
                      theme === "asana-like" && "hover:bg-accent/50",
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {hasSelection && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onSelectToggle(id)}
                          aria-label={`Seleziona riga ${id}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.cell(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
      </TableBody>
    </Table>
  )

  if (draggable && onReorder) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {tableContent}
      </DndContext>
    )
  }

  return tableContent
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/common/DataTable.tsx
git commit -m "feat(ui): add drag & drop support to DataTable"
```

---

### Task 8: Update EntityList to pass DnD props

**Files:**
- Modify: `client/src/components/common/EntityList.tsx:11-51` (props) and `166-181` (DataTable usage)

- [ ] **Step 1: Add DnD props to EntityListProps**

In `client/src/components/common/EntityList.tsx`, add to the interface (after `headerExtra`):

```typescript
  // Drag & drop
  draggable?: boolean
  onReorder?: (activeId: string, overId: string) => void
```

- [ ] **Step 2: Destructure and pass to DataTable**

Add `draggable` and `onReorder` to the destructured props, then pass them to `DataTable`:

```typescript
}: EntityListProps<T>) {
```
→ add `draggable` and `onReorder` to destructuring.

In the `<DataTable>` usage (around line 168):

```typescript
<DataTable
  columns={columns}
  data={data}
  onRowClick={onRowClick}
  sortBy={sortBy}
  sortOrder={sortOrder}
  onSort={onSort}
  selectedIds={selectedIds}
  onSelectToggle={onSelectToggle}
  onSelectAll={onSelectAll ? () => handleSelectAll() : undefined}
  getId={getId}
  isLoading={isLoading}
  draggable={draggable}
  onReorder={onReorder}
/>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/common/EntityList.tsx
git commit -m "feat(ui): pass drag & drop props through EntityList to DataTable"
```

---

### Task 9: Update ProjectListPage with DnD logic

**Files:**
- Modify: `client/src/pages/projects/ProjectListPage.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { useNavigate, useSearchParams } from "react-router-dom"
import { FolderKanban, Calendar, Users, ArrowUpDown } from "lucide-react"
import { arrayMove } from "@dnd-kit/sortable"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { EntityList, type Column, type FilterConfig } from "@/components/common/EntityList"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ProgressRing } from "@/components/common/ProgressRing"
import { Button } from "@/components/ui/button"
import { useProjectListQuery, useReorderProjects } from "@/hooks/api/useProjects"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import { PROJECT_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
```

- [ ] **Step 2: Add sortOrder to ProjectRow interface**

```typescript
interface ProjectRow {
  id: string
  code: string
  name: string
  status: string
  priority: string
  sortOrder: number
  targetEndDate?: string | null
  owner?: { firstName: string; lastName: string } | null
  stats?: { completionPercentage?: number; totalTasks?: number; completedTasks?: number } | null
  _count?: { tasks?: number } | null
}
```

- [ ] **Step 3: Update default sort and add DnD logic**

Replace the `ProjectListPage` function:

```typescript
export default function ProjectListPage() {
  useSetPageContext({ domain: 'project' })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isPrivileged } = usePrivilegedRole()
  const reorderMutation = useReorderProjects()

  const filters = {
    page: searchParams.get("page") || "1",
    limit: "20",
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    sortBy: searchParams.get("sortBy") || "sortOrder",
    sortOrder: searchParams.get("sortOrder") || "asc",
  }

  const isManualOrder = filters.sortBy === "sortOrder"
  const canDrag = isManualOrder && isPrivileged

  const { data, isLoading, error } = useProjectListQuery(filters)

  const projects = (data?.data ?? []) as ProjectRow[]
  const pagination = data?.pagination as
    | { page: number; limit: number; total: number; pages: number }
    | undefined

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== "page") params.set("page", "1")
    setSearchParams(params)
  }

  const handleFilterClear = () => setSearchParams({})
  const handlePageChange = (page: number) =>
    handleFilterChange("page", String(page))
  const handleSort = (key: string) => {
    const newOrder =
      filters.sortBy === key && filters.sortOrder === "asc" ? "desc" : "asc"
    const params = new URLSearchParams(searchParams)
    params.set("sortBy", key)
    params.set("sortOrder", newOrder)
    setSearchParams(params)
  }

  const handleResetToManualOrder = () => {
    const params = new URLSearchParams(searchParams)
    params.delete("sortBy")
    params.delete("sortOrder")
    setSearchParams(params)
  }

  const handleReorder = (activeId: string, overId: string) => {
    const oldIndex = projects.findIndex((p) => p.id === activeId)
    const newIndex = projects.findIndex((p) => p.id === overId)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(projects, oldIndex, newIndex)
    const items = reordered.map((p, i) => ({ id: p.id, sortOrder: i }))

    reorderMutation.mutate(items, {
      onError: () => {
        toast.error("Errore nel riordinamento")
      },
    })
  }

  const manualOrderButton = !isManualOrder ? (
    <Button variant="outline" size="sm" onClick={handleResetToManualOrder}>
      <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
      Ordine manuale
    </Button>
  ) : null

  return (
    <EntityList<ProjectRow>
      title="Progetti"
      icon={FolderKanban}
      data={projects}
      pagination={pagination}
      isLoading={isLoading}
      error={error ?? undefined}
      columns={columns}
      getId={(p) => p.id}
      filterConfig={filterConfig}
      filters={filters}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
      sortBy={filters.sortBy}
      sortOrder={filters.sortOrder as "asc" | "desc"}
      onSort={handleSort}
      onPageChange={handlePageChange}
      onRowClick={(p) => navigate(`/projects/${p.id}`)}
      createHref="/projects/new"
      createLabel="Nuovo Progetto"
      emptyIcon={FolderKanban}
      emptyTitle="Nessun progetto"
      emptyDescription="Crea il tuo primo progetto"
      headerExtra={manualOrderButton}
      draggable={canDrag}
      onReorder={canDrag ? handleReorder : undefined}
    />
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/projects/ProjectListPage.tsx
git commit -m "feat(ui): integrate drag & drop ordering in ProjectListPage"
```

---

### Task 10: Verify and test end-to-end

- [ ] **Step 1: Build frontend to check for TypeScript errors**

```bash
cd client && npm run build
```

Fix any TypeScript errors.

- [ ] **Step 2: Build backend to check for TypeScript errors**

```bash
cd server && npm run build
```

Fix any TypeScript errors.

- [ ] **Step 3: Manual test checklist**

1. Open ProjectListPage — projects should be sorted by `sortOrder` (ascending)
2. As admin/direzione: grip handles should be visible on left side of each row
3. Drag a project to a new position — order should persist after page refresh
4. Click a column header (e.g. "Nome") — DnD should deactivate, handles disappear
5. Click "Ordine manuale" button — DnD should reactivate
6. As dipendente: should see the manual order but no grip handles
7. New project created should appear at the bottom of the list

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues for project drag & drop ordering"
```
