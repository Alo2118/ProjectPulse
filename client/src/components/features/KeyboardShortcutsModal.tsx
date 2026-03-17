import { Fragment } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShortcutEntry {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  heading: string
  entries: ShortcutEntry[]
}

// ---------------------------------------------------------------------------
// Shortcut data
// ---------------------------------------------------------------------------

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    heading: "Navigazione",
    entries: [
      { keys: ["Ctrl", "K"], description: "Apri ricerca rapida" },
      { keys: ["G", "H"], description: "Vai a Home" },
      { keys: ["G", "P"], description: "Vai a Progetti" },
      { keys: ["G", "T"], description: "Vai a Task" },
    ],
  },
  {
    heading: "Lista",
    entries: [
      { keys: ["J"], description: "Elemento successivo" },
      { keys: ["K"], description: "Elemento precedente" },
      { keys: ["↓"], description: "Elemento successivo" },
      { keys: ["↑"], description: "Elemento precedente" },
      { keys: ["Enter"], description: "Apri elemento selezionato" },
    ],
  },
  {
    heading: "Azioni",
    entries: [
      { keys: ["N"], description: "Nuovo elemento" },
      { keys: ["E"], description: "Modifica elemento selezionato" },
      { keys: ["Backspace"], description: "Elimina elemento selezionato" },
    ],
  },
  {
    heading: "Vista",
    entries: [
      { keys: ["F"], description: "Apri / chiudi filtri" },
      { keys: ["/"], description: "Cerca nella lista" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Sub-component: key combo renderer
// ---------------------------------------------------------------------------

interface KeyComboProps {
  keys: string[]
}

function KeyCombo({ keys }: KeyComboProps) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((key, i) => (
        <Fragment key={i}>
          <kbd
            className={[
              "inline-flex min-w-[1.75rem] items-center justify-center",
              "rounded border border-border bg-muted px-1.5 py-0.5",
              "font-mono text-[11px] font-medium text-muted-foreground",
              "shadow-[0_1px_0_0_hsl(var(--border))]",
            ].join(" ")}
          >
            {key}
          </kbd>
          {i < keys.length - 1 && (
            <span className="text-[10px] text-muted-foreground">poi</span>
          )}
        </Fragment>
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Scorciatoie da tastiera</DialogTitle>
          <DialogDescription>
            Usa queste combinazioni per navigare e agire rapidamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {SHORTCUT_GROUPS.map((group, groupIndex) => (
            <div key={group.heading}>
              {groupIndex > 0 && <Separator className="mb-4" />}

              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.heading}
              </h3>

              <table className="w-full text-sm" role="table">
                <tbody>
                  {group.entries.map((entry) => (
                    <tr
                      key={entry.description}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-2 pr-4 text-left text-foreground/90">
                        {entry.description}
                      </td>
                      <td className="py-2 text-right">
                        <KeyCombo keys={entry.keys} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Le scorciatoie di navigazione (G) richiedono la pressione sequenziale dei tasti.
        </p>
      </DialogContent>
    </Dialog>
  )
}
