import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BrainCircuit,
  Wand2,
  Download,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import { usePlanningStore } from '@stores/planningStore'
import { useProjectStore } from '@stores/projectStore'
import { EstimationMetricsCard } from '@components/planning/EstimationMetricsCard'
import { TeamCapacityChart } from '@components/planning/TeamCapacityChart'
import { BottleneckAlerts } from '@components/planning/BottleneckAlerts'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

export default function PlanningDashboardPage() {
  const navigate = useNavigate()
  const {
    estimationMetrics,
    teamCapacity,
    bottlenecks,
    isLoadingMetrics,
    isLoadingCapacity,
    isLoadingBottlenecks,
    fetchEstimationMetrics,
    fetchTeamCapacity,
    fetchBottlenecks,
  } = usePlanningStore()

  const { projects, fetchProjects } = useProjectStore()

  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const currentMonday = useMemo(() => {
    const mon = getMonday(new Date())
    mon.setDate(mon.getDate() + weekOffset * 7)
    return mon
  }, [weekOffset])

  const weekLabel = useMemo(() => formatWeekLabel(currentMonday), [currentMonday])

  // Load projects for bottleneck selector
  useEffect(() => {
    if (projects.length === 0) fetchProjects()
  }, [projects.length, fetchProjects])

  // Load estimation metrics once
  useEffect(() => {
    fetchEstimationMetrics()
  }, [fetchEstimationMetrics])

  // Load team capacity when week changes
  useEffect(() => {
    fetchTeamCapacity(currentMonday.toISOString().split('T')[0])
  }, [currentMonday, fetchTeamCapacity])

  // Load bottlenecks when project selection changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchBottlenecks(selectedProjectId)
    }
  }, [selectedProjectId, fetchBottlenecks])

  // Auto-select first project
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      const active = projects.find((p) => !['completed', 'cancelled'].includes(p.status))
      if (active) setSelectedProjectId(active.id)
    }
  }, [projects, selectedProjectId])

  const handleRefresh = useCallback(() => {
    fetchEstimationMetrics()
    fetchTeamCapacity(currentMonday.toISOString().split('T')[0])
    if (selectedProjectId) fetchBottlenecks(selectedProjectId)
  }, [fetchEstimationMetrics, fetchTeamCapacity, fetchBottlenecks, currentMonday, selectedProjectId])

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pianificazione
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Metriche, capacità team e ottimizzazione workflow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw className="w-4 h-4" />
            Aggiorna
          </button>
          <button
            onClick={() => navigate('/planning/wizard')}
            className="btn-primary flex items-center gap-1.5 text-sm"
          >
            <Wand2 className="w-4 h-4" />
            Pianifica Progetto
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Estimation Metrics */}
        <EstimationMetricsCard
          byUser={estimationMetrics?.byUser ?? []}
          byType={estimationMetrics?.byType ?? []}
          overall={estimationMetrics?.overall ?? { avgAccuracyRatio: 0, totalTasksAnalyzed: 0, overrunRate: 0, avgVelocity: 0 }}
          isLoading={isLoadingMetrics}
        />

        {/* Right column: Team Capacity */}
        <TeamCapacityChart
          data={teamCapacity}
          weekLabel={weekLabel}
          onPrevWeek={() => setWeekOffset((o) => o - 1)}
          onNextWeek={() => setWeekOffset((o) => o + 1)}
          isLoading={isLoadingCapacity}
        />
      </div>

      {/* Bottleneck section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {/* Project selector */}
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Analisi progetto:
            </label>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="input pr-8 text-sm min-w-[200px]"
              >
                <option value="">Seleziona progetto...</option>
                {projects
                  .filter((p) => !['completed', 'cancelled'].includes(p.status))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <BottleneckAlerts data={bottlenecks} isLoading={isLoadingBottlenecks} />
        </div>

        {/* Quick actions */}
        <div className="card p-5 space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Azioni Rapide
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/planning/wizard')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 hover:from-violet-100 hover:to-purple-100 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40">
                <Wand2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Pianifica Progetto</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Wizard guidato con template</p>
              </div>
            </button>
            <button
              onClick={handleRefresh}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Aggiorna Metriche</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ricalcola tutti i dati</p>
              </div>
            </button>
            <button
              disabled
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 opacity-60 cursor-not-allowed text-left"
            >
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Esporta Report</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Prossimamente</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
