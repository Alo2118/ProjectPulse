import { useMemo } from "react"
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
  Clock,
  Shield,
} from "lucide-react"
import { toast } from "sonner"
import { EntityDetail } from "@/components/common/EntityDetail"
import { StatusBadge } from "@/components/common/StatusBadge"
import { MetaRow } from "@/components/common/MetaRow"
import { TagEditor } from "@/components/common/TagEditor"
import { NoteTab } from "@/components/common/NoteTab"
import { ActivityTab } from "@/components/common/ActivityTab"
import { KpiStrip, type KpiCard } from "@/components/common/KpiStrip"
import { RISK_STATUS_LABELS, RISK_CATEGORY_LABELS, RISK_SCALE_LABELS, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, getRiskLevel } from "@/lib/constants"
import { formatDate, toError } from "@/lib/utils"
import { useRiskQuery, useDeleteRisk } from "@/hooks/api/useRisks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

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

  // KPI row (computed inline)
  const kpiCards = useMemo<KpiCard[]>(() => {
    if (!risk) return []
    const score = risk.probability * risk.impact
    const level = getRiskLevel(score)
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(risk.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    return [
      {
        label: "Punteggio P×I",
        value: String(score),
        subtitle: RISK_LEVEL_LABELS[level],
        color: level === "critical" || level === "high" ? "danger" : level === "medium" ? "warning" : "success",
        icon: Shield,
      },
      {
        label: "Probabilità",
        value: RISK_SCALE_LABELS[risk.probability] ?? String(risk.probability),
        subtitle: `${risk.probability}/5`,
        color: "warning",
        icon: AlertTriangle,
      },
      {
        label: "Impatto",
        value: RISK_SCALE_LABELS[risk.impact] ?? String(risk.impact),
        subtitle: `${risk.impact}/5`,
        color: "danger",
        icon: Activity,
      },
      {
        label: "Giorni dalla creazione",
        value: String(daysSinceCreated),
        subtitle: formatDate(risk.createdAt),
        color: "indigo",
        icon: Clock,
      },
    ]
  }, [risk])

  return (
    <EntityDetail
      isLoading={isLoading}
      error={toError(error)}
      notFound={!isLoading && !error && !risk}
      breadcrumbs={[
        { label: "Home", href: "/" },
        ...(risk?.project
          ? [
              { label: "Progetti", href: "/projects" },
              { label: risk.project.name, href: `/projects/${risk.project.id}` },
            ]
          : []),
        { label: "Rischi", href: "/risks" },
        { label: risk?.title ?? "..." },
      ]}
      title={risk?.title}
      subtitle={risk?.code}
      colorBar="linear-gradient(180deg, hsl(0, 72%, 51%), hsl(25, 95%, 53%))"
      tagEditor={id ? <TagEditor entityType="risk" entityId={id} className="mt-1" /> : undefined}
      kpiRow={kpiCards.length > 0 ? <KpiStrip cards={kpiCards} /> : undefined}
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
                          <span className="text-kpi-value text-foreground">
                            {risk.probability * risk.impact}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", RISK_LEVEL_COLORS[getRiskLevel(risk.probability * risk.impact)])}
                          >
                            {riskScore}
                          </Badge>
                          <span className="text-xs text-data text-muted-foreground">
                            (P:{risk.probability} × I:{risk.impact})
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
                  <div className="mt-4">
                    <NoteTab entityType="risk" entityId={id!} />
                  </div>
                ),
              },
              {
                key: "activity",
                label: "Attività",
                content: (
                  <div className="mt-4">
                    <ActivityTab entityType="risk" entityId={id!} />
                  </div>
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
              <span className="text-sm font-medium">{RISK_SCALE_LABELS[risk.probability] ?? risk.probability} <span className="text-data text-xs text-muted-foreground">({risk.probability}/5)</span></span>
            </MetaRow>
            <MetaRow icon={Activity} label="Impatto">
              <span className="text-sm font-medium">{RISK_SCALE_LABELS[risk.impact] ?? risk.impact} <span className="text-data text-xs text-muted-foreground">({risk.impact}/5)</span></span>
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
