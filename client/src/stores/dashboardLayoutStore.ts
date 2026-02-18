/**
 * dashboardLayoutStore - Persists user widget preferences for the dashboard
 * @module stores/dashboardLayoutStore
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WidgetId =
  | 'alerts'
  | 'today_tracking'
  | 'recent_tasks'
  | 'recent_projects'
  | 'executive_kpi'
  | 'project_health'
  | 'team_performance'
  | 'company_alerts'
  | 'advanced_kpi'

export interface WidgetConfig {
  id: WidgetId
  label: string
  description: string
  visible: boolean
  order: number
  /** Which role sees this widget: 'all' | 'direzione' | 'dipendente' */
  availableTo: 'all' | 'direzione' | 'dipendente'
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'executive_kpi',
    label: 'KPI Executive',
    description: 'Metriche aziendali aggregate',
    visible: true,
    order: 0,
    availableTo: 'direzione',
  },
  {
    id: 'project_health',
    label: 'Salute Progetti',
    description: 'Stato avanzamento per progetto',
    visible: true,
    order: 1,
    availableTo: 'direzione',
  },
  {
    id: 'team_performance',
    label: 'Performance Team',
    description: 'Top contributori e trend completamento',
    visible: true,
    order: 2,
    availableTo: 'direzione',
  },
  {
    id: 'company_alerts',
    label: 'Alert Aziendali',
    description: 'Task bloccati, rischi aperti, scadenze',
    visible: true,
    order: 3,
    availableTo: 'direzione',
  },
  {
    id: 'advanced_kpi',
    label: 'KPI Avanzati',
    description: 'Burndown, velocità team, lead time',
    visible: true,
    order: 4,
    availableTo: 'direzione',
  },
  {
    id: 'alerts',
    label: 'Attenzione Richiesta',
    description: 'Task scaduti, bloccati o in scadenza',
    visible: true,
    order: 5,
    availableTo: 'dipendente',
  },
  {
    id: 'today_tracking',
    label: 'Registro Ore Oggi',
    description: 'Timer attivo e ore della giornata',
    visible: true,
    order: 6,
    availableTo: 'dipendente',
  },
  {
    id: 'recent_tasks',
    label: 'Task Recenti',
    description: 'Task con attività nelle ultime 72 ore',
    visible: true,
    order: 7,
    availableTo: 'all',
  },
  {
    id: 'recent_projects',
    label: 'Progetti Recenti',
    description: 'Ultimi progetti acceduti',
    visible: true,
    order: 8,
    availableTo: 'all',
  },
]

interface DashboardLayoutState {
  widgets: WidgetConfig[]
  isCustomizing: boolean

  // Actions
  setCustomizing: (v: boolean) => void
  toggleWidget: (id: WidgetId) => void
  moveWidget: (id: WidgetId, direction: 'up' | 'down') => void
  resetLayout: () => void
  getVisibleWidgets: (role: 'admin' | 'direzione' | 'dipendente') => WidgetConfig[]
}

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set, get) => ({
      widgets: DEFAULT_WIDGETS,
      isCustomizing: false,

      setCustomizing: (v) => set({ isCustomizing: v }),

      toggleWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: !w.visible } : w
          ),
        })),

      moveWidget: (id, direction) =>
        set((state) => {
          const sorted = [...state.widgets].sort((a, b) => a.order - b.order)
          const idx = sorted.findIndex((w) => w.id === id)
          if (idx < 0) return state

          const swapIdx = direction === 'up' ? idx - 1 : idx + 1
          if (swapIdx < 0 || swapIdx >= sorted.length) return state

          // Swap order values
          const newWidgets = state.widgets.map((w) => {
            if (w.id === sorted[idx].id) return { ...w, order: sorted[swapIdx].order }
            if (w.id === sorted[swapIdx].id) return { ...w, order: sorted[idx].order }
            return w
          })
          return { widgets: newWidgets }
        }),

      resetLayout: () => set({ widgets: DEFAULT_WIDGETS }),

      getVisibleWidgets: (role) => {
        const { widgets } = get()
        return widgets
          .filter((w) => {
            if (w.availableTo === 'all') return true
            if (w.availableTo === 'direzione') return role === 'direzione'
            if (w.availableTo === 'dipendente') return role !== 'direzione'
            return false
          })
          .sort((a, b) => a.order - b.order)
      },
    }),
    {
      name: 'dashboard-layout',
      version: 1,
    }
  )
)
