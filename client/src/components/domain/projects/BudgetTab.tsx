import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ProgressGradient } from "@/components/common/ProgressGradient"
import { useBudgetBreakdownQuery } from "@/hooks/api/useStats"
import { cn, formatHours, getUserInitials, getAvatarColor } from "@/lib/utils"

interface BudgetTabProps {
  projectId: string
}

function BudgetSkeleton() {
  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function BudgetTab({ projectId }: BudgetTabProps) {
  const { data, isLoading } = useBudgetBreakdownQuery(projectId)

  if (isLoading) return <BudgetSkeleton />

  if (!data || data.budget == null) {
    return (
      <div className="pt-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Budget non configurato per questo progetto
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const budgetPct = data.budgetUsedPercent ?? 0
  const isOverBudget = budgetPct > 100

  return (
    <div className="space-y-4 pt-4">
      {/* Summary KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Budget totale */}
        <Card className="card-hover">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Budget (ore)
            </p>
            <p
              className="text-lg font-bold tabular-nums text-foreground"
              style={{ fontFamily: "var(--font-data)" }}
            >
              {data.budget}h
            </p>
          </CardContent>
        </Card>

        {/* Ore loggate */}
        <Card className="card-hover">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Ore loggate
            </p>
            <p
              className="text-lg font-bold tabular-nums text-foreground"
              style={{ fontFamily: "var(--font-data)" }}
            >
              {formatHours(data.totalHours * 60)}
            </p>
          </CardContent>
        </Card>

        {/* Costo totale */}
        <Card className="card-hover">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Costo totale
            </p>
            <p
              className="text-lg font-bold tabular-nums text-foreground"
              style={{ fontFamily: "var(--font-data)" }}
            >
              €{data.totalCost.toLocaleString("it-IT", { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>

        {/* Budget usato % */}
        <Card className="card-hover">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Budget usato
            </p>
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                isOverBudget ? "text-destructive" : "text-foreground"
              )}
              style={{ fontFamily: "var(--font-data)" }}
            >
              {Math.round(budgetPct)}%
            </p>
            <div className="mt-1.5">
              <ProgressGradient
                value={Math.min(budgetPct, 100)}
                context={isOverBudget ? "danger" : "project"}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member breakdown table */}
      {data.members.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Dettaglio per membro
              </p>
            </div>
            <div className="divide-y divide-border">
              {data.members.map((member) => {
                const fullName = `${member.firstName} ${member.lastName}`
                return (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    {/* Avatar */}
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback
                        className={cn("text-[10px] text-white", getAvatarColor(fullName))}
                      >
                        {getUserInitials(member.firstName, member.lastName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fullName}</p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 shrink-0 text-right">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Ore</p>
                        <p
                          className="text-sm font-semibold tabular-nums"
                          style={{ fontFamily: "var(--font-data)" }}
                        >
                          {formatHours(member.hoursLogged * 60)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Tariffa</p>
                        <p
                          className="text-sm font-semibold tabular-nums"
                          style={{ fontFamily: "var(--font-data)" }}
                        >
                          €{member.hourlyRate}/h
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Costo</p>
                        <p
                          className="text-sm font-semibold tabular-nums"
                          style={{ fontFamily: "var(--font-data)" }}
                        >
                          €{member.cost.toLocaleString("it-IT", { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {data.members.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nessuna ora loggata dai membri del team
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
