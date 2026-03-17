import { useState, useMemo, useCallback } from "react"
import { Users, Search, Plus, UserCheck, Crown, Briefcase, UserCog } from "lucide-react"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/common/EmptyState"
import { KpiCard } from "@/components/common/KpiCard"
import { UserRow, type UserRowData } from "@/components/domain/users/UserRow"
import { UserDrawer } from "@/components/domain/users/UserDrawer"
import { useUserListQuery } from "@/hooks/api/useUsers"
import { ROLE_LABELS } from "@/lib/constants"

const kpiVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
}

const KPI_GRADIENTS: Record<string, string> = {
  total:    "var(--gradient-primary)",
  active:   "var(--gradient-success)",
  admin:    "var(--gradient-danger)",
  direzione:"var(--gradient-indigo)",
  dipendente:"var(--gradient-success)",
}

const KPI_VALUE_COLORS: Record<string, string | undefined> = {
  total:    undefined,
  active:   "#4ade80",
  admin:    "#f87171",
  direzione:"#a5b4fc",
  dipendente:"#4ade80",
}

function TableSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

export function UsersTab() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [drawerUser, setDrawerUser] = useState<UserRowData | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading } = useUserListQuery({ limit: 100 })
  const allUsers: UserRowData[] = (data?.data ?? []) as UserRowData[]

  const stats = useMemo(() => {
    const total = allUsers.length
    const active = allUsers.filter((u) => u.isActive !== false).length
    const admins = allUsers.filter((u) => u.role === "admin").length
    const direzione = allUsers.filter((u) => u.role === "direzione").length
    const dipendenti = allUsers.filter((u) => u.role === "dipendente").length
    return { total, active, admins, direzione, dipendenti }
  }, [allUsers])

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase()
      const matchSearch =
        !search ||
        fullName.includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      const matchRole = roleFilter === "all" || u.role === roleFilter
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive !== false) ||
        (statusFilter === "inactive" && u.isActive === false)
      return matchSearch && matchRole && matchStatus
    })
  }, [allUsers, search, roleFilter, statusFilter])

  const openUserDrawer = useCallback((user: UserRowData) => {
    setDrawerUser(user)
    setIsNewUser(false)
    setDrawerOpen(true)
  }, [])

  const openNewUserDrawer = useCallback(() => {
    setDrawerUser(null)
    setIsNewUser(true)
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setDrawerUser(null)
    setIsNewUser(false)
  }, [])

  const kpiItems = [
    {
      id: "total",
      label: "Totale utenti",
      value: stats.total,
      sub: `${stats.admins} admin · ${stats.direzione} dir · ${stats.dipendenti} dip`,
      icon: Users,
    },
    {
      id: "active",
      label: "Attivi",
      value: stats.active,
      sub: `${stats.total - stats.active} disattivat${stats.total - stats.active === 1 ? "o" : "i"}`,
      icon: UserCheck,
    },
    {
      id: "admin",
      label: "Admin",
      value: stats.admins,
      sub: "accesso completo",
      icon: Crown,
    },
    {
      id: "direzione",
      label: "Direzione",
      value: stats.direzione,
      sub: "gestione progetti",
      icon: Briefcase,
    },
    {
      id: "dipendente",
      label: "Dipendenti",
      value: stats.dipendenti,
      sub: "accesso progetti assegnati",
      icon: UserCog,
    },
  ]

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-[10px] mb-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] rounded-[var(--radius)]" />
            ))
          : kpiItems.map((kpi, i) => (
              <motion.div
                key={kpi.id}
                variants={kpiVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: i * 0.05, duration: 0.22 }}
              >
                <KpiCard
                  label={kpi.label}
                  value={kpi.value}
                  sub={kpi.sub}
                  accentGradient={KPI_GRADIENTS[kpi.id]}
                  valueColor={KPI_VALUE_COLORS[kpi.id]}
                  variant="compact"
                />
              </motion.div>
            ))}
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-[10px] mb-4 flex-wrap"
      >
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-[6px] rounded-[var(--radius)] border border-[var(--border)] flex-1 max-w-[260px] transition-[border-color] duration-[150ms] focus-within:border-[rgba(45,140,240,.35)]"
          style={{ background: "var(--bg-elevated)" }}
        >
          <Search className="w-[13px] h-[13px] text-[var(--text-muted)] flex-shrink-0" />
          <input
            type="text"
            placeholder="Cerca per nome, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-[12px] text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
          />
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-[10px] py-[5px] rounded-[var(--radius)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)] outline-none cursor-pointer"
          style={{ background: "var(--bg-elevated)" }}
        >
          <option value="all">Tutti i ruoli</option>
          {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-[10px] py-[5px] rounded-[var(--radius)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)] outline-none cursor-pointer"
          style={{ background: "var(--bg-elevated)" }}
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">Attivo</option>
          <option value="inactive">Disattivato</option>
        </select>

        {/* Spacer + New user button */}
        <div className="ml-auto">
          <button
            type="button"
            onClick={openNewUserDrawer}
            className="flex items-center gap-[6px] px-[13px] py-[5px] rounded-[var(--radius)] border text-[12px] font-medium cursor-pointer transition-all duration-[180ms]"
            style={{
              background: "rgba(99,102,241,.1)",
              color: "#a5b4fc",
              borderColor: "rgba(99,102,241,.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,.2)"
              e.currentTarget.style.borderColor = "rgba(99,102,241,.6)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,.1)"
              e.currentTarget.style.borderColor = "rgba(99,102,241,.3)"
            }}
          >
            <Plus className="w-[13px] h-[13px]" />
            Nuovo utente
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun utente trovato"
          description="Prova a modificare i filtri di ricerca."
        />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                {["Utente", "Ruolo", "Stato", "Ultimo accesso", "Dipartimento", ""].map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--bg-surface)",
                      position: "sticky",
                      top: 0,
                      zIndex: 5,
                      width: i === 5 ? 80 : undefined,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onClick={openUserDrawer}
                  onEdit={openUserDrawer}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      <UserDrawer
        user={drawerUser}
        isNew={isNewUser}
        isOpen={drawerOpen}
        onClose={closeDrawer}
      />
    </div>
  )
}
