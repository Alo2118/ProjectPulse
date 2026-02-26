/**
 * dashboardLayoutStore - Persists user widget preferences for the dashboard
 * @module stores/dashboardLayoutStore
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WidgetId =
  // Direzione widgets
  | 'traffic_light'
  | 'attention_direzione'
  | 'delivery_outlook'
  | 'team_capacity'
  | 'trend_chart'
  | 'project_health'
  // Dipendente widgets
  | 'focus_today'
  | 'attention_dipendente'
  // Shared widgets
  | 'recent_tasks'

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
  // Direzione widgets
  {
    id: 'traffic_light',
    label: 'Semaforo Generale',
    description: 'Stato complessivo dei progetti (sano/a rischio/critico)',
    visible: true,
    order: 1,
    availableTo: 'direzione',
  },
  {
    id: 'attention_direzione',
    label: 'Richiede Attenzione',
    description: 'Alert su progetti critici, team sovraccaricato, task bloccati',
    visible: true,
    order: 2,
    availableTo: 'direzione',
  },
  {
    id: 'delivery_outlook',
    label: 'Previsioni Consegna',
    description: 'Stato avanzamento progetti con previsione ritardi',
    visible: true,
    order: 3,
    availableTo: 'direzione',
  },
  {
    id: 'team_capacity',
    label: 'Capacità Team',
    description: 'Carico di lavoro del team con soglie di allerta',
    visible: true,
    order: 4,
    availableTo: 'direzione',
  },
  {
    id: 'project_health',
    label: 'Salute Progetti',
    description: 'Tabella dettagliata dello stato di ogni progetto',
    visible: true,
    order: 5,
    availableTo: 'direzione',
  },
  {
    id: 'trend_chart',
    label: 'Trend Completamento',
    description: 'Andamento task completati vs creati nel tempo',
    visible: true,
    order: 6,
    availableTo: 'direzione',
  },
  // Dipendente widgets
  {
    id: 'focus_today',
    label: 'Focus del Giorno',
    description: 'Task di oggi con timer e progresso settimanale',
    visible: true,
    order: 1,
    availableTo: 'dipendente',
  },
  {
    id: 'attention_dipendente',
    label: 'Richiede Attenzione',
    description: 'Task bloccati, scaduti o in scadenza',
    visible: true,
    order: 2,
    availableTo: 'dipendente',
  },
  // Shared widgets
  {
    id: 'recent_tasks',
    label: 'Attività Recenti',
    description: 'Lista o albero delle attività recenti',
    visible: true,
    order: 10,
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
        // Merge persisted widgets with any new defaults that might have been added
        const mergedWidgets = DEFAULT_WIDGETS.map((def) => {
          const persisted = widgets.find((w) => w.id === def.id)
          return persisted ?? def
        })
        return mergedWidgets
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
      version: 3,
      migrate: () => ({
        widgets: DEFAULT_WIDGETS,
        isCustomizing: false,
      }),
    }
  )
)
