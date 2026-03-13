import { useMemo } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  Pencil,
  Download,
  MoreHorizontal,
  Calendar,
  Tag,
  FileText,
  FolderOpen,
  HardDrive,
  Hash,
  Clock,
  GitCommitVertical,
} from "lucide-react"
import { toast } from "sonner"
import { EntityDetail } from "@/components/common/EntityDetail"
import { StatusBadge } from "@/components/common/StatusBadge"
import { MetaRow } from "@/components/common/MetaRow"
import { TagEditor } from "@/components/common/TagEditor"
import { NoteTab } from "@/components/common/NoteTab"
import { ActivityTab } from "@/components/common/ActivityTab"
import { KpiStrip, type KpiCard } from "@/components/common/KpiStrip"
import { DOCUMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_TRANSITIONS } from "@/lib/constants"
import { formatDate, formatFileSize } from "@/lib/utils"
import {
  useDocumentQuery,
  useDeleteDocument,
  useChangeDocumentStatus,
} from "@/hooks/api/useDocuments"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { WorkflowStepper } from "@/components/common/WorkflowStepper"
import { documentWorkflow } from "@/lib/workflows/documentWorkflow"
import type { ValidationData } from "@/lib/workflow-engine"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { useRelatedQuery } from "@/hooks/api/useRelated"
import { Badge } from "@/components/ui/badge"

function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'document', entityId: id })
  const navigate = useNavigate()

  const { data: doc, isLoading, error } = useDocumentQuery(id ?? "")
  const deleteMutation = useDeleteDocument()
  const statusMutation = useChangeDocumentStatus()
  const { isPrivileged: canApprove } = usePrivilegedRole()
  const { data: relatedData } = useRelatedQuery('document', id ?? '', ['versions', 'tasks'])

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Documento eliminato")
      navigate("/documents")
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!id) return
    try {
      await statusMutation.mutateAsync({ id, status })
      toast.success("Stato aggiornato")
    } catch {
      toast.error("Errore nell'aggiornamento dello stato")
    }
  }

  const handleDownload = async () => {
    if (!id || !doc?.fileName) return
    try {
      const response = await api.get(`/documents/${id}/download`, {
        responseType: "blob",
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.download = doc.fileName
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error("Errore nel download del file")
    }
  }

  const transitions = doc ? DOCUMENT_STATUS_TRANSITIONS[doc.status] ?? [] : []

  // KPI row (computed inline)
  const kpiCards = useMemo<KpiCard[]>(() => {
    if (!doc) return []
    const daysInStatus = Math.floor(
      (Date.now() - new Date(doc.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    return [
      {
        label: "Stato workflow",
        value: DOCUMENT_STATUS_LABELS[doc.status] ?? doc.status,
        color: doc.status === "approved" ? "success" : doc.status === "review" ? "warning" : "project",
        icon: FileText,
      },
      {
        label: "Versione",
        value: `v${doc.version}`,
        color: "indigo",
        icon: GitCommitVertical,
      },
      {
        label: "Giorni in stato corrente",
        value: String(daysInStatus),
        subtitle: `dal ${formatDate(doc.updatedAt)}`,
        color: daysInStatus > 14 ? "warning" : "task",
        icon: Clock,
      },
      {
        label: "Progetto",
        value: doc.project?.name ?? "—",
        color: "project",
        icon: FolderOpen,
      },
    ]
  }, [doc])

  return (
    <EntityDetail
      isLoading={isLoading}
      error={error as Error | null}
      notFound={!isLoading && !error && !doc}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Documenti", href: "/documents" },
        { label: doc?.title ?? "..." },
      ]}
      title={doc?.title}
      subtitle={doc?.code}
      colorBar="linear-gradient(180deg, hsl(271, 91%, 65%), hsl(250, 60%, 50%))"
      tagEditor={id ? <TagEditor entityType="document" entityId={id} className="mt-1" /> : undefined}
      kpiRow={kpiCards.length > 0 ? <KpiStrip cards={kpiCards} /> : undefined}
      badges={
        doc ? (
          <>
            <StatusBadge status={doc.status} labels={DOCUMENT_STATUS_LABELS} />
            <StatusBadge status={doc.type} labels={DOCUMENT_TYPE_LABELS} />
          </>
        ) : undefined
      }
      beforeContent={
        doc ? (
          <WorkflowStepper
            workflow={documentWorkflow}
            currentPhase={doc.status === "obsolete" ? "approved" : doc.status}
            validationData={
              {
                attachmentCount: doc.fileName ? 1 : 0,
                hasApprover: canApprove,
              } satisfies ValidationData
            }
            onAdvance={(nextPhase) => handleStatusChange(nextPhase)}
            canAdvancePhase={!statusMutation.isPending && canApprove}
          />
        ) : undefined
      }
      headerActions={
        doc ? (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/documents/${id}/edit`}>
                <Pencil className="h-4 w-4 mr-1" />
                Modifica
              </Link>
            </Button>
            {doc.fileName && (
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Scarica
              </Button>
            )}
            {transitions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {transitions.map((t) => (
                    <DropdownMenuItem
                      key={t.value}
                      onClick={() => handleStatusChange(t.value)}
                    >
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        ) : undefined
      }
      tabs={
        doc
          ? [
              {
                key: "dettagli",
                label: "Dettagli",
                content: (
                  <Card>
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          Descrizione
                        </h3>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {doc.description || "Nessuna descrizione fornita."}
                        </p>
                      </div>

                      {doc.fileName && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              File allegato
                            </h3>
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {doc.fileName}
                                </p>
                                {doc.fileSize && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(doc.fileSize)}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDownload}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          Storico versioni
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Versione corrente: <span className="text-data font-semibold text-foreground">v{doc.version}</span>
                        </p>
                        {relatedData?.versions && Array.isArray(relatedData.versions) && relatedData.versions.length > 0 ? (
                          <div className="space-y-1.5">
                            {(relatedData.versions as Array<{ id: string; version: number; createdAt: string; status?: string }>).map((v) => (
                              <div key={v.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 row-accent group">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-data text-[10px]">v{v.version}</Badge>
                                  {v.status && (
                                    <StatusBadge status={v.status} labels={DOCUMENT_STATUS_LABELS} />
                                  )}
                                </div>
                                <span className="text-data text-[10px] text-muted-foreground tabular-nums">{formatDate(v.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Nessuna versione precedente</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ),
              },
              {
                key: "note",
                label: "Note",
                content: (
                  <div className="mt-4">
                    <NoteTab entityType="document" entityId={id!} />
                  </div>
                ),
              },
              {
                key: "activity",
                label: "Attività",
                content: (
                  <div className="mt-4">
                    <ActivityTab entityType="document" entityId={id!} />
                  </div>
                ),
              },
            ]
          : undefined
      }
      sidebar={
        doc ? (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground mb-3">Informazioni</h3>
            <MetaRow icon={Tag} label="Stato">
              <StatusBadge status={doc.status} labels={DOCUMENT_STATUS_LABELS} />
            </MetaRow>
            <MetaRow icon={FileText} label="Tipo">
              {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
            </MetaRow>
            <MetaRow icon={Hash} label="Versione">
              <span className="text-data font-semibold">v{doc.version}</span>
            </MetaRow>
            <MetaRow icon={FolderOpen} label="Progetto">
              {doc.project ? (
                <Link
                  to={`/projects/${doc.project.id}`}
                  className="text-primary hover:underline"
                >
                  {doc.project.name}
                </Link>
              ) : (
                "-"
              )}
            </MetaRow>
            {doc.fileName && (
              <MetaRow icon={HardDrive} label="File">
                <div className="text-right">
                  <p className="text-xs">{doc.fileName}</p>
                  {doc.fileSize && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.fileSize)}
                    </p>
                  )}
                </div>
              </MetaRow>
            )}
            <MetaRow icon={Calendar} label="Data">
              {formatDate(doc.createdAt)}
            </MetaRow>
            {/* Related tasks */}
            {relatedData?.tasks && Array.isArray(relatedData.tasks) && relatedData.tasks.length > 0 && (
              <>
                <Separator className="my-3" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Task correlati
                </p>
                <div className="space-y-1.5">
                  {(relatedData.tasks as Array<{ id: string; title: string }>).slice(0, 5).map((t) => (
                    <Link
                      key={t.id}
                      to={`/tasks/${t.id}`}
                      className="flex items-center gap-2 text-xs hover:text-primary transition-colors"
                    >
                      <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                      <span className="truncate">{t.title}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : undefined
      }
      onDelete={handleDelete}
      isDeleting={deleteMutation.isPending}
      deleteConfirmMessage="Sei sicuro di voler eliminare questo documento? Questa azione non puo' essere annullata."
    />
  )
}

export default DocumentDetailPage
