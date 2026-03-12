import { Check, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PermissionPolicy } from "@/hooks/api/usePermissionPolicies"
import { cn } from "@/lib/utils"

// ─── config ───────────────────────────────────────────────────────────────────

const ROLES = ["admin", "direzione", "dipendente", "guest"] as const
type Role = (typeof ROLES)[number]

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  direzione: "Direzione",
  dipendente: "Dipendente",
  guest: "Ospite",
}

const DOMAIN_LABELS: Record<string, string> = {
  project: "Progetti",
  task: "Task",
  risk: "Rischi",
  document: "Documenti",
  input: "Segnalazioni",
  time_entry: "Ore",
  user: "Utenti",
  analytics: "Analytics",
}

const DOMAINS = ["project", "task", "risk", "document", "input", "time_entry", "user", "analytics"]

const ACTIONS = [
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

function isAllowed(
  role: Role,
  domain: string,
  action: string,
  policies: PermissionPolicy[]
): boolean {
  if (role === "admin") return true
  return policies.some(
    (p) => p.role === role && p.domain === domain && p.action === action && p.allowed
  )
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  policies: PermissionPolicy[]
}

export function PermissionsCompareDialog({ open, onOpenChange, policies }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Confronto permessi per ruolo</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] sticky left-0 bg-background">Dominio</TableHead>
                <TableHead className="w-[140px]">Azione</TableHead>
                {ROLES.map((role) => (
                  <TableHead key={role} className="text-center w-[100px]">
                    {ROLE_LABELS[role]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {DOMAINS.flatMap((domain) =>
                ACTIONS.map((action, actionIdx) => (
                  <TableRow
                    key={`${domain}-${action.id}`}
                    className={cn(actionIdx === 0 && "border-t-2 border-border")}
                  >
                    <TableCell className="sticky left-0 bg-background">
                      {actionIdx === 0 ? (
                        <span className="font-medium text-foreground">
                          {DOMAIN_LABELS[domain] ?? domain}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {action.label}
                    </TableCell>
                    {ROLES.map((role) => {
                      const allowed = isAllowed(role, domain, action.id, policies)
                      return (
                        <TableCell key={role} className="text-center">
                          {allowed ? (
                            <Check className="mx-auto h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <X className="mx-auto h-4 w-4 text-red-400 dark:text-red-500" />
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
