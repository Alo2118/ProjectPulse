import { useNavigate } from 'react-router-dom'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StatusBadge } from '@/components/common/StatusBadge'

// --- Types ---

export interface ProjectCardData {
  id: string
  name: string
  status: string
  progress: number           // 0–100
  taskCount: number
  milestoneCount?: number
  weeklyHours?: number
  openRisks?: number
  daysUntilDeadline?: number | null
  gradient?: string          // CSS gradient for accent bar + progress
}

interface ProjectCardProps {
  project: ProjectCardData
}

// --- Deadline label helper ---

function deadlineLabel(days: number | null | undefined): { label: string; color: string } | null {
  if (days == null) return null
  if (days < 0) return { label: `${Math.abs(days)}gg fa`, color: '#f87171' }
  if (days < 3) return { label: `${days}gg`, color: '#f87171' }
  if (days <= 14) return { label: `${days}gg`, color: '#fb923c' }
  return { label: `${days}gg`, color: 'var(--text-secondary)' }
}

// --- Component ---

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()
  const gradient = project.gradient ?? 'linear-gradient(90deg,#1d4ed8,#3b82f6)'
  const deadline = deadlineLabel(project.daysUntilDeadline)

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius)',
        padding: '14px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
      className="proj-card"
    >
      {/* Shimmer top line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',
        }}
      />

      {/* Header: name + status badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '6px',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            flex: 1,
            minWidth: 0,
            lineHeight: 1.3,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={project.name}
        >
          {project.name}
        </div>
        <StatusBadge status={project.status} size="sm" />
      </div>

      {/* Meta: task count + milestone count */}
      <div
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
        }}
      >
        <span>{project.taskCount} task aperti</span>
        {project.milestoneCount != null && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{project.milestoneCount} milestone</span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar value={project.progress} size="thin" gradient={gradient} />

      {/* Percentage */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textAlign: 'right',
          marginTop: '4px',
          color: 'var(--text-secondary)',
        }}
      >
        {project.progress}%
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {project.weeklyHours != null && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Ore sett: <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{project.weeklyHours}h</strong>
          </div>
        )}
        {project.openRisks != null && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Rischi: <strong style={{ color: project.openRisks > 1 ? '#f87171' : project.openRisks > 0 ? '#fb923c' : 'var(--text-secondary)', fontWeight: 600 }}>{project.openRisks}</strong>
          </div>
        )}
        {deadline && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Scad: <strong style={{ color: deadline.color, fontWeight: 600 }}>{deadline.label}</strong>
          </div>
        )}
      </div>

      {/* Accent bar bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: gradient,
        }}
      />
    </div>
  )
}
