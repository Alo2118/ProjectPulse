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
} from "lucide-react"
import { toast } from "sonner"
import { EntityDetail } from "@/components/common/EntityDetail"
import { StatusBadge } from "@/components/common/StatusBadge"
import { MetaRow } from "@/components/common/MetaRow"
import { DOCUMENT_STATUS_LABELS, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_TRANSITIONS } from "@/lib/constants"
import { cn, formatDate, formatFileSize, formatRelative, getUserInitials, getAvatarColor } from "@/lib/utils"
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
import { useActivityQuery } from "@/hooks/api/useActivity"
import { useRelatedQuery } from "@/hooks/api/useRelated"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'document', entityId: id })
  const navigate = useNavigate()

  const { data: doc, isLoading, error } = useDocumentQuery(id ?? "")
  const deleteMutation = useDeleteDocument()
  const statusMutation = useChangeDocumentStatus()
  const { isPrivileged: canApprove } = usePrivilegedRole()
  const { data: docActivity } = useActivityQuery('document', id ?? '')
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

  return (
    <EntityDetail
      isLoading={isLoading}
      error={error as Error | null}
      notFound={!isLoading && !error && !doc}
      breadcrumbs={[
        { label: "Documenti", href: "/documents" },
        { label: doc?.code ?? "..." },
      ]}
      title={doc?.title}
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
                          Versione corrente: v{doc.version}
                        </p>
                        {relatedData?.versions && Array.isArray(relatedData.versions) && relatedData.versions.length > 0 ? (
                          <div className="space-y-1.5">
                            {(relatedData.versions as Array<{ id: string; version: number; createdAt: string; status?: string }>).map((v) => (
                              <div key={v.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">v{v.version}</Badge>
                                  {v.status && (
                                    <StatusBadge status={v.status} labels={DOCUMENT_STATUS_LABELS} />
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground">{formatDate(v.createdAt)}</span>
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
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground">
                        Nessuna nota disponibile.
                      </p>
                    </CardContent>
                  </Card>
                ),
              },
              {
                key: "activity",
                label: "Attivita'",
                count: docActivity?.length,
                content: (
                  <Card>
                    <CardContent className="p-5">
                      {!docActivity || docActivity.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Nessuna attivita' registrata
                        </p>
                      ) : (
                        <div className="divide-y divide-border">
                          {docActivity.map((item) => {
                            const a = item as { id: string; action: string; createdAt: string; user: { firstName: string; lastName: string } }
                            const name = `${a.user.firstName} ${a.user.lastName}`
                            return (
                              <div key={a.id} className="flex items-start gap-3 py-2.5">
                                <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                                  <AvatarFallback
                                    className={cn("text-[9px] text-white", getAvatarColor(name))}
                                  >
                                    {getUserInitials(a.user.firstName, a.user.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-foreground leading-snug">
                                    <span className="font-medium">{name} </span>
                                    <span className="text-muted-foreground">{a.action}</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {formatRelative(a.createdAt)}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
              v{doc.version}
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
