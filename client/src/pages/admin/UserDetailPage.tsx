import { useMemo } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Pencil,
  Mail,
  Building2,
  CalendarDays,
  Euro,
  CheckSquare,
  FolderKanban,
  ShieldAlert,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import { useUserQuery, useDeleteUser } from "@/hooks/api/useUsers"
import { useRelatedQuery } from "@/hooks/api/useRelated"
import { useTaskListQuery } from "@/hooks/api/useTasks"
import { EntityDetail } from "@/components/common/EntityDetail"
import { MetaRow } from "@/components/common/MetaRow"
import { ActivityTab } from "@/components/common/ActivityTab"
import { TagEditor } from "@/components/common/TagEditor"
import { StatusDot } from "@/components/common/StatusDot"
import { DeadlineCell } from "@/components/common/DeadlineCell"
import { EmptyState } from "@/components/common/EmptyState"
import { KpiStrip } from "@/components/common/KpiStrip"
import type { KpiCard } from "@/components/common/KpiStrip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ROLE_LABELS, ROLE_COLORS_LEGACY } from "@/lib/constants"
import { cn, formatDate, getUserInitials, getAvatarColor, toError } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDetail {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  department?: string | null
  hourlyRate?: number | null
  createdAt: string
  updatedAt: string
}

interface RelatedProject {
  id: string
  name: string
  status?: string
  code?: string
}

interface TaskRow {
  id: string
  title: string
  status: string
  taskType: string
  targetEndDate?: string | null
  project?: { id: string; name: string } | null
}

// ─── Panoramica Tab ────────────────────────────────────────────────────────────

function PanoramicaTab({ user }: { user: UserDetail }) {
  return (
    <motion.div
      className="space-y-5 pt-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Profile section */}
      <Card>
        <CardContent className="p-4 space-y-0 divide-y divide-border">
          <MetaRow icon={Mail} label="Email">
            <a
              href={`mailto:${user.email}`}
              className="text-primary hover:underline flex items-center gap-1"
            >
              {user.email}
              <ExternalLink className="h-3 w-3" />
            </a>
          </MetaRow>
          {user.department && (
            <MetaRow icon={Building2} label="Reparto">
              <span className="text-foreground">{user.department}</span>
            </MetaRow>
          )}
          <MetaRow label="Ruolo">
            <Badge
              variant="secondary"
              className={cn("text-[10px] font-bold uppercase tracking-wide", ROLE_COLORS_LEGACY[user.role])}
            >
              {ROLE_LABELS[user.role] ?? user.role}
            </Badge>
          </MetaRow>
          <MetaRow label="Stato account">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  user.isActive ? "bg-green-500" : "bg-slate-400"
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  user.isActive
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                )}
              >
                {user.isActive ? "Attivo" : "Inattivo"}
              </span>
            </div>
          </MetaRow>
          {user.hourlyRate != null && (
            <MetaRow icon={Euro} label="Tariffa oraria">
              <span className="font-mono text-foreground">
                €{user.hourlyRate.toFixed(2)}/h
              </span>
            </MetaRow>
          )}
          <MetaRow icon={CalendarDays} label="Creato il">
            <span className="text-muted-foreground">{formatDate(user.createdAt)}</span>
          </MetaRow>
          <MetaRow icon={CalendarDays} label="Aggiornato il">
            <span className="text-muted-foreground">{formatDate(user.updatedAt)}</span>
          </MetaRow>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Progetti Tab ──────────────────────────────────────────────────────────────

function ProgettiTab({ userId }: { userId: string }) {
  const { data: relatedData, isLoading } = useRelatedQuery("user", userId, ["projects"])
  const projects = (relatedData?.projects ?? []) as RelatedProject[]

  if (isLoading) {
    return (
      <div className="pt-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={FolderKanban}
          title="Nessun progetto"
          description="Questo utente non è membro di nessun progetto."
        />
      </div>
    )
  }

  return (
    <motion.div
      className="pt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <div className="divide-y divide-border">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group"
            >
              <FolderKanban className="h-4 w-4 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {project.name}
                </p>
                {project.code && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {project.code}
                  </p>
                )}
              </div>
              {project.status && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {project.status}
                </Badge>
              )}
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}

// ─── Task Tab ──────────────────────────────────────────────────────────────────

function TaskTab({ userId }: { userId: string }) {
  const { data, isLoading } = useTaskListQuery({ assigneeId: userId, limit: 50 })
  const tasks = (data?.data ?? []) as TaskRow[]

  if (isLoading) {
    return (
      <div className="pt-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={CheckSquare}
          title="Nessun task assegnato"
          description="Questo utente non ha task assegnati."
        />
      </div>
    )
  }

  return (
    <motion.div
      className="pt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group"
            >
              <StatusDot status={task.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {task.title}
                </p>
                {task.project && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {task.project.name}
                  </p>
                )}
              </div>
              {task.targetEndDate && (
                <DeadlineCell dueDate={task.targetEndDate} status={task.status} />
              )}
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: "user", entityId: id })
  const navigate = useNavigate()
  const { isAdmin } = usePrivilegedRole()

  const { data: user, isLoading, error } = useUserQuery(id ?? "")
  const deleteUser = useDeleteUser()

  const fullName = user ? `${user.firstName} ${user.lastName}` : "Utente"
  const initials = user ? getUserInitials(user.firstName, user.lastName) : "?"
  const avatarBg = user ? getAvatarColor(`${user.firstName}${user.lastName}`) : "bg-muted"

  // Guard: non-admin
  if (!isAdmin && !isLoading) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Accesso non autorizzato"
        description="Solo gli amministratori possono visualizzare i dettagli utente."
      />
    )
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteUser.mutateAsync(id)
      toast.success("Utente eliminato")
      navigate("/admin/users")
    } catch {
      toast.error("Errore nell'eliminazione dell'utente")
    }
  }

  // KPI row
  const kpiCards = useMemo<KpiCard[]>(() => {
    if (!user) return []
    return [
      {
        label: "Ruolo",
        value: ROLE_LABELS[user.role] ?? user.role,
        color: user.role === "admin" ? "danger" : user.role === "direzione" ? "project" : "task",
      },
      {
        label: "Stato",
        value: user.isActive ? "Attivo" : "Inattivo",
        color: user.isActive ? "success" : "warning",
      },
      {
        label: "Tariffa",
        value: user.hourlyRate != null ? `€${user.hourlyRate.toFixed(2)}/h` : "—",
        color: "indigo",
        icon: Euro,
      },
      {
        label: "Membro dal",
        value: formatDate(user.createdAt),
        color: "task",
        icon: CalendarDays,
      },
    ]
  }, [user])

  // Header badges
  const badges = user ? (
    <>
      <Badge
        variant="secondary"
        className={cn("text-[10px] font-bold uppercase tracking-wide", ROLE_COLORS_LEGACY[user.role])}
      >
        {ROLE_LABELS[user.role] ?? user.role}
      </Badge>
      <Badge
        variant="secondary"
        className={cn(
          "text-[10px] font-semibold",
          user.isActive
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            : "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400"
        )}
      >
        {user.isActive ? "Attivo" : "Inattivo"}
      </Badge>
    </>
  ) : null

  // Header actions
  const headerActions = isAdmin && id ? (
    <Button asChild variant="outline" size="sm">
      <Link to={`/admin/users/${id}/edit`}>
        <Pencil className="h-4 w-4 mr-1.5" />
        Modifica
      </Link>
    </Button>
  ) : null

  // Sidebar
  const sidebar = user ? (
    <div className="space-y-4">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 py-2">
        <Avatar className="h-16 w-16">
          <AvatarFallback className={cn("text-lg font-bold text-white", avatarBg)}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="font-semibold text-foreground">{fullName}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Separator />

      {/* Meta */}
      <div className="space-y-0 divide-y divide-border/50">
        <MetaRow icon={Mail} label="Email">
          <a href={`mailto:${user.email}`} className="text-primary text-xs hover:underline truncate max-w-[120px] block">
            {user.email}
          </a>
        </MetaRow>
        {user.department && (
          <MetaRow icon={Building2} label="Reparto">
            <span className="text-xs text-foreground">{user.department}</span>
          </MetaRow>
        )}
        <MetaRow label="Stato">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                user.isActive ? "bg-green-500" : "bg-slate-400"
              )}
            />
            <span
              className={cn(
                "text-xs font-medium",
                user.isActive
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
              )}
            >
              {user.isActive ? "Attivo" : "Inattivo"}
            </span>
          </div>
        </MetaRow>
        {user.hourlyRate != null && (
          <MetaRow icon={Euro} label="Tariffa">
            <span className="text-xs font-mono text-foreground">
              €{user.hourlyRate.toFixed(2)}/h
            </span>
          </MetaRow>
        )}
        <MetaRow icon={CalendarDays} label="Creazione">
          <span className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</span>
        </MetaRow>
      </div>
    </div>
  ) : null

  // Tabs
  const tabs = user
    ? [
        {
          key: "panoramica",
          label: "Panoramica",
          content: <PanoramicaTab user={user as UserDetail} />,
        },
        {
          key: "progetti",
          label: "Progetti",
          content: <ProgettiTab userId={user.id} />,
        },
        {
          key: "task",
          label: "Task",
          content: <TaskTab userId={user.id} />,
        },
        {
          key: "attivita",
          label: "Attività",
          content: (
            <div className="pt-4">
              <ActivityTab entityType="user" entityId={user.id} />
            </div>
          ),
        },
      ]
    : []

  return (
    <EntityDetail
      isLoading={isLoading}
      error={toError(error)}
      notFound={!isLoading && !error && !user}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Utenti", href: "/admin/users" },
        { label: fullName },
      ]}
      title={fullName}
      subtitle={user?.email}
      badges={badges}
      tagEditor={
        id ? (
          <TagEditor entityType="user" entityId={id} className="mt-1" />
        ) : undefined
      }
      headerActions={headerActions}
      kpiRow={kpiCards.length > 0 ? <KpiStrip cards={kpiCards} /> : undefined}
      tabs={tabs}
      sidebar={sidebar}
      onDelete={isAdmin ? handleDelete : undefined}
      isDeleting={deleteUser.isPending}
      deleteConfirmMessage={`Sei sicuro di voler eliminare l'utente "${fullName}"? Questa azione non può essere annullata.`}
    />
  )
}
