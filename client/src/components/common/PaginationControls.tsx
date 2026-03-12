import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationControlsProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  totalItems,
}: PaginationControlsProps) {
  if (totalPages <= 1 && !totalItems) return null

  return (
    <div className="flex items-center justify-between pt-4">
      <div className="text-sm text-muted-foreground">
        {totalItems != null ? (
          <span>{totalItems} risultati</span>
        ) : (
          <span>
            Pagina {page} di {totalPages}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Precedente</span>
        </Button>
        <span className="text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Successiva</span>
        </Button>
      </div>
    </div>
  )
}
