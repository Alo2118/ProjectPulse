/**
 * StatusBadge component tests
 *
 * StatusBadge renders a badge with inline styles from STATUS_COLORS.
 * Props: status, label?, labels?, showDot?, size?, className?
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { StatusBadge } from '../StatusBadge'

const LABELS: Record<string, string> = {
  todo: 'Da fare',
  in_progress: 'In corso',
  done: 'Completato',
  blocked: 'Bloccato',
}

describe('StatusBadge', () => {
  it('renders the label text from labels prop for a given status', () => {
    render(<StatusBadge status="todo" labels={LABELS} />)
    expect(screen.getByText('Da fare')).toBeInTheDocument()
  })

  it('renders the raw status key when no label is found', () => {
    render(<StatusBadge status="unknown_status" labels={LABELS} />)
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })

  it('auto-looks up label from built-in maps when labels prop is omitted', () => {
    render(<StatusBadge status="in_progress" />)
    expect(screen.getByText('In corso')).toBeInTheDocument()
  })

  it('uses explicit label prop over auto-lookup', () => {
    render(<StatusBadge status="done" label="Finito" />)
    expect(screen.getByText('Finito')).toBeInTheDocument()
  })

  it('applies inline background color from STATUS_COLORS', () => {
    const { container } = render(<StatusBadge status="in_progress" labels={LABELS} />)
    const badge = container.querySelector('span')
    expect(badge?.style.background).toContain('rgba(59,130,246')
  })

  it('renders dot span when showDot=true', () => {
    const { container } = render(
      <StatusBadge status="done" labels={LABELS} showDot />
    )
    // Dot is a nested span with rounded-full
    const dot = container.querySelector('span.rounded-full')
    expect(dot).not.toBeNull()
    expect(screen.getByText('Completato')).toBeInTheDocument()
  })

  it('applies additional className when provided', () => {
    const { container } = render(
      <StatusBadge status="blocked" labels={LABELS} className="ml-2" />
    )
    const badge = container.querySelector('span')
    expect(badge?.className).toContain('ml-2')
  })

  it('uses sm font size class when size="sm"', () => {
    const { container } = render(<StatusBadge status="todo" size="sm" />)
    const badge = container.querySelector('span')
    expect(badge?.className).toContain('text-[10px]')
  })
})
