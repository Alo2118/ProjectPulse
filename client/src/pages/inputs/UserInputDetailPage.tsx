import { useParams, useNavigate, Link } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import {
  Pencil,
  MoreHorizontal,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Tag,
  AlertTriangle,
  User,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { EntityDetail } from "@/components/common/EntityDetail"
import { StatusBadge } from "@/components/common/StatusBadge"
import { MetaRow } from "@/components/common/MetaRow"
import { INPUT_STATUS_LABELS, TASK_PRIORITY_LABELS, INPUT_CATEGORY_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import {
  useInputQuery,
  useDeleteInput,
  useProcessInput,
  useAcknowledgeInput,
  useRejectInput,
} from "@/hooks/api/useInputs"
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
import { userInputWorkflow } from "@/lib/workflows/userInputWorkflow"
import type { ValidationData } from "@/lib/workflow-engine"

function UserInputDetailPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'input', entityId: id })
  const navigate = useNavigate()

  const { data: input, isLoading, error } = useInputQuery(id ?? "")
  const deleteMutation = useDeleteInput()
  const processMutation = useProcessInput()
  const acknowledgeMutation = useAcknowledgeInput()
  const rejectMutation = useRejectInput()

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Segnalazione eliminata")
      navigate("/inputs")
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const handleProcess = async () => {
    if (!id) return
    try {
      await processMutation.mutateAsync(id)
      toast.success("Segnalazione presa in carico")
    } catch {
      toast.error("Errore nel processamento")
    }
  }

  const handleAcknowledge = async () => {
    if (!id) return
    try {
      await acknowledgeMutation.mutateAsync(id)
      toast.success("Segnalazione accettata")
    } catch {
      toast.error("Errore nell'accettazione")
    }
  }

  const handleReject = async () => {
    if (!id) return
    try {
      await rejectMutation.mutateAsync({ id, reason: "Rifiutata" })
      toast.success("Segnalazione rifiutata")
    } catch {
      toast.error("Errore nel rifiuto")
    }
  }

  const isPending = input?.status === "pending"
  const isProcessing = input?.status === "processing"

  const handleWorkflowAdvance = async (nextPhase: string) => {
    if (!id) return
    try {
      if (nextPhase === "processing") {
        await processMutation.mutateAsync(id)
        toast.success("Segnalazione presa in carico")
      } else if (nextPhase === "resolved") {
        await acknowledgeMutation.mutateAsync(id)
        toast.success("Segnalazione risolta")
      }
    } catch {
      toast.error("Errore nell'aggiornamento dello stato")
    }
  }

  const isWorkflowAdvancing =
    processMutation.isPending || acknowledgeMutation.isPending

  return (
    <EntityDetail
      isLoading={isLoading}
      error={error as Error | null}
      notFound={!isLoading && !error && !input}
      breadcrumbs={[
        { label: "Segnalazioni", href: "/inputs" },
        { label: input?.code ?? "..." },
      ]}
      title={input?.title}
      badges={
        input ? (
          <>
            <StatusBadge status={input.status} labels={INPUT_STATUS_LABELS} />
            <StatusBadge status={input.category} labels={INPUT_CATEGORY_LABELS} />
            <StatusBadge status={input.priority} labels={TASK_PRIORITY_LABELS} />
          </>
        ) : undefined
      }
      beforeContent={
        input && input.status !== "resolved" ? (
          <WorkflowStepper
            workflow={userInputWorkflow}
            currentPhase={input.status}
            validationData={
              {
                hasDescription: !!(input.description && input.description.trim().length > 0),
              } satisfies ValidationData
            }
            onAdvance={handleWorkflowAdvance}
            canAdvancePhase={!isWorkflowAdvancing}
          />
        ) : undefined
      }
      headerActions={
        input ? (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/inputs/${id}/edit`}>
                <Pencil className="h-4 w-4 mr-1" />
                Modifica
              </Link>
            </Button>
            {(isPending || isProcessing) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isPending && (
                    <DropdownMenuItem onClick={handleProcess}>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Prendi in carico
                    </DropdownMenuItem>
                  )}
                  {(isPending || isProcessing) && (
                    <DropdownMenuItem onClick={handleAcknowledge}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Accetta
                    </DropdownMenuItem>
                  )}
                  {(isPending || isProcessing) && (
                    <DropdownMenuItem onClick={handleReject} className="text-destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      Rifiuta
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        ) : undefined
      }
      tabs={
        input
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
                          {input.description || "Nessuna descrizione fornita."}
                        </p>
                      </div>

                      {input.status === "resolved" && input.resolutionType && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Risoluzione
                            </h3>
                            <p className="text-sm text-foreground capitalize">
                              {input.resolutionType}
                            </p>
                          </div>
                        </>
                      )}

                      {input.convertedTaskId && (
                        <>
                          <Separator />
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Convertita in task:
                            </span>
                            <Link
                              to={`/tasks/${input.convertedTaskId}`}
                              className="text-sm text-primary hover:underline"
                            >
                              Vai al task
                            </Link>
                          </div>
                        </>
                      )}

                      {input.convertedProjectId && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Convertita in progetto:
                          </span>
                          <Link
                            to={`/projects/${input.convertedProjectId}`}
                            className="text-sm text-primary hover:underline"
                          >
                            Vai al progetto
                          </Link>
                        </div>
                      )}
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
            ]
          : undefined
      }
      sidebar={
        input ? (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground mb-3">Informazioni</h3>
            <MetaRow icon={Tag} label="Stato">
              <StatusBadge status={input.status} labels={INPUT_STATUS_LABELS} />
            </MetaRow>
            <MetaRow icon={Tag} label="Categoria">
              <StatusBadge status={input.category} labels={INPUT_CATEGORY_LABELS} />
            </MetaRow>
            <MetaRow icon={AlertTriangle} label="Priorita'">
              <StatusBadge status={input.priority} labels={TASK_PRIORITY_LABELS} />
            </MetaRow>
            <MetaRow icon={User} label="Segnalato da">
              {input.createdBy
                ? `${input.createdBy.firstName} ${input.createdBy.lastName}`
                : "-"}
            </MetaRow>
            <MetaRow icon={Calendar} label="Data">
              {formatDate(input.createdAt)}
            </MetaRow>
          </div>
        ) : undefined
      }
      onDelete={handleDelete}
      isDeleting={deleteMutation.isPending}
      deleteConfirmMessage="Sei sicuro di voler eliminare questa segnalazione? Questa azione non puo' essere annullata."
    />
  )
}

export default UserInputDetailPage
