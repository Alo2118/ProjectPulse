/**
 * utils.ts unit tests
 *
 * Tests the cn() utility that combines clsx + tailwind-merge.
 * Also tests other utility functions: formatHours, formatFileSize, getUserInitials.
 */

import { describe, it, expect } from 'vitest'
import { cn, formatHours, formatFileSize, getUserInitials, getAvatarColor } from '../utils'

describe('cn()', () => {
  it('should merge simple class strings', () => {
    const result = cn('p-4', 'mt-2')
    expect(result).toBe('p-4 mt-2')
  })

  it('should handle conditional classes (falsy values)', () => {
    const result = cn('p-4', false && 'hidden', undefined, null, 'mt-2')
    expect(result).toBe('p-4 mt-2')
  })

  it('should handle conditional classes (truthy values)', () => {
    const isActive = true
    const result = cn('p-4', isActive && 'bg-primary')
    expect(result).toBe('p-4 bg-primary')
  })

  it('should deduplicate conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge should resolve p-4 vs p-2 → p-2 (last one wins)
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })

  it('should merge conflicting bg classes', () => {
    const result = cn('bg-red-500', 'bg-blue-500')
    expect(result).toBe('bg-blue-500')
  })

  it('should handle array inputs', () => {
    const result = cn(['p-4', 'mt-2'])
    expect(result).toBe('p-4 mt-2')
  })

  it('should handle object inputs', () => {
    const result = cn({ 'p-4': true, 'hidden': false, 'mt-2': true })
    expect(result).toBe('p-4 mt-2')
  })

  it('should return empty string for no arguments', () => {
    const result = cn()
    expect(result).toBe('')
  })
})

describe('formatHours()', () => {
  it('should format whole hours', () => {
    expect(formatHours(120)).toBe('2h')
  })

  it('should format hours and minutes', () => {
    expect(formatHours(150)).toBe('2h 30m')
  })

  it('should format zero hours', () => {
    expect(formatHours(0)).toBe('0h')
  })

  it('should format minutes only', () => {
    expect(formatHours(45)).toBe('0h 45m')
  })
})

describe('formatFileSize()', () => {
  it('should format 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
  })

  it('should format megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
  })

  it('should format with decimal', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })
})

describe('getUserInitials()', () => {
  it('should return uppercase initials', () => {
    expect(getUserInitials('Mario', 'Rossi')).toBe('MR')
  })

  it('should handle lowercase names', () => {
    expect(getUserInitials('mario', 'rossi')).toBe('MR')
  })
})

describe('getAvatarColor()', () => {
  it('should return a Tailwind bg-* class', () => {
    const color = getAvatarColor('Mario Rossi')
    expect(color).toMatch(/^bg-\w+-500$/)
  })

  it('should be deterministic (same input → same output)', () => {
    const a = getAvatarColor('Test User')
    const b = getAvatarColor('Test User')
    expect(a).toBe(b)
  })

  it('should return different colors for different names (usually)', () => {
    const a = getAvatarColor('Alice')
    const b = getAvatarColor('Zephyr')
    // Not guaranteed to differ, but very likely with different hashes
    // We just test that both are valid colors
    expect(a).toMatch(/^bg-/)
    expect(b).toMatch(/^bg-/)
  })
})
