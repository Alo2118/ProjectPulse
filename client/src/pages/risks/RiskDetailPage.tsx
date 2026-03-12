import { useParams, useNavigate, Link } from "react-router-dom"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import {
  Pencil,
  Calendar,
  Tag,
  AlertTriangle,
  User,
  FolderOpen,
  Activity,
} from "lucide-react"
import { toast } from "sonner"
import { EntityDetail } from "@/components/common/EntityDetail"
import { StatusBadge } from "@/components/common/StatusBadge"
import { MetaRow } from "@/components/common/MetaRow"
import { RISK_STATUS_LABELS, RISK_CATEGORY_LABELS, RISK_SCALE_LABELS, RISK_LEVEL_LABELS, getRiskLevel } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import { useRiskQuery, useDeleteRisk } from "@/hooks/api/useRisks"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

function getRiskScoreLabel(probability: number, impact: number): string {
  const score = probability * impact
  return RISK_LEVEL_LABELS[getRiskLevel(score)] ?? "Basso"
}

function RiskDetailPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'risk', entityId: id })
  const navigate = useNavigate()

  const { data: risk, isLoading, error } = useRiskQuery(id ?? "")
  const deleteMutation = useDeleteRisk()

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Rischio eliminato")
      navigate("/risks")
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const riskScore = risk
    ? getRiskScoreLabel(risk.probability, risk.impact)
    : ""

  return (
    <EntityDetail
      isLoading={isLoading}
      error={error as Error | null}
      notFound={!isLoading && !error && !risk}
      breadcrumbs={[
        { label: "Rischi", href: "/risks" },
        { label: risk?.code ?? "..." },
      ]}
      title={risk?.title}
      badges={
        risk ? (
          <>
            <StatusBadge status={risk.status} labels={RISK_STATUS_LABELS} />
            <StatusBadge status={String(risk.probability)} labels={Object.fromEntries(Object.entries(RISK_SCALE_LABELS).map(([k,v]) => [k, `P: ${v}`]))} />
            <StatusBadge status={String(risk.impact)} labels={Object.fromEntries(Object.entries(RISK_SCALE_LABELS).map(([k,v]) => [k, `I: ${v}`]))} />
          </>
        ) : undefined
      }
      headerActions={
        risk ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/risks/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-1" />
              Modifica
            </Link>
          </Button>
        ) : undefined
      }
      tabs={
        risk
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
                          {risk.description || "Nessuna descrizione fornita."}
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          Punteggio rischio
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-foreground">
                            {risk.probability * risk.impact}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({riskScore})
                          </span>
                        </div>
                      </div>

                      {risk.mitigationPlan && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Piano di mitigazione
                            </h3>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {risk.mitigationPlan}
                            </p>
                          </div>
                        </>
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
        risk ? (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground mb-3">Informazioni</h3>
            <MetaRow icon={Tag} label="Stato">
              <StatusBadge status={risk.status} labels={RISK_STATUS_LABELS} />
            </MetaRow>
            <MetaRow icon={Tag} label="Categoria">
              {RISK_CATEGORY_LABELS[risk.category] ?? risk.category}
            </MetaRow>
            <MetaRow icon={AlertTriangle} label="Probabilita'">
              <span className="text-sm font-medium">{RISK_SCALE_LABELS[risk.probability] ?? risk.probability} ({risk.probability}/5)</span>
            </MetaRow>
            <MetaRow icon={Activity} label="Impatto">
              <span className="text-sm font-medium">{RISK_SCALE_LABELS[risk.impact] ?? risk.impact} ({risk.impact}/5)</span>
            </MetaRow>
            <MetaRow icon={FolderOpen} label="Progetto">
              {risk.project ? (
                <Link
                  to={`/projects/${risk.project.id}`}
                  className="text-primary hover:underline"
                >
                  {risk.project.name}
                </Link>
              ) : (
                "-"
              )}
            </MetaRow>
            <MetaRow icon={User} label="Responsabile">
              {risk.owner
                ? `${risk.owner.firstName} ${risk.owner.lastName}`
                : "-"}
            </MetaRow>
            <MetaRow icon={Calendar} label="Data">
              {formatDate(risk.createdAt)}
            </MetaRow>
          </div>
        ) : undefined
      }
      onDelete={handleDelete}
      isDeleting={deleteMutation.isPending}
      deleteConfirmMessage="Sei sicuro di voler eliminare questo rischio? Questa azione non puo' essere annullata."
    />
  )
}

export default RiskDetailPage
