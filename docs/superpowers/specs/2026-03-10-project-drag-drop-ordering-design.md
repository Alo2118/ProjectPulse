# Design: Ordinamento Manuale Progetti (Drag & Drop)

**Data:** 2026-03-10
**Stato:** Approvato

## Obiettivo

Permettere ad admin/direzione di impostare l'ordine in cui i progetti vengono visualizzati nella lista, tramite drag & drop. L'ordine manuale diventa il default; gli ordinamenti per colonna restano disponibili come alternativa.

## Decisioni

- **Approccio:** Campo `sortOrder Int` sul modello Project + `@dnd-kit/sortable` nel frontend
- **Posizione UI:** Nella ProjectListPage esistente (non vista separata)
- **Default sort:** `sortOrder ASC` (sostituisce `createdAt DESC`)
- **Coesistenza:** Click su header colonna disattiva DnD e ordina per colonna. Chip "Ordine manuale" ripristina DnD
- **Permessi:** Tutti vedono l'ordine manuale; solo admin/direzione possono drag & drop

## Database

Aggiungere campo al modello `Project`:

```prisma
sortOrder  Int  @default(0)
```

- Progetti nuovi: `sortOrder = MAX(sortOrder) + 1`
- Migrazione necessaria con backfill (assegna sortOrder sequenziale ai progetti esistenti per `createdAt ASC`)

## Backend API

### Nuovo endpoint

```
PATCH /api/projects/reorder
Auth: admin, direzione
Body: { items: [{ id: string, sortOrder: number }] }
Response: { success: true, data: null }
```

- Zod schema: `z.object({ items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int().min(0) })).min(1).max(100) })`
- Service: `prisma.$transaction()` con update batch
- Solo i progetti spostati vengono aggiornati

### Modifiche esistenti

- `projectQuerySchema.sortBy`: aggiungere `"sortOrder"`, cambiare default a `"sortOrder"`
- `projectQuerySchema.sortOrder`: cambiare default a `"asc"`
- `projectService.getProjects()`: gestire `sortBy === "sortOrder"` come orderBy Prisma diretto
- `projectService.createProject()`: calcolare `sortOrder = MAX + 1`

## Frontend

### Libreria

`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (~12kb gzipped)

### UX

```
┌─────────────────────────────────────────────────┐
│ Progetti                          [+ Nuovo]     │
│                                                  │
│ [Ordine manuale ✓]  [Filtri...]  [Cerca...]     │
│                                                  │
│ ┌─ ⠿ │ Nome progetto      │ Priorità │ Stato  │ │
│ ├─ ⠿ │ Progetto Alpha     │ Alta     │ Attivo │ │
│ ├─ ⠿ │ Progetto Beta      │ Media    │ Plan   │ │
│ ├─ ⠿ │ Progetto Gamma     │ Critica  │ Attivo │ │
│ └─ ⠿ │ Progetto Delta     │ Bassa    │ Compl  │ │
└─────────────────────────────────────────────────┘
```

- **Default:** `sortBy=sortOrder`, DnD attivo, handle `GripVertical` visibile (solo per privilegiati)
- **Click header colonna:** DnD disattivato, handle nascosti, chip "Ordine manuale" appare
- **On drop:** optimistic update + `PATCH /api/projects/reorder`
- **Dipendenti:** vedono l'ordine ma senza handle/drag
- **Paginazione:** drag opera nella pagina corrente

### Componenti modificati

| File | Modifica |
|------|----------|
| `DataTable.tsx` | Props opzionali `draggable`, `onReorder`, `dragHandle`. Wrap righe in `SortableContext` se `draggable=true` |
| `ProjectListPage.tsx` | Default sort `sortOrder`, logica DnD, chip "Ordine manuale", handle condizionale per ruolo |
| `useProjects.ts` | Nuova mutation `useReorderProjects()` |

### Nessun nuovo componente standalone

Il DnD è integrato nel DataTable come feature opzionale riutilizzabile.

## Permessi

| Azione | Admin | Direzione | Dipendente |
|--------|-------|-----------|------------|
| Vedere ordine manuale | ✅ | ✅ | ✅ |
| Drag & drop | ✅ | ✅ | ❌ |

## Scope escluso

- Drag tra pagine diverse (fuori scope, l'utente può aumentare il limit)
- Ordine personalizzato per utente (ordine unico condiviso)
- Drag & drop per altre entità (solo progetti per ora)
