import { AlertTriangle, Calendar, XCircle } from 'lucide-react'
import { CheckSquare } from 'lucide-react'
import { TaskItem, type TaskItemData } from './TaskItem'

// --- Types ---

interface ColumnConfig {
  id: string
  label: string
  icon: React.ReactNode
  tasks: TaskItemData[]
  isBlocked?: boolean
}

interface TaskColumnsProps {
  urgentTasks?: TaskItemData[]     // due today / overdue
  dueSoonTasks?: TaskItemData[]    // due this week
  blockedTasks?: TaskItemData[]    // status === blocked
}

// --- Column header ---

function ColumnHeader({
  label,
  icon,
  count,
  isBlocked,
}: {
  label: string
  icon: React.ReactNode
  count: number
  isBlocked?: boolean
}) {
  return (
    <div
      style={{
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: isBlocked ? '#f87171' : 'var(--text-muted)',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
      }}
    >
      {icon}
      {label}
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: '3px',
          background: isBlocked ? 'rgba(239,68,68,0.1)' : 'var(--bg-overlay)',
          color: isBlocked ? '#f87171' : 'var(--text-secondary)',
          border: isBlocked ? '1px solid rgba(239,68,68,0.2)' : 'none',
        }}
      >
        {count}
      </span>
    </div>
  )
}

// --- Main component ---

export function TaskColumns({
  urgentTasks = [],
  dueSoonTasks = [],
  blockedTasks = [],
}: TaskColumnsProps) {
  const columns: ColumnConfig[] = [
    {
      id: 'urgent',
      label: 'Urgenti / Oggi',
      icon: <AlertTriangle size={11} />,
      tasks: urgentTasks,
    },
    {
      id: 'due-soon',
      label: 'In scadenza — questa settimana',
      icon: <Calendar size={11} />,
      tasks: dueSoonTasks,
    },
    {
      id: 'blocked',
      label: 'Bloccati',
      icon: <XCircle size={11} />,
      tasks: blockedTasks,
      isBlocked: true,
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
      }}
    >
      {columns.map((col) => (
        <div key={col.id}>
          <ColumnHeader
            label={col.label}
            icon={col.icon}
            count={col.tasks.length}
            isBlocked={col.isBlocked}
          />
          {col.tasks.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '24px 0',
                color: 'var(--text-muted)',
                fontSize: '11px',
                opacity: 0.6,
              }}
            >
              <CheckSquare size={18} style={{ opacity: 0.4 }} />
              <span>Nessun task</span>
            </div>
          ) : (
            <div>
              {col.tasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
