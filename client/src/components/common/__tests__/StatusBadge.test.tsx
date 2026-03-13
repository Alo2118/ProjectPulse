/**
 * StatusBadge component tests
 *
 * StatusBadge renders a pill or dot badge depending on the active theme.
 * Props: status (string), labels (Record<string,string>), className?, variant?
 *
 * The component reads from useThemeStore to decide variant.
 * We mock the store to control the theme in tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { StatusBadge } from '../StatusBadge'

// Mock the themeStore
vi.mock('@/stores/themeStore', () => ({
  useThemeStore: vi.fn((selector: (s: { theme: string }) => unknown) =>
    selector({ theme: 'office-classic' })
  ),
}))

const LABELS: Record<string, string> = {
  todo: 'Da fare',
  in_progress: 'In corso',
  done: 'Completato',
  blocked: 'Bloccato',
}

describe('StatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the label text for a given status', () => {
    render(<StatusBadge status="todo" labels={LABELS} />)
    expect(screen.getByText('Da fare')).toBeInTheDocument()
  })

  it('renders the raw status key when no label is found', () => {
    render(<StatusBadge status="unknown_status" labels={LABELS} />)
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })

  it('applies STATUS_COLORS class for pill variant (office-classic)', () => {
    const { container } = render(<StatusBadge status="in_progress" labels={LABELS} />)
    const badge = container.querySelector('span')
    // Should contain the bg class from STATUS_COLORS.in_progress
    expect(badge?.className).toContain('bg-blue-100')
    expect(badge?.className).toContain('text-blue-800')
  })

  it('renders dot variant when variant="dot" is forced', () => {
    const { container } = render(
      <StatusBadge status="done" labels={LABELS} variant="dot" />
    )
    // Dot variant has a nested span with h-2 w-2 rounded-full
    const dot = container.querySelector('.rounded-full')
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
})
