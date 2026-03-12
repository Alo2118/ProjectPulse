import { useCallback } from "react"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useExportTasks,
  useExportProjects,
  useExportTimeEntries,
} from "@/hooks/api/useExport"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function buildFilenameForEntity(entityType: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${entityType}-${date}.csv`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SupportedEntityType = "tasks" | "projects" | "time-entries"

interface ExportButtonProps {
  entityType: SupportedEntityType | string
  filters?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExportButton({ entityType, filters }: ExportButtonProps) {
  const exportTasks = useExportTasks()
  const exportProjects = useExportProjects()
  const exportTimeEntries = useExportTimeEntries()

  const isBusy =
    exportTasks.isPending ||
    exportProjects.isPending ||
    exportTimeEntries.isPending

  // Stringify filter values for the query-string params expected by the API.
  const buildParams = useCallback((): Record<string, string> => {
    if (!filters) return {}
    const result: Record<string, string> = {}
    for (const [key, val] of Object.entries(filters)) {
      if (val !== null && val !== undefined && val !== "") {
        result[key] = String(val)
      }
    }
    return result
  }, [filters])

  const handleCsvExport = useCallback(() => {
    const params = buildParams()
    const filename = buildFilenameForEntity(entityType)

    const onSuccess = (data: Blob) => {
      triggerBlobDownload(data, filename)
    }

    switch (entityType as SupportedEntityType) {
      case "projects":
        exportProjects.mutate(params, { onSuccess })
        break
      case "time-entries":
        exportTimeEntries.mutate(params, { onSuccess })
        break
      default:
        // tasks and any unknown entity type fall back to tasks endpoint
        exportTasks.mutate(params, { onSuccess })
        break
    }
  }, [entityType, buildParams, exportTasks, exportProjects, exportTimeEntries])

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            disabled={isBusy}
            aria-label="Esporta dati"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Esporta
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={handleCsvExport}
            disabled={isBusy}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            Esporta CSV
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <Tooltip>
            <TooltipTrigger asChild>
              {/* Wrapper span required: Tooltip needs a focusable child but
                  the DropdownMenuItem is disabled */}
              <span className="block">
                <DropdownMenuItem
                  disabled
                  className="gap-2 opacity-50"
                  onSelect={(e) => e.preventDefault()}
                  aria-disabled="true"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Esporta PDF
                </DropdownMenuItem>
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Prossimamente</p>
            </TooltipContent>
          </Tooltip>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
