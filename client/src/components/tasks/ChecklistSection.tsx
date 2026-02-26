/**
 * ChecklistSection - Inline checklist management within a task detail page
 * Features: add, toggle, inline-edit, delete, reorder (drag-and-drop + up/down fallback)
 * Uses local React state — no Zustand store needed (data is scoped to one task).
 * @module components/tasks/ChecklistSection
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Check,
  GripVertical,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import api from '@services/api'
import { toast } from '@stores/toastStore'
import { ChecklistItem } from '@/types'

interface ChecklistSectionProps {
  taskId: string
  readOnly?: boolean
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface ItemRowProps {
  item: ChecklistItem
  isFirst: boolean
  isLast: boolean
  readOnly: boolean
  onToggle: (id: string) => void
  onEdit: (id: string, newTitle: string) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
}

function ItemRow({
  item,
  isFirst,
  isLast,
  readOnly,
  onToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const handleStartEdit = () => {
    if (readOnly) return
    setEditValue(item.title)
    setEditing(true)
  }

  const handleCommitEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== item.title) {
      onEdit(item.id, trimmed)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCommitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 py-1.5 group flex-1 min-w-0">
      {/* Checkbox */}
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onToggle(item.id)}
        aria-label={item.isChecked ? 'Segna come non completato' : 'Segna come completato'}
        className={`
          flex-shrink-0 w-4 h-4 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
          ${item.isChecked
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-green-400'
          }
          ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
        `}
      >
        {item.isChecked && <Check className="w-3 h-3 m-auto" strokeWidth={3} />}
      </button>

      {/* Title — inline edit or text */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCommitEdit}
            onKeyDown={handleKeyDown}
            className="w-full text-sm bg-white dark:bg-gray-700 border border-blue-400 dark:border-blue-500 rounded px-2 py-0.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <span
            onClick={handleStartEdit}
            title={readOnly ? undefined : 'Clicca per modificare'}
            className={`
              block text-sm truncate
              ${item.isChecked
                ? 'line-through text-gray-400 dark:text-gray-500'
                : 'text-gray-800 dark:text-gray-200'
              }
              ${!readOnly ? 'cursor-text hover:text-blue-600 dark:hover:text-blue-400 transition-colors' : ''}
            `}
          >
            {item.title}
          </span>
        )}
      </div>

      {/* Action buttons — visible on row hover (accessibility fallback for reorder) */}
      {!readOnly && !editing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {/* Move up */}
          <button
            type="button"
            onClick={() => onMoveUp(item.id)}
            disabled={isFirst}
            aria-label="Sposta su"
            className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Move down */}
          <button
            type="button"
            onClick={() => onMoveDown(item.id)}
            disabled={isLast}
            aria-label="Sposta giu"
            className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={handleStartEdit}
            aria-label="Modifica elemento"
            className="p-0.5 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label="Elimina elemento"
            className="p-0.5 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

/** Wrapper that adds drag-and-drop handle via useSortable */
function SortableItemRow({
  item,
  readOnly,
  ...props
}: ItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: readOnly,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      {/* Drag handle */}
      {!readOnly && (
        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Trascina per riordinare"
          className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 touch-none flex-shrink-0 p-0.5 transition-colors"
          tabIndex={-1}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <ItemRow item={item} readOnly={readOnly} {...props} />
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ChecklistSection({ taskId, readOnly = false }: ChecklistSectionProps) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  // ---- Fetch on mount ----
  useEffect(() => {
    let cancelled = false

    async function fetchItems() {
      setIsLoading(true)
      try {
        const res = await api.get<{ success: boolean; data: ChecklistItem[] }>(
          `/checklist/${taskId}`
        )
        if (!cancelled && res.data.success) {
          setItems(res.data.data)
        }
      } catch {
        if (!cancelled) toast.error('Impossibile caricare la checklist')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchItems()
    return () => { cancelled = true }
  }, [taskId])

  // ---- Derived stats ----
  const total = items.length
  const checked = items.filter((i) => i.isChecked).length
  const progressPct = total === 0 ? 0 : Math.round((checked / total) * 100)

  // ---- Toggle ----
  const handleToggle = useCallback(async (id: string) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isChecked: !item.isChecked } : item))
    )

    try {
      const res = await api.patch<{ success: boolean; data: ChecklistItem }>(
        `/checklist/${taskId}/${id}/toggle`
      )
      if (res.data.success) {
        // Sync with server response (updatedAt etc.)
        setItems((prev) =>
          prev.map((item) => (item.id === id ? res.data.data : item))
        )
      }
    } catch {
      // Revert optimistic update
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isChecked: !item.isChecked } : item))
      )
      toast.error('Impossibile aggiornare elemento')
    }
  }, [taskId])

  // ---- Inline edit ----
  const handleEdit = useCallback(async (id: string, newItemTitle: string) => {
    const previous = items.find((i) => i.id === id)
    // Optimistic
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newItemTitle } : item))
    )

    try {
      const res = await api.patch<{ success: boolean; data: ChecklistItem }>(
        `/checklist/${taskId}/${id}`,
        { title: newItemTitle }
      )
      if (res.data.success) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? res.data.data : item))
        )
      }
    } catch {
      // Revert
      if (previous) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? previous : item))
        )
      }
      toast.error('Impossibile modificare elemento')
    }
  }, [taskId, items])

  // ---- Delete ----
  const handleDelete = useCallback(async (id: string) => {
    const previous = items
    setItems((prev) => prev.filter((item) => item.id !== id))

    try {
      await api.delete(`/checklist/${taskId}/${id}`)
    } catch {
      setItems(previous)
      toast.error('Impossibile eliminare elemento')
    }
  }, [taskId, items])

  // ---- Add new item ----
  const handleAdd = useCallback(async () => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    setIsAdding(true)

    try {
      const res = await api.post<{ success: boolean; data: ChecklistItem }>(
        `/checklist/${taskId}`,
        { title: trimmed }
      )
      if (res.data.success) {
        setItems((prev) => [...prev, res.data.data])
        setNewTitle('')
        addInputRef.current?.focus()
      }
    } catch {
      toast.error('Impossibile aggiungere elemento')
    } finally {
      setIsAdding(false)
    }
  }, [taskId, newTitle])

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleAdd()
    if (e.key === 'Escape') setNewTitle('')
  }

  // ---- Reorder via drag-and-drop ----
  const handleReorder = useCallback(async (positions: { id: string; position: number }[]) => {
    try {
      await api.patch(`/checklist/${taskId}/reorder`, { items: positions })
    } catch {
      toast.error('Impossibile riordinare elementi')
    }
  }, [taskId])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newItems = arrayMove(items, oldIndex, newIndex)
    const withPositions = newItems.map((item, idx) => ({ ...item, position: idx }))
    setItems(withPositions)

    const positions = withPositions.map(({ id, position }) => ({ id, position }))
    void handleReorder(positions)
  }, [items, handleReorder])

  // ---- Reorder helpers (up/down keyboard fallback) ----
  const moveItem = useCallback(async (id: string, direction: 'up' | 'down') => {
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return

    // Build new order
    const reordered = [...items]
    const temp = reordered[idx]
    reordered[idx] = reordered[swapIdx]
    reordered[swapIdx] = temp

    // Assign consecutive positions
    const withPositions = reordered.map((item, i) => ({ ...item, position: i }))
    setItems(withPositions)

    try {
      const payload = withPositions.map(({ id: itemId, position }) => ({
        id: itemId,
        position,
      }))
      await api.patch(`/checklist/${taskId}/reorder`, { items: payload })
    } catch {
      // Revert
      setItems(items)
      toast.error('Impossibile riordinare elementi')
    }
  }, [taskId, items])

  const handleMoveUp = useCallback((id: string) => void moveItem(id, 'up'), [moveItem])
  const handleMoveDown = useCallback((id: string) => void moveItem(id, 'down'), [moveItem])

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          Checklist
          {total > 0 && (
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
              {checked}/{total} completati
            </span>
          )}
        </h2>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Items list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
          Nessun elemento nella checklist
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50 -mx-1 px-1">
              {items.map((item, idx) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  isFirst={idx === 0}
                  isLast={idx === items.length - 1}
                  readOnly={readOnly}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add new item */}
      {!readOnly && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-shrink-0 w-4 h-4 rounded border border-dashed border-gray-300 dark:border-gray-600" />
          <div className="flex-1 flex items-center gap-1 min-w-0">
            <input
              ref={addInputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="Aggiungi elemento..."
              disabled={isAdding}
              className="flex-1 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 min-w-0"
            />
            {newTitle.trim() && (
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={isAdding}
                aria-label="Aggiungi elemento checklist"
                className="flex-shrink-0 p-0.5 rounded text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 transition-colors"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
