import { Flag } from 'lucide-react'
import { MilestoneCard, type MilestoneCardData } from './MilestoneCard'

interface MilestoneGridProps {
  milestones: MilestoneCardData[]
}

export function MilestoneGrid({ milestones }: MilestoneGridProps) {
  if (milestones.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '40px 0',
          color: 'var(--text-muted)',
          fontSize: '12px',
        }}
      >
        <Flag size={24} style={{ opacity: 0.3 }} />
        <span>Nessuna milestone nei prossimi 30 giorni</span>
      </div>
    )
  }

  // We show up to 5 real cards + 1 "empty" placeholder if 5 cards
  const showPlaceholder = milestones.length === 5

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
      }}
    >
      {milestones.map((ms) => (
        <MilestoneCard key={ms.id} milestone={ms} />
      ))}

      {showPlaceholder && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            opacity: 0.5,
            cursor: 'default',
          }}
        >
          <Flag size={20} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Nessun'altra milestone nei prossimi 30gg
          </span>
        </div>
      )}
    </div>
  )
}
