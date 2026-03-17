/**
 * constants.ts unit tests
 *
 * Tests key exports:
 * - STATUS_COLORS: has entries for common statuses used across the app
 * - isPrivileged: returns true for admin/direzione, false for dipendente/guest
 * - PRIVILEGED_ROLES: is a readonly tuple
 */

import { describe, it, expect } from 'vitest'
import {
  STATUS_COLORS,
  STATUS_COLORS_LEGACY,
  PRIVILEGED_ROLES,
  isPrivileged,
  TASK_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  RISK_STATUS_LABELS,
} from '../constants'

describe('STATUS_COLORS (new object format)', () => {
  it('should have entries for all task statuses', () => {
    const taskStatuses = ['todo', 'in_progress', 'review', 'blocked', 'done']
    for (const status of taskStatuses) {
      expect(STATUS_COLORS[status]).toBeDefined()
      expect(typeof STATUS_COLORS[status]).toBe('object')
      expect(STATUS_COLORS[status].bg).toBeDefined()
      expect(STATUS_COLORS[status].text).toBeDefined()
      expect(STATUS_COLORS[status].border).toBeDefined()
    }
  })

  it('should have entries for all project statuses', () => {
    const projectStatuses = ['active', 'completed', 'on_hold', 'cancelled']
    for (const status of projectStatuses) {
      expect(STATUS_COLORS[status]).toBeDefined()
    }
  })

  it('should have entries for risk statuses', () => {
    const riskStatuses = ['open', 'mitigated', 'accepted', 'closed']
    for (const status of riskStatuses) {
      expect(STATUS_COLORS[status]).toBeDefined()
    }
  })

  it('should have entries for document statuses', () => {
    const docStatuses = ['draft', 'approved', 'obsolete']
    for (const status of docStatuses) {
      expect(STATUS_COLORS[status]).toBeDefined()
    }
  })
})

describe('STATUS_COLORS_LEGACY (backward compat — Tailwind class strings)', () => {
  it('should have entries for all task statuses as strings', () => {
    const taskStatuses = ['todo', 'in_progress', 'review', 'blocked', 'done']
    for (const status of taskStatuses) {
      expect(STATUS_COLORS_LEGACY[status]).toBeDefined()
      expect(typeof STATUS_COLORS_LEGACY[status]).toBe('string')
    }
  })

  it('should contain Tailwind class patterns (bg-* text-*)', () => {
    const sample = STATUS_COLORS_LEGACY['in_progress']
    expect(sample).toMatch(/bg-/)
    expect(sample).toMatch(/text-/)
  })
})

describe('isPrivileged', () => {
  it('should return true for admin', () => {
    expect(isPrivileged('admin')).toBe(true)
  })

  it('should return true for direzione', () => {
    expect(isPrivileged('direzione')).toBe(true)
  })

  it('should return false for dipendente', () => {
    expect(isPrivileged('dipendente')).toBe(false)
  })

  it('should return false for guest', () => {
    expect(isPrivileged('guest')).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isPrivileged('')).toBe(false)
  })

  it('should return false for unknown role', () => {
    expect(isPrivileged('superadmin')).toBe(false)
  })
})

describe('PRIVILEGED_ROLES', () => {
  it('should contain exactly admin and direzione', () => {
    expect([...PRIVILEGED_ROLES]).toEqual(['admin', 'direzione'])
  })
})

describe('Label maps', () => {
  it('TASK_STATUS_LABELS should have entries for standard statuses', () => {
    expect(TASK_STATUS_LABELS['todo']).toBe('Da fare')
    expect(TASK_STATUS_LABELS['in_progress']).toBe('In corso')
    expect(TASK_STATUS_LABELS['done']).toBe('Completato')
  })

  it('PROJECT_STATUS_LABELS should have entries for project statuses', () => {
    expect(PROJECT_STATUS_LABELS['active']).toBe('Attivo')
    expect(PROJECT_STATUS_LABELS['completed']).toBe('Completato')
  })

  it('RISK_STATUS_LABELS should have entries for risk statuses', () => {
    expect(RISK_STATUS_LABELS['open']).toBe('Aperto')
    expect(RISK_STATUS_LABELS['closed']).toBe('Chiuso')
  })
})
