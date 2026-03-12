import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  BarChart2,
  Clock,
  FileText,
  FolderKanban,
  MessageSquarePlus,
  ShieldAlert,
  Users,
  CheckSquare,
  AlertTriangle,
  GitCompare,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { EmptyState } from "@/components/common/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import {
  usePermissionPoliciesQuery,
  useUpdatePolicies,
  useResetPolicies,
  type PermissionPolicy,
} from "@/hooks/api/usePermissionPolicies"
import { PermissionsCompareDialog } from "./PermissionsCompareDialog"
import { cn } from "@/lib/utils"

// ─── domain/action config ─────────────────────────────────────────────────────

const ROLES = ["admin", "direzione", "dipendente", "guest"] as const
type Role = (typeof ROLES)[number]

const ROLE_LABELS: Record<Role, string> = {
  admin: "Amministratore",
  direzione: "Direzione",
  dipendente: "Dipendente",
  guest: "Ospite",
}

interface DomainConfig {
  id: string
  label: string
  icon: LucideIcon
  color: string
}

const DOMAINS: DomainConfig[] = [
  { id: "project", label: "Progetti", icon: FolderKanban, color: "text-blue-600 dark:text-blue-400" },
  { id: "task", label: "Task", icon: CheckSquare, color: "text-blue-600 dark:text-blue-400" },
  { id: "risk", label: "Rischi", icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
  { id: "document", label: "Documenti", icon: FileText, color: "text-purple-600 dark:text-purple-400" },
  { id: "input", label: "Segnalazioni", icon: MessageSquarePlus, color: "text-amber-600 dark:text-amber-400" },
  { id: "time_entry", label: "Ore", icon: Clock, color: "text-green-600 dark:text-green-400" },
  { id: "user", label: "Utenti", icon: Users, color: "text-green-600 dark:text-green-400" },
  { id: "analytics", label: "Analytics", icon: BarChart2, color: "text-indigo-600 dark:text-indigo-400" },
]

interface ActionConfig {
  id: string
  label: string
}

const ACTIONS: ActionConfig[] = [
  { id: "view", label: "Visualizza" },
  { id: "create", label: "Crea" },
  { id: "edit", label: "Modifica" },
  { id: "delete", label: "Elimina" },
  { id: "advance_phase", label: "Avanza fase" },
  { id: "block", label: "Blocca" },
  { id: "assign", label: "Assegna" },
  { id: "export", label: "Esporta" },
  { id: "manage_team", label: "Gestisci team" },
  { id: "approve", label: "Approva" },
  { id: "evaluate", label: "Valuta" },
  { id: "convert", label: "Converti" },
]

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildLocalState(
  role: Role,
  policies: PermissionPolicy[]
): Record<string, Record<string, boolean>> {
  const state: Record<string, Record<string, boolean>> = {}
  for (const domain of DOMAINS) {
    state[domain.id] = {}
    for (const action of ACTIONS) {
      const found = policies.find(
        (p) => p.role === role && p.domain === domain.id && p.action === action.id
      )
      state[domain.id][action.id] = found?.allowed ?? false
    }
  }
  return state
}

// ─── component ────────────────────────────────────────────────────────────────

export function PermissionsTab() {
  const [selectedRole, setSelectedRole] = useState<Role>("dipendente")
  const [localState, setLocalState] = useState<Record<string, Record<string, boolean>>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)

  const { data: policies, isLoading, isError } = usePermissionPoliciesQuery()
  const updatePolicies = useUpdatePolicies()
  const resetPolicies = useResetPolicies()

  const isAdmin = selectedRole === "admin"

  // Sync local state when policies or role changes
  useEffect(() => {
    if (policies) {
      setLocalState(buildLocalState(selectedRole, policies))
      setIsDirty(false)
    }
  }, [policies, selectedRole])

  const handleCheck = useCallback(
    (domain: string, action: string, checked: boolean) => {
      if (isAdmin) return
      setLocalState((prev) => ({
        ...prev,
        [domain]: { ...prev[domain], [action]: checked },
      }))
      setIsDirty(true)
    },
    [isAdmin]
  )

  const handleRoleChange = useCallback((role: string) => {
    setSelectedRole(role as Role)
    setIsDirty(false)
  }, [])

  const handleCancel = useCallback(() => {
    if (policies) {
      setLocalState(buildLocalState(selectedRole, policies))
      setIsDirty(false)
    }
  }, [policies, selectedRole])

  const handleSave = useCallback(async () => {
    const policiesToSend: Array<{
      role: string
      domain: string
      action: string
      allowed: boolean
    }> = []

    for (const domain of DOMAINS) {
      for (const action of ACTIONS) {
        policiesToSend.push({
          role: selectedRole,
          domain: domain.id,
          action: action.id,
          allowed: localState[domain.id]?.[action.id] ?? false,
        })
      }
    }

    try {
      await updatePolicies.mutateAsync(policiesToSend)
      toast.success("Permessi salvati con successo")
      setIsDirty(false)
    } catch {
      toast.error("Errore nel salvataggio dei permessi")
    }
  }, [localState, selectedRole, updatePolicies])

  const handleReset = useCallback(async () => {
    try {
      await resetPolicies.mutateAsync()
      toast.success("Permessi ripristinati ai valori predefiniti")
      setIsDirty(false)
    } catch {
      toast.error("Errore nel ripristino dei permessi")
    }
  }, [resetPolicies])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !policies) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Errore nel caricamento"
        description="Impossibile caricare le policy di permesso. Riprova."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gestione permessi</h2>
          <p className="text-sm text-muted-foreground">
            Configura le azioni consentite per ogni ruolo di sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompareOpen(true)}
          >
            <GitCompare className="mr-2 h-4 w-4" />
            Confronta ruoli
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={resetPolicies.isPending}
              >
                Ripristina default
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ripristina permessi predefiniti?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tutti i permessi per tutti i ruoli verranno reimpostati ai valori
                  predefiniti. Questa operazione non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} disabled={resetPolicies.isPending}>
                  Ripristina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Role selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Ruolo:</span>
        <Select value={selectedRole} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Admin notice */}
      {isAdmin && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-900/20">
          <ShieldAlert className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            L'amministratore ha sempre accesso completo a tutte le funzionalità. I permessi non
            possono essere modificati.
          </p>
        </div>
      )}

      {/* Domain cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DOMAINS.map((domain) => {
          const Icon = domain.icon
          return (
            <Card key={domain.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className={cn("h-5 w-5", domain.color)} />
                  {domain.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ACTIONS.map((action) => {
                    const checked = isAdmin || (localState[domain.id]?.[action.id] ?? false)
                    return (
                      <div key={action.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`${domain.id}-${action.id}`}
                          checked={checked}
                          disabled={isAdmin}
                          onCheckedChange={(val) =>
                            handleCheck(domain.id, action.id, val === true)
                          }
                        />
                        <label
                          htmlFor={`${domain.id}-${action.id}`}
                          className={cn(
                            "cursor-pointer select-none text-sm",
                            isAdmin
                              ? "text-muted-foreground"
                              : "text-foreground"
                          )}
                        >
                          {action.label}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Save / Cancel bar — shown only when dirty */}
      {isDirty && (
        <div className="flex items-center justify-end gap-3 rounded-md border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">Hai modifiche non salvate.</span>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Annulla
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updatePolicies.isPending}
          >
            {updatePolicies.isPending ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      )}

      <PermissionsCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        policies={policies}
      />
    </div>
  )
}
