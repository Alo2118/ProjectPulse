import type { ReactNode } from 'react'

// --- Types ---

export interface DomainTab {
  id: string
  label: string
  icon: ReactNode
  count?: number
  countColor?: string        // e.g. 'dtab-ms' maps to purple for milestone, etc.
}

interface DomainTabsProps {
  tabs: DomainTab[]
  activeTab: string
  onTabChange: (id: string) => void
}

// --- Color presets per domain ---

const TAB_ACTIVE_COLORS: Record<string, { text: string; bg: string; border: string; countBg: string; countText: string; countBorder: string }> = {
  ms:   { text: '#c084fc', bg: 'rgba(168,85,247,0.12)',   border: 'rgba(168,85,247,0.2)',  countBg: 'rgba(168,85,247,0.12)',  countText: '#c084fc', countBorder: 'rgba(168,85,247,0.2)' },
  cal:  { text: '#60a5fa', bg: 'rgba(59,130,246,0.1)',    border: 'rgba(59,130,246,0.2)',  countBg: 'rgba(59,130,246,0.1)',   countText: '#60a5fa', countBorder: 'rgba(59,130,246,0.2)' },
  task: { text: '#22d3ee', bg: 'rgba(34,211,238,0.1)',    border: 'rgba(34,211,238,0.2)',  countBg: 'rgba(34,211,238,0.1)',   countText: '#22d3ee', countBorder: 'rgba(34,211,238,0.2)' },
  proj: { text: '#60a5fa', bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.15)', countBg: 'rgba(59,130,246,0.08)',  countText: '#60a5fa', countBorder: 'rgba(59,130,246,0.15)' },
}

// --- Component ---

export function DomainTabs({ tabs, activeTab, onTabChange }: DomainTabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius)',
        padding: '4px',
        overflow: 'hidden',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        const activeColors = TAB_ACTIVE_COLORS[tab.id] ?? TAB_ACTIVE_COLORS.proj

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '7px 16px',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              color: isActive ? activeColors.text : 'var(--text-muted)',
              border: isActive ? `1px solid ${activeColors.border}` : '1px solid transparent',
              background: isActive ? 'var(--bg-overlay)' : 'transparent',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  minWidth: '16px',
                  textAlign: 'center',
                  background: isActive ? activeColors.countBg : 'var(--bg-overlay)',
                  color: isActive ? activeColors.countText : 'var(--text-muted)',
                  border: isActive ? `1px solid ${activeColors.countBorder}` : 'none',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
