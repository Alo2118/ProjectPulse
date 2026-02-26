/**
 * Risk List Page - Table layout with consistent styling
 * @module pages/risks/RiskListPage
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useRiskStore } from '@stores/riskStore'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import {
  Plus,
  Search,
  AlertTriangle,
  ShieldAlert,
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
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-28" />
            <div className="skeleton h-4 w-48 mt-2" />
          </div>
          <div className="skeleton h-10 w-36" />
        </div>
        <div className="card p-4 flex flex-wrap gap-3">
          <div className="skeleton h-10 flex-1 min-w-64" />
          <div className="skeleton h-10 w-48" />
          <div className="skeleton h-10 w-32" />
          <div className="skeleton h-10 w-40" />
        </div>
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center px-4 py-3 gap-4">
                <div className="skeleton w-2 h-2 rounded-full" />
                <div className="skeleton h-5 flex-1" />
                <div className="skeleton h-4 w-24 rounded-full" />
                <div className="skeleton h-4 w-24 rounded-full" />
                <div className="skeleton h-4 w-20 rounded-full" />
                <div className="skeleton h-4 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Rischi</h1>
          <p className="page-subtitle mt-1">
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
          <div className="flex-1 min-w-52">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Cerca rischi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
                aria-label="Cerca rischi"
              />
            </div>
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input w-auto"
            aria-label="Filtra per progetto"
          >
            <option value="">Tutti i progetti</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
            aria-label="Filtra per stato"
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
            aria-label="Filtra per categoria"
          >
            <option value="">Tutte le categorie</option>
            <option value="technical">Tecnico</option>
            <option value="regulatory">Normativo</option>
            <option value="resource">Risorse</option>
            <option value="schedule">Tempistiche</option>
          </select>
        </div>
      </div>

      {/* Risk Matrix (collapsible) */}
      {projectFilter && riskMatrix && (
        <div className="card">
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-cyan-500/5 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-cyan-500" />
              <span className="section-heading">Matrice di Rischio</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showMatrix ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {showMatrix && (
            <div className="px-4 pb-4">
              <p className="text-xs text-slate-400 mb-3">
                Impatto (verticale) x Probabilita (orizzontale)
              </p>
              <RiskMatrixView matrix={riskMatrix} />
            </div>
          )}
        </div>
      )}

      {/* Risks Table */}
      {risks.length === 0 ? (
        <div className="card p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm || statusFilter || categoryFilter || projectFilter
              ? 'Nessun rischio trovato'
              : 'Nessun rischio'}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
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
          <div className="card overflow-hidden">
            {/* Table header */}
            <div className="px-4 py-2.5 border-b border-cyan-500/5 grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Livello</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Rischio</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium hidden md:block">Probabilita</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium hidden md:block">Impatto</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Categoria</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Stato</span>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {risks.map((risk, idx) => {
                const riskLevel = calculateRiskLevel(risk.probability, risk.impact)
                return (
                  <motion.div
                    key={risk.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: idx * 0.03 }}
                    onClick={() => navigate(`/risks/${risk.id}`)}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 border-t border-cyan-500/5 hover:bg-cyan-500/5 cursor-pointer transition-colors group"
                    role="row"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') navigate(`/risks/${risk.id}`)
                    }}
                    aria-label={`Vai al rischio ${risk.title}`}
                  >
                    {/* Level indicator */}
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          riskLevel.label === 'high'
                            ? 'bg-red-500/10'
                            : riskLevel.label === 'medium'
                              ? 'bg-amber-500/10'
                              : 'bg-green-500/10'
                        }`}
                      >
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            riskLevel.label === 'high'
                              ? 'text-red-500'
                              : riskLevel.label === 'medium'
                                ? 'text-amber-500'
                                : 'text-green-500'
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    {/* Title + project */}
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate block group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {risk.title}
                      </span>
                      {risk.project && (
                        <span
                          className="text-xs text-slate-400 truncate block"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/projects/${risk.project!.id}`)
                          }}
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation()
                              navigate(`/projects/${risk.project!.id}`)
                            }
                          }}
                        >
                          {risk.project.name}
                        </span>
                      )}
                    </div>

                    {/* Probability */}
                    <span className="hidden md:block text-xs text-slate-400">
                      {RISK_PROBABILITY_LABELS[risk.probability]}
                    </span>

                    {/* Impact */}
                    <span className="hidden md:block text-xs text-slate-400">
                      {RISK_IMPACT_LABELS[risk.impact]}
                    </span>

                    {/* Category */}
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${RISK_CATEGORY_COLORS[risk.category]}`}>
                      {RISK_CATEGORY_LABELS[risk.category]}
                    </span>

                    {/* Status */}
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${RISK_STATUS_COLORS[risk.status]}`}>
                      {RISK_STATUS_LABELS[risk.status]}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* Footer count */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 text-xs text-slate-400">
              {pagination.total} {pagination.total === 1 ? 'rischio' : 'rischi'}
            </div>
          </div>

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
