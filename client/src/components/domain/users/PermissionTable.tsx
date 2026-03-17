import { Check, Minus, X } from "lucide-react"

type PermLevel = "yes" | "partial" | "no"

interface PermRow {
  feat?: string
  desc?: string
  group?: string
  admin?: PermLevel
  dir?: PermLevel
  dip?: PermLevel
  guest?: PermLevel
}

const PERM_DATA: PermRow[] = [
  { group: "Progetti" },
  { feat: "Visualizzare tutti i progetti", desc: "Lista e dettaglio progetti", admin: "yes", dir: "yes", dip: "partial", guest: "partial" },
  { feat: "Creare / modificare progetti", desc: "Nuovi progetti, milestone, impostazioni", admin: "yes", dir: "yes", dip: "no", guest: "no" },
  { feat: "Eliminare progetti", desc: "Eliminazione definitiva", admin: "yes", dir: "no", dip: "no", guest: "no" },
  { group: "Task" },
  { feat: "Visualizzare tutti i task", desc: "Task di tutti gli utenti", admin: "yes", dir: "yes", dip: "partial", guest: "partial" },
  { feat: "Creare / modificare task", desc: "Nuovi task, assegnazione, scadenze", admin: "yes", dir: "yes", dip: "yes", guest: "no" },
  { feat: "Eliminare task", desc: "Eliminazione definitiva", admin: "yes", dir: "yes", dip: "no", guest: "no" },
  { feat: "Log ore su qualsiasi task", desc: "Inserimento ore su task altrui", admin: "yes", dir: "yes", dip: "partial", guest: "no" },
  { group: "Rischi" },
  { feat: "Visualizzare tutti i rischi", desc: "Registro completo rischi", admin: "yes", dir: "yes", dip: "partial", guest: "no" },
  { feat: "Creare / modificare rischi", desc: "Nuovo rischio, piano mitigazione", admin: "yes", dir: "yes", dip: "no", guest: "no" },
  { group: "Documenti" },
  { feat: "Visualizzare documenti", desc: "Tutti i documenti di progetto", admin: "yes", dir: "yes", dip: "partial", guest: "partial" },
  { feat: "Caricare / modificare documenti", desc: "Upload e revisioni", admin: "yes", dir: "yes", dip: "yes", guest: "no" },
  { feat: "Approvare documenti", desc: "Cambio stato → Approvato", admin: "yes", dir: "yes", dip: "no", guest: "no" },
  { group: "Report" },
  { feat: "Report aggregati (tutti)", desc: "Dati di tutto il team", admin: "yes", dir: "yes", dip: "no", guest: "no" },
  { feat: "Report personali", desc: "Solo i propri dati", admin: "yes", dir: "yes", dip: "yes", guest: "no" },
  { group: "Amministrazione" },
  { feat: "Gestione utenti", desc: "Crea, modifica, disattiva utenti", admin: "yes", dir: "partial", dip: "no", guest: "no" },
  { feat: "Modifica permessi", desc: "Cambio ruoli e permessi", admin: "yes", dir: "no", dip: "no", guest: "no" },
  { feat: "Log accessi sistema", desc: "Visualizzare log di tutti gli utenti", admin: "yes", dir: "partial", dip: "no", guest: "no" },
]

function PermCell({ level }: { level?: PermLevel }) {
  if (level === "yes") {
    return (
      <td className="px-[14px] py-[8px] border border-[var(--border-subtle)] text-center align-middle" style={{ width: 110 }}>
        <div className="flex items-center justify-center" style={{ color: "#4ade80" }}>
          <Check className="w-[14px] h-[14px]" strokeWidth={2.5} />
        </div>
      </td>
    )
  }
  if (level === "partial") {
    return (
      <td className="px-[14px] py-[8px] border border-[var(--border-subtle)] text-center align-middle" style={{ width: 110 }}>
        <div className="flex items-center justify-center" style={{ color: "#facc15" }}>
          <Minus className="w-[14px] h-[14px]" strokeWidth={2.5} />
        </div>
      </td>
    )
  }
  return (
    <td className="px-[14px] py-[8px] border border-[var(--border-subtle)] text-center align-middle" style={{ width: 110, opacity: 0.4 }}>
      <div className="flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        <X className="w-[14px] h-[14px]" strokeWidth={2.5} />
      </div>
    </td>
  )
}

export function PermissionTable() {
  return (
    <div>
      <p className="text-[12px] text-[var(--text-secondary)] mb-[18px] leading-[1.6] max-w-[640px]">
        Matrice permessi per ruolo. Definisce cosa ogni ruolo può vedere, creare, modificare ed eliminare
        all'interno di ProjectPulse. Le modifiche ai permessi richiedono accesso Admin.
      </p>

      <div className="overflow-x-auto">
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              <th
                className="px-[14px] py-[10px] text-left border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  color: "var(--text-muted)",
                  minWidth: 220,
                  borderRadius: "var(--radius-sm) 0 0 0",
                }}
              >
                Permesso
              </th>
              {["Admin", "Direzione", "Dipendente", "Ospite"].map((role, i, arr) => (
                <th
                  key={role}
                  className="px-[14px] py-[10px] text-center border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    color: "var(--text-muted)",
                    width: 110,
                    borderRadius: i === arr.length - 1 ? "0 var(--radius-sm) 0 0" : 0,
                  }}
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERM_DATA.map((row, i) => {
              if (row.group) {
                return (
                  <tr key={`group-${i}`}>
                    <td
                      colSpan={5}
                      className="px-[14px] py-[6px] border border-[var(--border)] bg-[var(--bg-surface)]"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".1em",
                        color: "var(--text-muted)",
                      }}
                    >
                      {row.group}
                    </td>
                  </tr>
                )
              }
              return (
                <tr
                  key={`row-${i}`}
                  style={{ transition: "background 0.12s" }}
                  className="hover:bg-[rgba(255,255,255,0.015)]"
                >
                  <td className="px-[14px] py-[8px] border border-[var(--border-subtle)] align-middle">
                    <div className="text-[12px] font-medium text-[var(--text-primary)]">{row.feat}</div>
                    {row.desc && (
                      <div className="text-[10px] text-[var(--text-muted)] mt-[1px]">{row.desc}</div>
                    )}
                  </td>
                  <PermCell level={row.admin} />
                  <PermCell level={row.dir} />
                  <PermCell level={row.dip} />
                  <PermCell level={row.guest} />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-[14px] flex-wrap">
        <div className="flex items-center gap-[6px] text-[11px] text-[var(--text-muted)]">
          <Check className="w-[14px] h-[14px]" style={{ color: "#4ade80" }} strokeWidth={2.5} />
          Accesso completo
        </div>
        <div className="flex items-center gap-[6px] text-[11px] text-[var(--text-muted)]">
          <Minus className="w-[14px] h-[14px]" style={{ color: "#facc15" }} strokeWidth={2.5} />
          Accesso parziale / solo lettura
        </div>
        <div className="flex items-center gap-[6px] text-[11px] text-[var(--text-muted)]">
          <X className="w-[14px] h-[14px]" style={{ color: "var(--text-muted)", opacity: 0.4 }} strokeWidth={2.5} />
          Nessun accesso
        </div>
      </div>
    </div>
  )
}
