import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// --- Types ---

export interface CalendarEvent {
  id: string
  name: string
  projectName: string
  date: string           // ISO date string
  color?: string         // hex
  daysUntil?: number
}

interface CalendarPanelProps {
  events?: CalendarEvent[]
}

// --- Day-of-week labels (Mon-first) ---

const DAY_LABELS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

// --- Days in month helper ---

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  // 0=Sunday → convert to Mon-first (0=Mon)
  const day = new Date(year, month, 1).getDay()
  return (day + 6) % 7
}

// --- Deadline badge helper ---

function daysBadge(days: number): React.CSSProperties {
  if (days < 0 || days < 3) return { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }
  if (days <= 14) return { background: 'rgba(249,115,22,0.08)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.2)' }
  return { background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }
}

// --- Component ---

export function CalendarPanel({ events = [] }: CalendarPanelProps) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1)

  // Build calendar cells
  const cells: Array<{ day: number; currentMonth: boolean; dateStr: string }> = []

  // Previous month fill
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ day: d, currentMonth: false, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  // Next month fill to complete grid (up to 42 cells = 6 rows)
  let nextDay = 1
  while (cells.length < 42) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    cells.push({ day: nextDay, currentMonth: false, dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}` })
    nextDay++
  }

  // Event dates set for quick lookup
  const eventDateMap = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const d = ev.date.slice(0, 10)
    if (!eventDateMap.has(d)) eventDateMap.set(d, [])
    eventDateMap.get(d)!.push(ev)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Group events for the panel (by date label)
  const futureEvents = events
    .filter(ev => ev.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  const groupedEvents = new Map<string, CalendarEvent[]>()
  for (const ev of futureEvents) {
    const d = ev.date.slice(0, 10)
    if (!groupedEvents.has(d)) groupedEvents.set(d, [])
    groupedEvents.get(d)!.push(ev)
  }

  function formatGroupLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', weekday: 'long' })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px' }}>
      {/* Calendar widget */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius)',
          padding: '16px',
        }}
      >
        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{
              width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {MONTHS_IT[month]} {year}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            style={{
              width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px',
              cursor: 'pointer', color: 'var(--text-muted)',
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Day labels + grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '12px' }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ fontSize: '9px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, padding: '3px 0' }}>
              {d}
            </div>
          ))}
          {cells.map((cell, idx) => {
            const evs = eventDateMap.get(cell.dateStr) ?? []
            const isToday = cell.dateStr === todayStr && cell.currentMonth
            const hasUrgent = evs.some(e => (e.daysUntil ?? 999) < 3)
            const hasEvent = evs.length > 0

            return (
              <div
                key={idx}
                style={{
                  fontSize: '11px',
                  textAlign: 'center',
                  padding: '5px 2px',
                  borderRadius: '4px',
                  cursor: hasEvent ? 'pointer' : 'default',
                  color: !cell.currentMonth
                    ? 'var(--text-muted)'
                    : isToday
                      ? '#60a5fa'
                      : 'var(--text-secondary)',
                  background: isToday ? 'rgba(59,130,246,0.2)' : 'transparent',
                  fontWeight: isToday ? 700 : 400,
                  opacity: !cell.currentMonth ? 0.35 : 1,
                  position: 'relative',
                }}
              >
                {cell.day}
                {hasEvent && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '3px',
                      height: '3px',
                      borderRadius: '50%',
                      background: hasUrgent ? '#ef4444' : '#3b82f6',
                      display: 'block',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Events panel */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          overflowY: 'auto',
          maxHeight: '360px',
        }}
      >
        {groupedEvents.size === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '24px 0' }}>
            Nessun evento in arrivo
          </div>
        ) : (
          Array.from(groupedEvents.entries()).map(([dateStr, evs]) => (
            <div key={dateStr} style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-muted)',
                marginBottom: '7px', paddingBottom: '5px',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                {formatGroupLabel(dateStr)}
              </div>
              {evs.map(ev => {
                const days = ev.daysUntil ?? 999
                const badge = daysBadge(days)
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '7px 9px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                      marginBottom: '5px', cursor: 'pointer', transition: 'border-color 0.12s',
                    }}
                  >
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: ev.color ?? '#3b82f6' }} />
                    <div style={{ flex: 1, fontSize: '12px', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {ev.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {ev.projectName}
                    </div>
                    {ev.daysUntil != null && (
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px', whiteSpace: 'nowrap', ...badge }}>
                        {days < 0 ? `${Math.abs(days)}gg fa` : days === 0 ? 'oggi' : `${days}gg`}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
