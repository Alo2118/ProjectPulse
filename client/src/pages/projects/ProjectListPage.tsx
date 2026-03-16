import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FolderKanban, ArrowUpDown, CheckSquare, AlertTriangle, Clock, Users } from 'lucide-react'
import { arrayMove } from '@dnd-kit/sortable'
import { useSetPageContext } from '@/hooks/ui/usePageContext'
import { EntityList, type Column, type FilterConfig } from '@/components/common/EntityList'
import { EntityRow } from '@/components/common/EntityRow'
import { TagFilter } from '@/components/common/TagFilter'
import { ProgressGradient } from '@/components/common/ProgressGradient'
import { DeadlineCell } from '@/components/common/DeadlineCell'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PhasePips, type PhasePip } from '@/components/common/PhasePips'
import { AvatarStack } from '@/components/common/AvatarStack'
import { NextActionChip } from '@/components/common/NextActionChip'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useProjectListQuery, useReorderProjects } from '@/hooks/api/useProjects'
import { useDashboardStatsQuery, useAttentionItemsQuery } from '@/hooks/api/useDashboard'
import { useStatsQuery } from '@/hooks/api/useStats'
import { usePrivilegedRole } from '@/hooks/ui/usePrivilegedRole'
import {
  PROJECT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from '@/lib/constants'
import type { KpiCard } from '@/components/common/KpiStrip'
import type { AlertItem } from '@/components/common/AlertStrip'
import type { NextAction, ContextGradient } from '@/lib/constants'
import { formatHours, formatRelative, toError } from '@/lib/utils'
import { toast } from 'sonner'

// --- Types ---

interface ProjectRow {
  id: string
  code: string
  name: string
  status: string
  priority: string
  sortOrder: number
  targetEndDate?: string | null
  phases?: string | null
  currentPhaseKey?: string | null
  owner?: { firstName: string; lastName: string } | null
  members?: Array<{ id: string; user?: { firstName: string; lastName: string } }> | null
  stats?: {
    completionPercentage?: number
    totalTasks?: number
    completedTasks?: number
    blockedTasks?: number
    openRisks?: number
  } | null
  _count?: { tasks?: number; risks?: number; milestones?: number } | null
}

// --- Helpers ---

function mapProjectPhases(p: ProjectRow): PhasePip[] {
  if (!p.phases) return []
  try {
    const parsed = JSON.parse(p.phases) as {
      phases: Array<{ key: string; label: string }>
    }
    return parsed.phases.map((ph) => ({
      key: ph.key,
      label: ph.label,
      status: (
        p.currentPhaseKey
          ? ph.key === p.currentPhaseKey
            ? 'current'
            : parsed.phases.indexOf(ph) < parsed.phases.findIndex((x) => x.key === p.currentPhaseKey)
              ? 'done'
              : 'upcoming'
          : 'upcoming'
      ) as PhasePip['status'],
    }))
  } catch {
    return []
  }
}

function getProjectNextAction(p: ProjectRow): NextAction {
  if ((p.stats?.blockedTasks ?? 0) > 0) return 'unblock'
  if ((p.stats?.openRisks ?? 0) > 0) return 'review'
  if ((p.stats?.completionPercentage ?? 0) >= 80) return 'advance'
  return 'advance'
}

function getProjectMembers(p: ProjectRow): Array<{ id: string; name: string }> {
  if (!p.members) return []
  return p.members
    .filter((m) => m.user)
    .map((m) => ({
      id: m.id,
      name: `${m.user!.firstName} ${m.user!.lastName}`,
    }))
}

// --- Columns ---

const columns: Column<ProjectRow>[] = [
  {
    key: 'name',
    header: 'Progetto',
    sortable: true,
    cell: (p) => {
      const taskCount = p.stats?.totalTasks ?? p._count?.tasks ?? 0
      const milestoneCount = p._count?.milestones ?? 0
      const riskCount = p.stats?.openRisks ?? p._count?.risks ?? 0

      return (
        <div className="min-w-0 py-0.5">
          <div className="text-[13px] font-semibold truncate leading-snug">{p.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-data">{milestoneCount} milestone</span>
            <span aria-hidden>·</span>
            <span className="text-data">{taskCount} task</span>
            {riskCount > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="text-data text-warning">{riskCount} rischi</span>
              </>
            )}
          </div>
        </div>
      )
    },
  },
  {
    key: 'status',
    header: 'Stato',
    sortable: true,
    className: 'w-[120px]',
    cell: (p) => <StatusBadge status={p.status} labels={PROJECT_STATUS_LABELS} />,
  },
  {
    key: 'progress',
    header: 'Avanzamento',
    className: 'w-[160px]',
    cell: (p) => {
      const pct = p.stats?.completionPercentage ?? 0
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-data text-[11px] text-muted-foreground">{pct}%</span>
          </div>
          <ProgressGradient value={pct} context="project" />
        </div>
      )
    },
  },
  {
    key: 'phases',
    header: 'Fasi',
    className: 'w-[140px]',
    cell: (p) => {
      const phases = mapProjectPhases(p)
      if (phases.length === 0) return <span className="text-xs text-muted-foreground">—</span>
      const currentPhase = phases.find((ph) => ph.status === 'current')
      return <PhasePips phases={phases} compact currentLabel={currentPhase?.label} />
    },
  },
  {
    key: 'team',
    header: 'Team',
    className: 'w-[100px]',
    cell: (p) => {
      const members = getProjectMembers(p)
      if (members.length === 0) return <span className="text-xs text-muted-foreground">—</span>
      return <AvatarStack users={members} />
    },
  },
  {
    key: 'targetEndDate',
    header: 'Scadenza',
    sortable: true,
    className: 'w-[120px]',
    cell: (p) => <DeadlineCell dueDate={p.targetEndDate} status={p.status} />,
  },
  {
    key: 'action',
    header: '',
    className: 'w-[110px]',
    cell: (p) => {
      const action = getProjectNextAction(p)
      return (
        <span onClick={(e) => e.stopPropagation()}>
          <NextActionChip action={action} onClick={() => {}} />
        </span>
      )
    },
  },
]

// --- Grid Card ---

function ProjectGridCard({ project, onClick }: { project: ProjectRow; onClick: () => void }) {
  const pct = project.stats?.completionPercentage ?? 0
  const taskCount = project.stats?.totalTasks ?? project._count?.tasks ?? 0
  const riskCount = project.stats?.openRisks ?? project._count?.risks ?? 0
  const phases = mapProjectPhases(project)
  const members = getProjectMembers(project)
  const action = getProjectNextAction(project)

  return (
    <Card
      className="card-hover card-accent-left cursor-pointer p-4 flex flex-col gap-3.5"
      style={{ ['--card-gradient' as string]: 'var(--gradient-project)' }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <h3 className="font-heading text-[15px] font-bold leading-snug tracking-tight">{project.name}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            <span className="text-data">{taskCount}</span> task
            {riskCount > 0 && (
              <> · <span className="text-data text-warning">{riskCount}</span> rischi</>
            )}
          </p>
        </div>
        <StatusBadge status={project.status} labels={PROJECT_STATUS_LABELS} />
      </div>

      {/* Progress */}
      <div className="space-y-1.5 pl-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Avanzamento</span>
          <span className="text-kpi-value text-lg">{pct}%</span>
        </div>
        <ProgressGradient value={pct} context="project" height="md" />
      </div>

      {/* Phases */}
      {phases.length > 0 && (
        <div className="pl-2">
          <p className="text-table-header mb-1">Fasi</p>
          <PhasePips phases={phases} compact={false} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-3 mt-auto">
        <div className="flex items-center gap-3">
          {members.length > 0 && <AvatarStack users={members} size="sm" />}
          {project.targetEndDate && (
            <DeadlineCell dueDate={project.targetEndDate} status={project.status} />
          )}
        </div>
        <NextActionChip action={action} onClick={() => {}} />
      </div>
    </Card>
  )
}

// --- Filters ---

const filterConfig: FilterConfig[] = [
  {
    key: 'search',
    label: 'Cerca',
    type: 'search',
    placeholder: 'Cerca progetti...',
  },
  {
    key: 'status',
    label: 'Stato',
    type: 'select',
    options: Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    key: 'priority',
    label: 'Priorità',
    type: 'select',
    options: Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
]

// --- Page Component ---

export default function ProjectListPage() {
  useSetPageContext({ domain: 'project' })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isPrivileged } = usePrivilegedRole()
  const reorderMutation = useReorderProjects()

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const filters = {
    page: searchParams.get('page') || '1',
    limit: '20',
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    sortBy: searchParams.get('sortBy') || 'sortOrder',
    sortOrder: searchParams.get('sortOrder') || 'asc',
    ...(selectedTagIds.length > 0 ? { tags: selectedTagIds.join(',') } : {}),
  }

  const isManualOrder = filters.sortBy === 'sortOrder'
  const canDrag = isManualOrder && isPrivileged

  const { data, isLoading, error } = useProjectListQuery(filters)
  const statsQuery = useDashboardStatsQuery()
  const { data: serverKpiCards } = useStatsQuery('projects')
  const { data: attentionItems } = useAttentionItemsQuery()

  const projects = (data?.data ?? []) as ProjectRow[]
  const pagination = data?.pagination as
    | { page: number; limit: number; total: number; pages: number }
    | undefined

  const stats = statsQuery.data

  // KPI strip cards — prefer server-computed, fall back to dashboard-derived
  const clientKpiCards: KpiCard[] = stats
    ? [
        {
          label: 'Progetti attivi',
          value: stats.activeProjects,
          trend: stats.activeProjectsDelta !== 0
            ? { value: `${stats.activeProjectsDelta > 0 ? '+' : ''}${stats.activeProjectsDelta}`, direction: stats.activeProjectsDelta > 0 ? 'up' : 'down' }
            : undefined,
          color: 'project' as ContextGradient,
          icon: FolderKanban,
        },
        {
          label: 'Task aperti',
          value: stats.openTasks,
          color: 'task' as ContextGradient,
          icon: CheckSquare,
        },
        {
          label: 'Ore settimana',
          value: `${formatHours(stats.weeklyHours * 60)}`,
          color: 'success' as ContextGradient,
          icon: Clock,
        },
        {
          label: 'Rischi attivi',
          value: stats.openRisks,
          subtitle: stats.criticalRisks > 0 ? `${stats.criticalRisks} critici` : undefined,
          color: 'warning' as ContextGradient,
          icon: AlertTriangle,
        },
        {
          label: 'Team',
          value: stats.teamMemberCount,
          color: 'indigo' as ContextGradient,
          icon: Users,
        },
      ]
    : []

  const kpiCards = serverKpiCards ?? (clientKpiCards.length > 0 ? clientKpiCards : undefined)

  // Alert items from attention query
  const alertItems: AlertItem[] | undefined = attentionItems
    ? attentionItems.map((item) => ({
        id: item.entityId,
        severity: (item.type === 'critical_risk' || item.type === 'blocked_task' ? 'critical' : item.type === 'due_soon' || item.type === 'milestone_at_risk' ? 'warning' : 'info') as AlertItem['severity'],
        title: item.title,
        subtitle: item.extra ?? undefined,
        projectName: item.projectName ?? undefined,
        time: item.dueDate ? formatRelative(item.dueDate) : '',
      }))
    : undefined

  // Render row for list view using EntityRow
  const renderRow = useCallback(
    (p: ProjectRow) => {
      const pct = p.stats?.completionPercentage ?? 0
      const phases = mapProjectPhases(p)
      const currentPhase = phases.find((ph) => ph.status === 'current')
      return (
        <EntityRow
          id={p.id}
          name={p.name}
          status={p.status}
          entityType="project"
          onClick={() => navigate(`/projects/${p.id}`)}
          code={p.code}
          progress={pct}
          deadline={p.targetEndDate ?? undefined}
          subtitle={currentPhase?.label}
          indicators={{
            blockedTasks: p.stats?.blockedTasks,
            openRisks: p.stats?.openRisks,
          }}
        />
      )
    },
    [navigate]
  )

  // Handlers
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== 'page') params.set('page', '1')
    setSearchParams(params)
  }

  const handleFilterClear = () => setSearchParams({})

  const handlePageChange = (page: number) =>
    handleFilterChange('page', String(page))

  const handleSort = (key: string) => {
    const newOrder =
      filters.sortBy === key && filters.sortOrder === 'asc' ? 'desc' : 'asc'
    const params = new URLSearchParams(searchParams)
    params.set('sortBy', key)
    params.set('sortOrder', newOrder)
    setSearchParams(params)
  }

  const handleResetToManualOrder = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('sortBy')
    params.delete('sortOrder')
    setSearchParams(params)
  }

  const handleReorder = (activeId: string, overId: string) => {
    const oldIndex = projects.findIndex((p) => p.id === activeId)
    const newIndex = projects.findIndex((p) => p.id === overId)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(projects, oldIndex, newIndex)
    const items = reordered.map((p, i) => ({ id: p.id, sortOrder: i }))

    reorderMutation.mutate(items, {
      onError: () => {
        toast.error('Errore nel riordinamento')
      },
    })
  }

  const manualOrderButton = !isManualOrder ? (
    <Button variant="outline" size="sm" onClick={handleResetToManualOrder}>
      <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
      Ordine manuale
    </Button>
  ) : null

  return (
    <EntityList<ProjectRow>
      title="Progetti"
      icon={FolderKanban}
      data={projects}
      pagination={pagination}
      isLoading={isLoading}
      error={toError(error)}
      columns={columns}
      getId={(p) => p.id}
      filterConfig={filterConfig}
      filters={filters}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
      sortBy={filters.sortBy}
      sortOrder={filters.sortOrder as 'asc' | 'desc'}
      onSort={handleSort}
      onPageChange={handlePageChange}
      onRowClick={(p) => navigate(`/projects/${p.id}`)}
      createHref="/projects/new"
      createLabel="Nuovo Progetto"
      emptyIcon={FolderKanban}
      emptyTitle="Nessun progetto"
      emptyDescription="Crea il tuo primo progetto"
      headerExtra={manualOrderButton}
      draggable={canDrag}
      onReorder={canDrag ? handleReorder : undefined}
      kpiStrip={kpiCards}
      alertItems={alertItems}
      renderRow={viewMode === 'list' ? renderRow : undefined}
      afterFilters={
        <TagFilter
          selectedTagIds={selectedTagIds}
          onChange={setSelectedTagIds}
        />
      }
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      gridRenderItem={(p) => (
        <ProjectGridCard
          project={p}
          onClick={() => navigate(`/projects/${p.id}`)}
        />
      )}
    />
  )
}
