/**
 * Calendar Store - Zustand store for calendar view
 * @module stores/calendarStore
 */

import { create } from 'zustand'
import api from '@services/api'
import { toast } from '@stores/toastStore'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subDays,
  addDays,
  format,
} from 'date-fns'

export interface CalendarTask {
  id: string
  code: string
  title: string
  status: string
  priority: string
  taskType: string
  startDate: string | null
  dueDate: string | null
  project: { id: string; name: string } | null
  assignee: { id: string; firstName: string; lastName: string } | null
}

export interface CalendarTimeEntry {
  id: string
  startTime: string
  duration: number | null
  description: string | null
  task?: {
    id: string
    code: string
    title: string
    project: { id: string; name: string }
  }
  user?: { id: string; firstName: string; lastName: string }
}

interface CalendarFilters {
  projectId?: string
  assigneeId?: string
}

interface CalendarState {
  currentDate: Date
  viewMode: 'month' | 'week'
  dataMode: 'tasks' | 'entries'
  tasks: CalendarTask[]
  timeEntries: CalendarTimeEntry[]
  isLoading: boolean
  filters: CalendarFilters
  setCurrentDate: (date: Date) => void
  setViewMode: (mode: 'month' | 'week') => void
  setDataMode: (mode: 'tasks' | 'entries') => void
  setFilters: (filters: CalendarFilters) => void
  fetchCalendarData: () => Promise<void>
}

function getDateRange(currentDate: Date, viewMode: 'month' | 'week') {
  if (viewMode === 'month') {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    return { start: subDays(monthStart, 6), end: addDays(monthEnd, 6) }
  }
  return {
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  }
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  currentDate: new Date(),
  viewMode: 'month',
  dataMode: 'tasks',
  tasks: [],
  timeEntries: [],
  isLoading: false,
  filters: {},

  setCurrentDate: (date) => {
    set({ currentDate: date })
    get().fetchCalendarData()
  },

  setViewMode: (mode) => {
    set({ viewMode: mode })
    get().fetchCalendarData()
  },

  setDataMode: (mode) => {
    set({ dataMode: mode })
    get().fetchCalendarData()
  },

  setFilters: (filters) => {
    set({ filters })
    get().fetchCalendarData()
  },

  fetchCalendarData: async () => {
    const { currentDate, viewMode, dataMode, filters } = get()
    set({ isLoading: true })

    try {
      const { start, end } = getDateRange(currentDate, viewMode)

      if (dataMode === 'tasks') {
        const params = new URLSearchParams({
          start: start.toISOString(),
          end: end.toISOString(),
        })
        if (filters.projectId) params.append('projectId', filters.projectId)
        if (filters.assigneeId) params.append('assigneeId', filters.assigneeId)

        const response = await api.get<{ success: boolean; data: CalendarTask[] }>(
          `/tasks/calendar?${params.toString()}`
        )
        if (response.data.success) {
          set({ tasks: response.data.data, timeEntries: [] })
        }
      } else {
        // Pad date range by 1 day each side to account for UTC vs local timezone offset.
        // The backend filters with UTC boundaries (new Date("YYYY-MM-DD") = UTC midnight),
        // but the frontend groups entries by local date via isSameDay. Without padding,
        // entries near midnight local can be excluded by the backend filter.
        const params = new URLSearchParams({
          fromDate: format(subDays(start, 1), 'yyyy-MM-dd'),
          toDate: format(addDays(end, 1), 'yyyy-MM-dd'),
          limit: '500',
        })
        if (filters.projectId) params.append('projectId', filters.projectId)
        if (filters.assigneeId) params.append('userId', filters.assigneeId)

        const response = await api.get<{
          success: boolean
          data: CalendarTimeEntry[]
          pagination: unknown
        }>(`/time-entries?${params.toString()}`)

        if (response.data.success) {
          set({ timeEntries: response.data.data, tasks: [] })
        }
      }
    } catch {
      toast.error('Errore nel caricamento del calendario')
    } finally {
      set({ isLoading: false })
    }
  },
}))
