/**
 * Risk List Page - Shows all risks with filters
 * @module pages/risks/RiskListPage
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useRiskStore } from '@stores/riskStore'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import {
  Plus,
  Search,
  AlertTriangle,
  ShieldAlert,
  User,
  Grid3X3,
  ChevronDown,
} from 'lucide-react'
import { Pagination } from '@components/common/Pagination'
import { useDebounce } from '@hooks/useDebounce'
import { RiskMatrixView } from '@components/risks/RiskMatrixView'
import {
  RISK_STATUS_LABELS,
  RISK_STATUS_COLORS,
  RISK_CATEGORY_LABELS,
  RISK_CATEGORY_COLORS,
  RISK_PROBABILITY_LABELS,
  RISK_IMPACT_LABELS,
  RISK_LEVEL_COLORS,
} from '@/constants'
import { RiskProbability, RiskImpact } from '@/types'

function calculateRiskLevel(probability: RiskProbability, impact: RiskImpact): { level: number; label: 'low' | 'medium' | 'high' } {
  const probValue = { low: 1, medium: 2, high: 3 }
  const impactValue = { low: 1, medium: 2, high: 3 }
  const level = probValue[probability] * impactValue[impact]

  let label: 'low' | 'medium' | 'high' = 'low'
  if (level <= 2) label = 'low'
  else if (level <= 4) label = 'medium'
  else label = 'high'

  return { level, label }
}

export default function RiskListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { risks, pagination, isLoading, fetchRisks, riskMatrix, fetchRiskMatrix } = useRiskStore()
  const { projects, fetchProjects } = useProjectStore()

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '')
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '')
  const [showMatrix, setShowMatrix] = useState(false)

  const debouncedSearch = useDebounce(searchTerm, 300)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    const filters: Record<string, string> = {}
    if (debouncedSearch) filters.search = debouncedSearch
    if (statusFilter) filters.status = statusFilter
    if (categoryFilter) filters.category = categoryFilter
    if (projectFilter) filters.projectId = projectFilter

    const params = new URLSearchParams(filters)
    setSearchParams(params)

    fetchRisks({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      projectId: projectFilter || undefined,
      page: pagination.page,
      limit: pagination.limit,
    })
  }, [debouncedSearch, statusFilter, categoryFilter, projectFilter])

  const handlePageChange = (newPage: number) => {
    fetchRisks({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      projectId: projectFilter || undefined,
      page: newPage,
      limit: pagination.limit,
    })
  }

  useEffect(() => {
    if (projectFilter) {
      fetchRiskMatrix(projectFilter)
    }
  }, [projectFilter, fetchRiskMatrix])

  const canManageRisks = user?.role === 'admin' || user?.role === 'direzione'

  if (isLoading && risks.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-28" />
            <div className="skeleton h-4 w-48 mt-2" />
          </div>
          <div className="skeleton h-10 w-36" />
        </div>

        {/* Filters skeleton */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-4">
            <div className="skeleton h-10 flex-1 min-w-64" />
            <div className="skeleton h-10 w-48" />
            <div className="skeleton h-10 w-32" />
            <div className="skeleton h-10 w-40" />
          </div>
        </div>

        {/* Risk list skeleton */}
        <div className="card divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center p-4 gap-4">
              <div className="skeleton w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-3/4" />
                <div className="flex gap-4">
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-4 w-24 rounded-full" />
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-16" />
                <div className="skeleton h-6 w-16 rounded-full" />
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Rischi</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Gestisci i rischi di progetto
          </p>
        </div>
        {canManageRisks && (
          <button onClick={() => navigate('/risks/new')} className="btn-primary flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nuovo Rischio</span>
            <span className="sm:hidden">Nuovo</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-0 basis-full sm:basis-auto sm:min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Cerca rischi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="input w-auto min-w-0"
            >
              <option value="">Tutti i progetti</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">Tutti gli stati</option>
              <option value="open">Aperto</option>
              <option value="mitigated">Mitigato</option>
              <option value="accepted">Accettato</option>
              <option value="closed">Chiuso</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">Tutte le categorie</option>
              <option value="technical">Tecnico</option>
              <option value="regulatory">Normativo</option>
              <option value="resource">Risorse</option>
              <option value="schedule">Tempistiche</option>
            </select>
          </div>
        </div>
      </div>

      {/* Risk Matrix */}
      {projectFilter && riskMatrix && (
        <div className="card">
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-primary-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Matrice di Rischio
              </h3>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                showMatrix ? 'rotate-180' : ''
              }`}
            />
          </button>
          {showMatrix && (
            <div className="px-4 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Impatto (verticale) × Probabilità (orizzontale)
              </p>
              <RiskMatrixView matrix={riskMatrix} />
            </div>
          )}
        </div>
      )}

      {/* Risks List */}
      {risks.length === 0 ? (
        <div className="card p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || statusFilter || categoryFilter || projectFilter
              ? 'Nessun rischio trovato'
              : 'Nessun rischio'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || statusFilter || categoryFilter || projectFilter
              ? 'Prova a modificare i filtri di ricerca'
              : 'Inizia identificando i rischi di progetto'}
          </p>
          {canManageRisks && !searchTerm && !statusFilter && !categoryFilter && (
            <button onClick={() => navigate('/risks/new')} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Crea Rischio
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {risks.map((risk) => {
              const riskLevel = calculateRiskLevel(risk.probability, risk.impact)
              return (
                <div
                  key={risk.id}
                  className="flex items-start sm:items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  {/* Risk Level Indicator */}
                  <div className="mr-3 sm:mr-4 mt-0.5 sm:mt-0 shrink-0">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                        riskLevel.label === 'high'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : riskLevel.label === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30'
                          : 'bg-green-100 dark:bg-green-900/30'
                      }`}
                    >
                      <AlertTriangle
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${
                          riskLevel.label === 'high'
                            ? 'text-red-600 dark:text-red-400'
                            : riskLevel.label === 'medium'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Risk Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/risks/${risk.id}`}
                        className="text-sm sm:text-base font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate"
                      >
                        {risk.title}
                      </Link>
                      {/* Status badge - always visible on mobile, duplicated from details on mobile */}
                      <span className={`sm:hidden text-xs px-2 py-0.5 rounded-full shrink-0 ${RISK_STATUS_COLORS[risk.status]}`}>
                        {RISK_STATUS_LABELS[risk.status]}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 mt-1 flex-wrap">
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{risk.code}</span>
                      {risk.project && (
                        <Link
                          to={`/projects/${risk.project.id}`}
                          className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:underline truncate"
                        >
                          {risk.project.name}
                        </Link>
                      )}
                      {/* Category badge - hidden on mobile to save space */}
                      <span className={`hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full ${RISK_CATEGORY_COLORS[risk.category]}`}>
                        {RISK_CATEGORY_LABELS[risk.category]}
                      </span>
                    </div>

                    {/* Mobile-only secondary info row */}
                    <div className="flex items-center gap-2 mt-1.5 sm:hidden flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_CATEGORY_COLORS[risk.category]}`}>
                        {RISK_CATEGORY_LABELS[risk.category]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${RISK_LEVEL_COLORS[riskLevel.label]}`}>
                        Livello {riskLevel.level}
                      </span>
                    </div>
                  </div>

                  {/* Risk Details - desktop only */}
                  <div className="hidden sm:flex items-center gap-4 ml-4 shrink-0">
                    {risk.owner && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <User className="w-4 h-4 mr-1 shrink-0" />
                        <span className="max-w-24 truncate">
                          {risk.owner.firstName} {risk.owner.lastName?.charAt(0)}.
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        P: {RISK_PROBABILITY_LABELS[risk.probability]}
                      </span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        I: {RISK_IMPACT_LABELS[risk.impact]}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${RISK_LEVEL_COLORS[riskLevel.label]}`}>
                      Livello {riskLevel.level}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${RISK_STATUS_COLORS[risk.status]}`}>
                      {RISK_STATUS_LABELS[risk.status]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  )
}
