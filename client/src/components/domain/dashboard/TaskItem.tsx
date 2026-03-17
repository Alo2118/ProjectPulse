import { useNavigate } from 'react-router-dom'
import { Shield, X } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { PRIORITY_COLORS } from '@/lib/constants'

// --- Types ---

export interface TaskItemData {
  id: string
  name: string
  priority: string           // high | medium | low
  projectName: string
  endDate: string | null
  assigneeName?: string
  status?: string
  isBlocked?: boolean
  blockReason?: string       // description of the block
  riskId?: string
  riskLabel?: string
}

interface TaskItemProps {
  task: TaskItemData
}

// --- Deadline label helper ---

function dueDateLabel(date: string): { label: string; urgency: 'urgent' | 'soon' | 'ok' } {
  const target = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const days = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (days < 0) return { label: `⏰ ${Math.abs(days)}gg fa`, urgency: 'urgent' }
  if (days === 0) return { label: '⏰ Oggi', urgency: 'urgent' }
  if (days === 1) return { label: '⏰ Domani', urgency: 'urgent' }
  if (days <= 7) return {
    label: `↑ ${target.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`,
    urgency: 'soon',
  }
  return {
    label: `↑ ${target.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`,
    urgency: 'ok',
  }
}

const URGENCY_COLORS: Record<string, string> = {
  urgent: '#f87171',
  soon: '#fb923c',
  ok: 'var(--text-muted)',
}

// --- Component ---

export function TaskItem({ task }: TaskItemProps) {
  const navigate = useNavigate()
  const prioColors = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium
  const due = task.endDate ? dueDateLabel(task.endDate) : null
  const isDone = task.status === 'done' || task.status === 'completed'

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '9px',
        padding: '9px 11px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '5px',
        background: task.isBlocked ? 'rgba(239,68,68,0.04)' : 'var(--bg-elevated)',
        border: task.isBlocked
          ? '1px solid rgba(239,68,68,0.15)'
          : '1px solid var(--border-subtle)',
        borderLeft: task.isBlocked ? '3px solid rgba(239,68,68,0.4)' : undefined,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        opacity: task.isBlocked ? 0.9 : 1,
      }}
      className="task-item"
    >
      {/* Priority bar */}
      <div
        style={{
          width: '3px',
          borderRadius: '2px',
          alignSelf: 'stretch',
          flexShrink: 0,
          background: prioColors.bar,
        }}
      />

      {/* Check icon */}
      <div
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '3px',
          border: task.isBlocked
            ? '1.5px solid rgba(239,68,68,0.4)'
            : isDone
              ? 'none'
              : '1.5px solid var(--text-muted)',
          flexShrink: 0,
          marginTop: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: task.isBlocked
            ? 'rgba(239,68,68,0.08)'
            : isDone
              ? '#16a34a'
              : 'transparent',
        }}
      >
        {task.isBlocked && <X size={9} color="#f87171" strokeWidth={2.5} />}
        {isDone && !task.isBlocked && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          opacity: isDone ? 0.5 : 1,
        }}
      >
        {/* Task name */}
        <div
          style={{
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '3px',
            color: 'var(--text-primary)',
          }}
        >
          {task.name}
        </div>

        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{task.projectName}</span>
          {due && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: URGENCY_COLORS[due.urgency] }}>
              {due.label}
            </span>
          )}
        </div>

        {/* Block reason */}
        {task.isBlocked && task.blockReason && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '5px',
              marginTop: '5px',
              padding: '4px 7px',
              background: 'rgba(239,68,68,0.06)',
              borderRadius: '4px',
              border: '1px solid rgba(239,68,68,0.12)',
            }}
          >
            <Shield size={10} style={{ flexShrink: 0, marginTop: 1, color: '#f87171' }} />
            <span style={{ fontSize: '10px', color: '#f87171', lineHeight: 1.4 }}>
              {task.blockReason}
            </span>
          </div>
        )}

        {/* Risk link */}
        {task.isBlocked && task.riskLabel && task.riskId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/risks/${task.riskId}`)
            }}
            style={{
              marginTop: '5px',
              fontSize: '10px',
              fontWeight: 600,
              color: '#fb923c',
              textDecoration: 'none',
              padding: '0 5px',
              borderRadius: '3px',
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
            }}
          >
            <Shield size={9} />
            {task.riskLabel}
          </button>
        )}
      </div>

      {/* Assignee avatar */}
      {task.assigneeName && (
        <div style={{ flexShrink: 0 }}>
          <Avatar name={task.assigneeName} size="sm" />
        </div>
      )}
    </div>
  )
}
