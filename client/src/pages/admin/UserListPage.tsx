import { useState, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Crown,
  Briefcase,
  UserCog,
  Check,
  X,
  Minus,
  LogIn,
  Search,
  Activity,
} from "lucide-react"
import { toast } from "sonner"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import { useUserListQuery, useUpdateUser } from "@/hooks/api/useUsers"
import { EmptyState } from "@/components/common/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ROLE_LABELS,
  ROLE_COLORS,
} from "@/lib/constants"
import { cn, formatRelative, getUserInitials, getAvatarColor } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  projectMemberships?: Array<{ project: { id: string; name: string } }>
}

interface DrawerState {
  open: boolean
  user: UserRow | null
}

interface EditForm {
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
}

// ─── Permission matrix data (static) ─────────────────────────────────────────

type PermValue = "yes" | "no" | "partial"

interface PermRow {
  feature: string
  description?: string
  group?: boolean
  admin: PermValue
  direzione: PermValue
  dipendente: PermValue
  guest: PermValue
}

const PERM_MATRIX: PermRow[] = [
  { feature: "Progetti", group: true, admin: "yes", direzione: "yes", dipendente: "no", guest: "no" },
  { feature: "Crea progetti", admin: "yes", direzione: "yes", dipendente: "no", guest: "no" },
  { feature: "Modifica progetti", admin: "yes", direzione: "yes", dipendente: "no", guest: "no" },
  { feature: "Elimina progetti", description: "Solo Admin", admin: "yes", direzione: "no", dipendente: "no", guest: "no" },
  { feature: "Task", group: true, admin: "yes", direzione: "yes", dipendente: "partial", guest: "no" },
  { feature: "Crea task", admin: "yes", direzione: "yes", dipendente: "no", guest: "no" },
  { feature: "Modifica task", admin: "yes", direzione: "yes", dipendente: "no", guest: "no" },
  { feature: "Avanza stato task", description: "Solo task assegnati per Dipendente", admin: "yes", direzione: "yes", dipendente: "partial", guest: "no" },
  { feature: "Gestione", group: true, admin: "yes", direzione: "yes", dipendente: "no", guest: "no" },
  { feature: "Gestisci rischi", description: "Vista sola per Dipendente", admin: "yes", direzione: "yes", dipendente: "no", guest: "no" },
  { feature: "Gestisci documenti", admin: "yes", direzione: "yes", dipendente: "partial", guest: "no" },
  { feature: "Log ore", description: "Solo proprie ore per Dipendente", admin: "yes", direzione: "yes", dipendente: "partial", guest: "no" },
  { feature: "Amministrazione", group: true, admin: "yes", direzione: "no", dipendente: "no", guest: "no" },
  { feature: "Gestisci utenti", admin: "yes", direzione: "no", dipendente: "no", guest: "no" },
  { feature: "Report", description: "Solo propri report per Dipendente", admin: "yes", direzione: "yes", dipendente: "partial", guest: "no" },
  { feature: "Invita membri", admin: "yes", direzione: "yes", dipendente: "no", guest: "no" },
]

// ─── KPI card animation variants ──────────────────────────────────────────────

const kpiVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PermIcon({ value }: { value: PermValue }) {
  if (value === "yes") return <Check className="h-4 w-4 text-green-500 mx-auto" />
  if (value === "partial") return <Minus className="h-4 w-4 text-amber-500 mx-auto" />
  return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-5 gap-3 mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-10 mb-1" />
            <Skeleton className="h-2 w-full mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function UserListPage() {
  useSetPageContext({ domain: "admin" })
  const { isAdmin } = usePrivilegedRole()

  // Filter state
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Drawer state
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, user: null })
  const [editForm, setEditForm] = useState<EditForm>({
    firstName: "",
    lastName: "",
    email: "",
    role: "dipendente",
    isActive: true,
  })

  const { data, isLoading, error } = useUserListQuery({ limit: 100 })
  const updateUser = useUpdateUser()

  const allUsers: UserRow[] = data?.data ?? []

  // Computed KPI stats
  const stats = useMemo(() => {
    const total = allUsers.length
    const active = allUsers.filter((u) => u.isActive).length
    const admins = allUsers.filter((u) => u.role === "admin").length
    const direzione = allUsers.filter((u) => u.role === "direzione").length
    const dipendenti = allUsers.filter((u) => u.role === "dipendente").length
    return { total, active, admins, direzione, dipendenti }
  }, [allUsers])

  // Filtered users
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
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "inactive" && !u.isActive)
      return matchSearch && matchRole && matchStatus
    })
  }, [allUsers, search, roleFilter, statusFilter])

  const openDrawer = useCallback((user: UserRow) => {
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })
    setDrawer({ open: true, user })
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawer({ open: false, user: null })
  }, [])

  const handleSave = useCallback(async () => {
    if (!drawer.user) return
    try {
      await updateUser.mutateAsync({ id: drawer.user.id, ...editForm })
      toast.success("Utente aggiornato con successo")
      closeDrawer()
    } catch {
      toast.error("Errore durante il salvataggio")
    }
  }, [drawer.user, editForm, updateUser, closeDrawer])

  // Guard: non-admin
  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Accesso non autorizzato"
        description="Solo gli amministratori possono gestire gli utenti."
      />
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Errore nel caricamento"
        description="Impossibile caricare la lista utenti. Riprova."
      />
    )
  }

  return (
    <>
      <div className="space-y-0">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 pb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border border-transparent">
                <Users className="h-3 w-3" />
                Team
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Gestione Utenti
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Accesso riservato · Solo Admin
            </p>
          </div>
          <Button size="sm" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Nuovo utente
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="mb-0 border-b border-border bg-transparent rounded-none h-auto p-0 gap-1 w-full justify-start">
            <TabsTrigger
              value="users"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent shadow-none"
            >
              <Users className="h-3.5 w-3.5" />
              Utenti
              <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {allUsers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent shadow-none"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Matrice Permessi
            </TabsTrigger>
            <TabsTrigger
              value="access-log"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent shadow-none"
            >
              <Activity className="h-3.5 w-3.5" />
              Log Accessi
              <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                0
              </span>
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Utenti ── */}
          <TabsContent value="users" className="mt-0 pt-5">
            {/* KPI strip */}
            {isLoading ? (
              <KpiSkeleton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                {(
                  [
                    {
                      label: "Totale utenti",
                      value: stats.total,
                      sub: `${stats.admins} admin · ${stats.direzione} dir · ${stats.dipendenti} dip`,
                      icon: Users,
                      gradient: "from-slate-600 to-slate-400",
                      valueClass: "text-foreground",
                      delay: 0,
                    },
                    {
                      label: "Attivi",
                      value: stats.active,
                      sub: `${stats.total - stats.active} disattivat${stats.total - stats.active === 1 ? "o" : "i"}`,
                      icon: UserCheck,
                      gradient: "from-green-700 to-green-500",
                      valueClass: "text-green-500",
                      delay: 1,
                    },
                    {
                      label: "Admin",
                      value: stats.admins,
                      sub: "accesso completo",
                      icon: Crown,
                      gradient: "from-red-700 to-red-500",
                      valueClass: "text-red-500",
                      delay: 2,
                    },
                    {
                      label: "Direzione",
                      value: stats.direzione,
                      sub: "gestione progetti",
                      icon: Briefcase,
                      gradient: "from-indigo-700 to-indigo-500",
                      valueClass: "text-indigo-400",
                      delay: 3,
                    },
                    {
                      label: "Dipendenti",
                      value: stats.dipendenti,
                      sub: "accesso progetti assegnati",
                      icon: UserCog,
                      gradient: "from-slate-600 to-slate-400",
                      valueClass: "text-slate-400",
                      delay: 4,
                    },
                  ] as const
                ).map((kpi) => (
                  <motion.div
                    key={kpi.label}
                    variants={kpiVariants}
                    initial="initial"
                    animate="animate"
                    transition={{ duration: 0.2, delay: kpi.delay * 0.05 }}
                  >
                    <Card className="relative overflow-hidden hover:border-border/80 transition-colors">
                      <CardContent className="p-3.5 pb-4">
                        <div className="flex items-start justify-between mb-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            {kpi.label}
                          </p>
                          <kpi.icon className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5" />
                        </div>
                        <p className={cn("text-2xl font-semibold leading-none mb-1", kpi.valueClass)}>
                          {kpi.value}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                        {/* Accent bar */}
                        <div
                          className={cn(
                            "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r",
                            kpi.gradient
                          )}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Filter toolbar */}
            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-[280px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cerca utenti..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Tutti i ruoli" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                    <SelectItem key={val} value={val}>
                      {lbl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="active">Solo attivi</SelectItem>
                  <SelectItem value="inactive">Solo inattivi</SelectItem>
                </SelectContent>
              </Select>
              {(search || roleFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => {
                    setSearch("")
                    setRoleFilter("all")
                    setStatusFilter("all")
                  }}
                >
                  Azzera filtri
                </Button>
              )}
            </div>

            {/* Users table */}
            {isLoading ? (
              <TableSkeleton />
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nessun utente trovato"
                description="Prova a modificare i filtri di ricerca."
              />
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Nome
                        </th>
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[120px]">
                          Ruolo
                        </th>
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[100px]">
                          Stato
                        </th>
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[180px]">
                          Progetti
                        </th>
                        <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[140px]">
                          Ultimo Accesso
                        </th>
                        <th className="w-[80px]" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const initials = getUserInitials(user.firstName, user.lastName)
                        const avatarBg = getAvatarColor(`${user.firstName}${user.lastName}`)
                        const projects = user.projectMemberships ?? []
                        const visibleProjects = projects.slice(0, 2)
                        const overflowCount = projects.length - 2

                        return (
                          <tr
                            key={user.id}
                            className="group border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => openDrawer(user)}
                          >
                            {/* Name + email */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarFallback
                                    className={cn("text-xs font-bold text-white", avatarBg)}
                                  >
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground text-sm leading-tight truncate">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-3 py-3">
                              <Badge
                                variant="secondary"
                                className={cn("text-[10px] font-bold uppercase tracking-wide", ROLE_COLORS[user.role] ?? "")}
                              >
                                {ROLE_LABELS[user.role] ?? user.role}
                              </Badge>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full flex-shrink-0",
                                    user.isActive ? "bg-green-500" : "bg-slate-400"
                                  )}
                                />
                                <span
                                  className={cn(
                                    "text-xs font-medium",
                                    user.isActive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                  )}
                                >
                                  {user.isActive ? "Attivo" : "Inattivo"}
                                </span>
                              </div>
                            </td>

                            {/* Projects */}
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                {visibleProjects.map((m) => (
                                  <span
                                    key={m.project.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border/50 truncate max-w-[80px]"
                                    title={m.project.name}
                                  >
                                    {m.project.name}
                                  </span>
                                ))}
                                {overflowCount > 0 && (
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    +{overflowCount}
                                  </span>
                                )}
                                {projects.length === 0 && (
                                  <span className="text-[10px] text-muted-foreground/50">—</span>
                                )}
                              </div>
                            </td>

                            {/* Last login */}
                            <td className="px-3 py-3">
                              <span className="text-xs text-muted-foreground">
                                {user.lastLoginAt ? formatRelative(user.lastLoginAt) : "—"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs px-2.5"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openDrawer(user)
                                  }}
                                >
                                  Modifica
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Tab 2: Matrice Permessi ── */}
          <TabsContent value="permissions" className="mt-0 pt-5">
            <p className="text-sm text-muted-foreground mb-5 max-w-2xl leading-relaxed">
              Panoramica dei permessi per ciascun ruolo di sistema. Le autorizzazioni
              "parziali" indicano che il ruolo ha accesso limitato (es. solo proprie
              risorse o solo lettura).
            </p>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground min-w-[200px]">
                        Funzionalità
                      </th>
                      {(["admin", "direzione", "dipendente", "guest"] as const).map((role) => (
                        <th
                          key={role}
                          className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[120px]"
                        >
                          <Badge
                            variant="secondary"
                            className={cn("text-[10px] font-bold uppercase tracking-wide", ROLE_COLORS[role] ?? "")}
                          >
                            {ROLE_LABELS[role]}
                          </Badge>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERM_MATRIX.map((row, idx) =>
                      row.group ? (
                        <tr key={idx} className="border-b border-border bg-muted/20">
                          <td
                            colSpan={5}
                            className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                          >
                            {row.feature}
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={idx}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <p className="text-sm font-medium text-foreground">{row.feature}</p>
                            {row.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {row.description}
                              </p>
                            )}
                          </td>
                          {(["admin", "direzione", "dipendente", "guest"] as const).map((role) => (
                            <td key={role} className="px-4 py-2.5 text-center">
                              <PermIcon value={row[role]} />
                            </td>
                          ))}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-4 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span>Permesso completo</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Minus className="h-3.5 w-3.5 text-amber-500" />
                <span>Permesso parziale</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <X className="h-3.5 w-3.5 text-muted-foreground/40" />
                <span>Nessun accesso</span>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Log Accessi ── */}
          <TabsContent value="access-log" className="mt-0 pt-5">
            {/* Filter bar (decorative — no backend yet) */}
            <div className="flex items-center gap-2.5 mb-5 flex-wrap opacity-50 pointer-events-none">
              <Input
                placeholder="Dal… Al…"
                className="h-8 text-xs w-[160px]"
                disabled
              />
              <Select disabled>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Tutti gli utenti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli utenti</SelectItem>
                </SelectContent>
              </Select>
              <Select disabled>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Tipo azione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le azioni</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="edit">Modifica</SelectItem>
                  <SelectItem value="create">Creazione</SelectItem>
                  <SelectItem value="delete">Eliminazione</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <EmptyState
              icon={LogIn}
              title="Log accessi non ancora disponibile"
              description="Il sistema di audit degli accessi sarà disponibile in una versione futura."
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── User Detail Sheet (Drawer) ── */}
      <Sheet open={drawer.open} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent className="w-[420px] sm:max-w-[420px] flex flex-col p-0">
          {drawer.user && (
            <>
              {/* Sheet header */}
              <SheetHeader className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback
                      className={cn(
                        "text-sm font-bold text-white",
                        getAvatarColor(`${drawer.user.firstName}${drawer.user.lastName}`)
                      )}
                    >
                      {getUserInitials(drawer.user.firstName, drawer.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-base leading-tight">
                      {drawer.user.firstName} {drawer.user.lastName}
                    </SheetTitle>
                    <SheetDescription className="text-xs mt-0.5 flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wide",
                          ROLE_COLORS[drawer.user.role] ?? ""
                        )}
                      >
                        {ROLE_LABELS[drawer.user.role] ?? drawer.user.role}
                      </Badge>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Sheet body */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                {/* Section: Dati anagrafici */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border/50">
                    Dati anagrafici
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Nome
                      </Label>
                      <Input
                        value={editForm.firstName}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, firstName: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Cognome
                      </Label>
                      <Input
                        value={editForm.lastName}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, lastName: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="h-8 text-sm"
                  />
                </div>

                {/* Section: Accesso */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b border-border/50">
                    Accesso e ruolo
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Ruolo
                      </Label>
                      <Select
                        value={editForm.role}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                            <SelectItem key={val} value={val}>
                              {lbl}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Account attivo</p>
                        <p className="text-xs text-muted-foreground">
                          L'utente può accedere all'applicazione
                        </p>
                      </div>
                      <Switch
                        checked={editForm.isActive}
                        onCheckedChange={(v) => setEditForm((f) => ({ ...f, isActive: v }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Last login info */}
                {drawer.user.lastLoginAt && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40 border border-border/50">
                    <LogIn className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      Ultimo accesso{" "}
                      <span className="text-foreground font-medium">
                        {formatRelative(drawer.user.lastLoginAt)}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Sheet footer */}
              <SheetFooter className="px-5 py-4 border-t border-border flex-shrink-0 flex-row gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeDrawer}
                  disabled={updateUser.isPending}
                >
                  Annulla
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateUser.isPending}
                >
                  {updateUser.isPending ? "Salvataggio..." : "Salva modifiche"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
