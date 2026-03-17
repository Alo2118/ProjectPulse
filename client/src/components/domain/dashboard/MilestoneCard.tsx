import { useNavigate } from 'react-router-dom'
import { ProgressBar } from '@/components/common/ProgressBar'
import { DeadlineBadge } from '@/components/common/DeadlineBadge'

// --- Types ---

export interface MilestoneCardData {
  id: string
  name: string
  projectName: string
  progress: number           // 0–100
  endDate: string | null
  projectColor?: string      // hex color for accent bar
  projectGradient?: string   // CSS gradient for progress fill
}

interface MilestoneCardProps {
  milestone: MilestoneCardData
}

// --- Component ---

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const navigate = useNavigate()
  const accentColor = milestone.projectColor ?? '#3b82f6'
  const gradient = milestone.projectGradient ?? 'linear-gradient(90deg,#1d4ed8,#3b82f6)'

  return (
    <div
      onClick={() => navigate(`/tasks/${milestone.id}`)}
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
      className="ms-card"
    >
      {/* Shimmer top line */}
      <div
        style={{
          content: '',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',
        }}
      />

      {/* Accent bar left */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '3px',
          background: accentColor,
        }}
      />

      {/* Content — offset left for accent bar */}
      <div style={{ paddingLeft: '8px' }}>
        {/* Header row: name + deadline badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '8px',
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
            title={milestone.name}
          >
            {milestone.name}
          </div>
          {milestone.endDate && <DeadlineBadge date={milestone.endDate} />}
        </div>

        {/* Project name */}
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginBottom: '10px',
          }}
        >
          {milestone.projectName}
        </div>

        {/* Progress bar */}
        <ProgressBar value={milestone.progress} size="thin" gradient={gradient} />

        {/* Percentage label */}
        <div
          style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            textAlign: 'right',
            marginTop: '3px',
          }}
        >
          {milestone.progress}% completato
        </div>
      </div>
    </div>
  )
}
