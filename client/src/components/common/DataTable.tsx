import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useThemeStore } from "@/stores/themeStore"

export interface Column<T> {
  key: string
  header: string
  cell: (item: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

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
  // Row customization
  rowClassName?: (item: T) => string | undefined
  // Keyboard navigation
  focusedIndex?: number
}

function SortIcon({ column, sortBy, sortOrder }: { column: string; sortBy?: string; sortOrder?: "asc" | "desc" }) {
  if (sortBy !== column) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />
  if (sortOrder === "asc") return <ArrowUp className="ml-1 h-3.5 w-3.5" />
  return <ArrowDown className="ml-1 h-3.5 w-3.5" />
}

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
  extraClassName,
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
  extraClassName?: string
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
        onRowClick && "cursor-pointer group",
        "transition-colors row-accent",
        isDragging && "z-50 bg-accent/30",
        theme === "tech-hud" &&
          "hover:bg-primary/5 hover:shadow-[inset_0_0_12px_hsl(var(--primary)/0.06)]",
        theme === "asana-like" && "hover:bg-accent/50",
        extraClassName
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
      {onRowClick && (
        <TableCell className="w-8 px-2">
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
        </TableCell>
      )}
    </TableRow>
  )
}

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
  rowClassName,
  focusedIndex,
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
            <TableHead key={col.key} className={cn('text-table-header', col.className)}>
              {col.sortable && onSort ? (
                <button
                  type="button"
                  className="inline-flex items-center hover:text-foreground transition-colors -ml-2 px-2 py-1 rounded-md text-table-header"
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
          {onRowClick && <TableHead className="w-8 px-2" />}
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
                {onRowClick && <TableCell className="w-8 px-2" />}
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
                      extraClassName={rowClassName?.(item)}
                    />
                  )
                })}
              </SortableContext>
            )
            : data.map((item, idx) => {
                const id = getId ? getId(item) : String(idx)
                const isSelected = selectedIds?.has(id) ?? false
                const isFocused = focusedIndex === idx
                const useStagger = data.length <= 20
                const RowComp = useStagger ? motion.tr : 'tr'
                const motionProps = useStagger ? {
                  initial: { opacity: 0, x: -4 } as const,
                  animate: { opacity: 1, x: 0 } as const,
                  transition: { delay: idx * 0.03, duration: 0.15 },
                } : undefined
                return (
                  <RowComp
                    key={id}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(
                      onRowClick && "cursor-pointer group",
                      "transition-colors hover:border-primary/20 row-accent",
                      theme === "tech-hud" && "hover:bg-primary/5 hover:shadow-[inset_0_0_12px_hsl(var(--primary)/0.06)]",
                      theme === "asana-like" && "hover:bg-accent/50",
                      isFocused && "ring-2 ring-primary ring-inset bg-primary/5",
                      rowClassName?.(item)
                    )}
                    onClick={() => onRowClick?.(item)}
                    {...(motionProps ?? {})}
                  >
                    {hasSelection && (
                      <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
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
                    {onRowClick && (
                      <TableCell className="w-8 px-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                      </TableCell>
                    )}
                  </RowComp>
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
