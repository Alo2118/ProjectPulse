import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FolderKanban, CheckSquare, AlertTriangle, Users, Flag } from 'lucide-react'
import { arrayMove } from '@dnd-kit/sortable'
import { useSetPageContext } from '@/hooks/ui/usePageContext'
import { EntityList, type Column, type FilterConfig } from '@/components/common/EntityList'
import { TagFilter } from '@/components/common/TagFilter'
import { ProgressBar } from '@/components/common/ProgressBar'
import { DeadlineCell } from '@/components/common/DeadlineCell'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PhasePills, type PhasePillItem } from '@/components/common/PhasePills'
import { AvatarStack } from '@/components/common/AvatarStack'
import { NextActionChip } from '@/components/common/NextActionChip'
import { Card } from '@/components/ui/card'
import { useProjectListQuery, useReorderProjects } from '@/hooks/api/useProjects'
import { useDashboardStatsQuery, useAttentionItemsQuery } from '@/hooks/api/useDashboard'
import { useStatsQuery } from '@/hooks/api/useStats'
import { usePrivilegedRole } from '@/hooks/ui/usePrivilegedRole'
import {
  PROJECT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  DOMAIN_COLORS,
} from '@/lib/constants'
import type { KpiCard } from '@/components/common/KpiStrip'
import type { AlertItem } from '@/components/common/AlertStrip'
import type { NextAction, ContextGradient } from '@/lib/constants'
import { formatRelative, toError } from '@/lib/utils'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

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

function mapProjectPhases(p: ProjectRow): PhasePillItem[] {
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
      ) as PhasePillItem['status'],
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

// --- Status color for left bar & progress ---

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return DOMAIN_COLORS.project.hex
    case 'on_hold': return '#eab308'
    case 'cancelled': return '#ef4444'
    case 'completed': return '#22c55e'
    default: return DOMAIN_COLORS.project.hex
  }
}

function getProgressGradient(status: string, pct: number): string {
  if (status === 'completed' || pct >= 100) return 'linear-gradient(90deg, #15803d, #22c55e)'
  if (status === 'cancelled') return 'linear-gradient(90deg, #dc2626, #ef4444)'
  if (status === 'on_hold') return 'linear-gradient(90deg, #854d0e, #eab308)'
  return DOMAIN_COLORS.project.gradient
}

// --- Project Table Row (mockup grid: 28px 1fr 130px 180px 120px 110px 80px 72px) ---

function ProjectTableRow({ project, onClick }: { project: ProjectRow; onClick: () => void }) {
  const pct = project.stats?.completionPercentage ?? 0
  const taskCount = project.stats?.totalTasks ?? project._count?.tasks ?? 0
  const completedCount = project.stats?.completedTasks ?? 0
  const milestoneCount = project._count?.milestones ?? 0
  const riskCount = project.stats?.openRisks ?? project._count?.risks ?? 0
  const phases = mapProjectPhases(project)
  const currentPhase = phases.find((ph) => ph.status === 'current')
  const members = getProjectMembers(project)
  const action = getProjectNextAction(project)
  const barColor = getStatusColor(project.status)
  const progressGradient = getProgressGradient(project.status, pct)

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '14px 16px',
        display: 'grid',
        gridTemplateColumns: '28px 1fr 130px 180px 120px 110px 80px 72px',
        alignItems: 'center',
        gap: '14px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      className="group hover:border-[rgba(45,140,240,0.3)] hover:bg-[var(--bg-elevated)]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      }}
    >
      {/* Left color bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: barColor,
          borderRadius: '3px 0 0 3px',
        }}
      />

      {/* Checkbox col */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '16px',
            height: '16px',
            border: '1px solid var(--border-default)',
            borderRadius: '3px',
            background: 'var(--bg-elevated)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
      </div>

      {/* Name + meta col */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '13px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '2px',
            color: 'var(--text-primary)',
          }}
        >
          {project.name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          {milestoneCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Flag style={{ width: '10px', height: '10px' }} />
              {milestoneCount} milestone
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <CheckSquare style={{ width: '10px', height: '10px' }} />
            {taskCount} task
          </span>
          {riskCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#fb923c' }}>
              <AlertTriangle style={{ width: '10px', height: '10px' }} />
              {riskCount} rischi
            </span>
          )}
        </div>
      </div>

      {/* Status col */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <StatusBadge status={project.status} labels={PROJECT_STATUS_LABELS} />
      </div>

      {/* Progress col */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.03em',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            {completedCount}/{taskCount} task
          </span>
          <span style={{ color: barColor, fontWeight: 600, fontSize: '11px' }}>{pct}%</span>
        </div>
        <ProgressBar value={pct} size="standard" gradient={progressGradient} />
      </div>

      {/* Phases col */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {phases.length > 0 ? (
          <>
            <PhasePills phases={phases} compact />
            {currentPhase && (
              <span
                style={{
                  fontSize: '10px',
                  color: barColor,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                ● {currentPhase.label}
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>—</span>
        )}
      </div>

      {/* Team col */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {members.length > 0 ? (
          <AvatarStack users={members} size="sm" />
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
        )}
      </div>

      {/* Deadline col */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {project.targetEndDate ? (
          <DeadlineCell dueDate={project.targetEndDate} status={project.status} />
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
        )}
      </div>

      {/* Actions col */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <NextActionChip action={action} onClick={() => {}} />
      </div>
    </motion.div>
  )
}

// --- List Header (column labels) ---

function ProjectListHeader() {
  return (
    <div
      style={{
        padding: '6px 16px',
        display: 'grid',
        gridTemplateColumns: '28px 1fr 130px 180px 120px 110px 80px 72px',
        gap: '14px',
        marginBottom: '4px',
      }}
    >
      {['', 'Progetto', 'Stato', 'Avanzamento', 'Fasi', 'Team', 'Scadenza', ''].map((label, i) => (
        <div
          key={i}
          style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

// --- Grid Card ---

function ProjectGridCard({ project, onClick }: { project: ProjectRow; onClick: () => void }) {
  const pct = project.stats?.completionPercentage ?? 0
  const taskCount = project.stats?.totalTasks ?? project._count?.tasks ?? 0
  const riskCount = project.stats?.openRisks ?? project._count?.risks ?? 0
  const phases = mapProjectPhases(project)
  const members = getProjectMembers(project)
  const action = getProjectNextAction(project)
  const barColor = getStatusColor(project.status)
  const progressGradient = getProgressGradient(project.status, pct)

  return (
    <Card
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        padding: '18px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'all 0.18s',
      }}
      className="group hover:border-[rgba(45,140,240,0.3)] hover:bg-[var(--bg-elevated)] hover:-translate-y-px hover:shadow-lg"
    >
      {/* Top shimmer line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.2px', lineHeight: 1.3, color: 'var(--text-primary)' }}>
            {project.name}
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{taskCount}</span> task
            {riskCount > 0 && (
              <> · <span style={{ color: '#fb923c' }}>{riskCount}</span> rischi</>
            )}
          </p>
        </div>
        <StatusBadge status={project.status} labels={PROJECT_STATUS_LABELS} />
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Avanzamento</span>
          <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px', color: barColor }}>
            {pct}%
          </span>
        </div>
        <ProgressBar value={pct} size="standard" gradient={progressGradient} />
      </div>

      {/* Phases */}
      {phases.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Fasi
          </p>
          <PhasePills phases={phases} compact={false} />
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {members.length > 0 && <AvatarStack users={members} size="sm" />}
          {project.targetEndDate && (
            <DeadlineCell dueDate={project.targetEndDate} status={project.status} />
          )}
        </div>
        <span onClick={(e) => e.stopPropagation()}>
          <NextActionChip action={action} onClick={() => {}} />
        </span>
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

  const { data, isLoading, error } = useProjectListQuery(filters)
  const statsQuery = useDashboardStatsQuery()
  const { data: serverKpiCards } = useStatsQuery('projects')
  const { data: attentionItems } = useAttentionItemsQuery()

  const projects = (data?.data ?? []) as ProjectRow[]
  const pagination = data?.pagination as
    | { page: number; limit: number; total: number; pages: number }
    | undefined

  const stats = statsQuery.data
  const total = pagination?.total ?? projects.length

  // KPI strip cards — prefer server-computed, fall back to dashboard-derived
  const clientKpiCards: KpiCard[] = stats
    ? [
        {
          label: 'Totale',
          value: total,
          subtitle: 'progetti',
          color: 'project' as ContextGradient,
          icon: FolderKanban,
        },
        {
          label: 'In corso',
          value: stats.activeProjects,
          trend: stats.activeProjectsDelta !== 0
            ? { value: `${stats.activeProjectsDelta > 0 ? '+' : ''}${stats.activeProjectsDelta}`, direction: stats.activeProjectsDelta > 0 ? 'up' : 'down' }
            : undefined,
          color: 'project' as ContextGradient,
          icon: FolderKanban,
        },
        {
          label: 'In ritardo',
          value: 0,
          color: 'warning' as ContextGradient,
          icon: AlertTriangle,
        },
        {
          label: 'Task aperti',
          value: stats.openTasks,
          subtitle: `su ${total} progetti`,
          color: 'task' as ContextGradient,
          icon: CheckSquare,
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

  // Handlers
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== 'page') params.set('page', '1')
    setSearchParams(params)
  }

  const handleFilterClear = () => setSearchParams({})

  const handlePageChange = (page: number) => handleFilterChange('page', String(page))

  const handleSort = (key: string) => {
    const newOrder =
      filters.sortBy === key && filters.sortOrder === 'asc' ? 'desc' : 'asc'
    const params = new URLSearchParams(searchParams)
    params.set('sortBy', key)
    params.set('sortOrder', newOrder)
    setSearchParams(params)
  }

  const handleReorder = useCallback((activeId: string, overId: string) => {
    const oldIndex = projects.findIndex((p) => p.id === activeId)
    const newIndex = projects.findIndex((p) => p.id === overId)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(projects, oldIndex, newIndex)
    const items = reordered.map((p, i) => ({ id: p.id, sortOrder: i }))

    reorderMutation.mutate(items, {
      onError: () => { toast.error('Errore nel riordinamento') },
    })
  }, [projects, reorderMutation])

  const isManualOrder = filters.sortBy === 'sortOrder'
  const canDrag = isManualOrder && isPrivileged

  return (
    <EntityList
      title="Progetti"
      icon={FolderKanban}
      data={projects}
      pagination={pagination}
      isLoading={isLoading}
      error={toError(error)}
      columns={[] as Column<ProjectRow>[]}
      getId={(p: ProjectRow) => p.id}
      filterConfig={filterConfig}
      filters={filters}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
      sortBy={filters.sortBy}
      sortOrder={filters.sortOrder as 'asc' | 'desc'}
      onSort={handleSort}
      onPageChange={handlePageChange}
      onRowClick={(p: ProjectRow) => navigate(`/projects/${p.id}`)}
      createHref="/projects/new"
      createLabel="Nuovo Progetto"
      emptyIcon={FolderKanban}
      emptyTitle="Nessun progetto"
      emptyDescription="Crea il tuo primo progetto"
      draggable={canDrag}
      onReorder={canDrag ? handleReorder : undefined}
      kpiStrip={kpiCards}
      alertItems={alertItems}
      afterFilters={
        <>
          <TagFilter
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
          {viewMode === 'list' && <ProjectListHeader />}
        </>
      }
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      // Use renderRow for list view (overrides DataTable columns rendering)
      renderRow={
        viewMode === 'list'
          ? (p: ProjectRow) => (
              <ProjectTableRow
                key={p.id}
                project={p}
                onClick={() => navigate(`/projects/${p.id}`)}
              />
            )
          : undefined
      }
      gridRenderItem={(p: ProjectRow) => (
        <ProjectGridCard
          project={p}
          onClick={() => navigate(`/projects/${p.id}`)}
        />
      )}
    />
  )
}
