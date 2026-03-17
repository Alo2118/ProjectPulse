import { useRef, useState } from "react"
import { Download, Upload, FileSpreadsheet, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DataTable, type Column } from "@/components/common/DataTable"
import {
  useExportTasks,
  useExportProjects,
  useExportTimeEntries,
} from "@/hooks/api/useExport"
import { usePreviewImport, useImportTasks } from "@/hooks/api/useImport"

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportExportTab() {
  const exportTasksMutation = useExportTasks()
  const exportProjectsMutation = useExportProjects()
  const exportTimeEntriesMutation = useExportTimeEntries()
  const previewMutation = usePreviewImport()
  const importMutation = useImportTasks()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<Record<string, string>[] | null>(null)
  const [previewColumns, setPreviewColumns] = useState<Column<Record<string, string>>[]>([])

  const handleExport = async (type: "tasks" | "projects" | "time-entries") => {
    try {
      let blob: Blob
      let filename: string
      switch (type) {
        case "tasks":
          blob = await exportTasksMutation.mutateAsync({})
          filename = "tasks.csv"
          break
        case "projects":
          blob = await exportProjectsMutation.mutateAsync({})
          filename = "projects.csv"
          break
        case "time-entries":
          blob = await exportTimeEntriesMutation.mutateAsync({})
          filename = "time-entries.csv"
          break
      }
      downloadBlob(blob, filename)
      toast.success("Esportazione completata")
    } catch {
      toast.error("Errore nell'esportazione")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewData(null)
    }
  }

  const handlePreview = async () => {
    if (!selectedFile) return
    try {
      const result = await previewMutation.mutateAsync(selectedFile)
      const rows: Record<string, string>[] = result.rows ?? []
      if (rows.length > 0) {
        const keys = Object.keys(rows[0])
        setPreviewColumns(
          keys.map((key) => ({
            key,
            header: key,
            cell: (item: Record<string, string>) => (
              <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                {item[key] ?? ""}
              </span>
            ),
          })),
        )
        setPreviewData(rows.slice(0, 5))
      } else {
        setPreviewData([])
      }
    } catch {
      toast.error("Errore nell'anteprima del file")
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return
    try {
      const result = await importMutation.mutateAsync({ fileName: selectedFile.name })
      toast.success(`Importazione completata: ${result.imported ?? 0} righe importate`)
      setSelectedFile(null)
      setPreviewData(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch {
      toast.error("Errore nell'importazione")
    }
  }

  const isExporting =
    exportTasksMutation.isPending ||
    exportProjectsMutation.isPending ||
    exportTimeEntriesMutation.isPending

  return (
    <div className="space-y-6">
      {/* Export section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Esportazione</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Task</CardTitle>
              <CardDescription className="text-xs">
                Esporta tutti i task in formato CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleExport("tasks")}
                disabled={isExporting}
              >
                {exportTasksMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Esporta Task
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Progetti</CardTitle>
              <CardDescription className="text-xs">
                Esporta tutti i progetti in formato CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleExport("projects")}
                disabled={isExporting}
              >
                {exportProjectsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Esporta Progetti
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Time Entries</CardTitle>
              <CardDescription className="text-xs">
                Esporta le registrazioni tempo in CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleExport("time-entries")}
                disabled={isExporting}
              >
                {exportTimeEntriesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Esporta Time Entries
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Import section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Importazione</h2>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                Seleziona file CSV
              </Button>
              {selectedFile && (
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{selectedFile.name}</span>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={previewMutation.isPending}
                >
                  {previewMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : null}
                  Anteprima
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Importa
                </Button>
              </div>
            )}

            {previewData && previewData.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Anteprima (prime 5 righe):
                </p>
                <div className="rounded-md border overflow-x-auto">
                  <DataTable
                    columns={previewColumns}
                    data={previewData}
                    getId={(item) => (item as Record<string, unknown>).id as string ?? JSON.stringify(item)}
                  />
                </div>
              </div>
            )}

            {previewData && previewData.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Il file non contiene dati.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
