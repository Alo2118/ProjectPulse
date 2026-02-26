/**
 * User Input List Page - Table layout with consistent styling
 * @module pages/inputs/UserInputListPage
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUserInputStore } from '@stores/userInputStore'
import {
  Plus,
  Search,
  MessageSquarePlus,
  User,
  Calendar,
} from 'lucide-react'
import { Pagination } from '@components/common/Pagination'
import { useDebounce } from '@hooks/useDebounce'
import {
  INPUT_STATUS_LABELS,
  INPUT_STATUS_COLORS,
  INPUT_CATEGORY_LABELS,
  INPUT_CATEGORY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@/constants'
import UserInputFormModal from './UserInputFormModal'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Category icon color mapping */
function categoryIconClass(category: string): string {
  switch (category) {
    case 'bug': return 'bg-red-500/10 text-red-500'
    case 'feature_request': return 'bg-purple-500/10 text-purple-500'
    case 'improvement': return 'bg-blue-500/10 text-blue-500'
    case 'question': return 'bg-amber-500/10 text-amber-500'
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
  }
}

export default function UserInputListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { inputs, pagination, isLoading, fetchInputs, fetchMyInputs } = useUserInputStore()

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '')
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showMyInputs, setShowMyInputs] = useState(false)

  const debouncedSearch = useDebounce(searchTerm, 300)

  useEffect(() => {
    const filters: Record<string, string> = {}
    if (debouncedSearch) filters.search = debouncedSearch
    if (statusFilter) filters.status = statusFilter
    if (categoryFilter) filters.category = categoryFilter
    if (priorityFilter) filters.priority = priorityFilter

    const params = new URLSearchParams(filters)
    setSearchParams(params)

    const fetchFn = showMyInputs ? fetchMyInputs : fetchInputs
    fetchFn({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      priority: priorityFilter || undefined,
      page: pagination.page,
      limit: pagination.limit,
    })
  }, [debouncedSearch, statusFilter, categoryFilter, priorityFilter, showMyInputs])

  const handlePageChange = (newPage: number) => {
    const fetchFn = showMyInputs ? fetchMyInputs : fetchInputs
    fetchFn({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      priority: priorityFilter || undefined,
      page: newPage,
      limit: pagination.limit,
    })
  }

  if (isLoading && inputs.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-36" />
            <div className="skeleton h-4 w-56 mt-2" />
          </div>
          <div className="skeleton h-10 w-44" />
        </div>
        <div className="card p-4 flex flex-wrap gap-3">
          <div className="skeleton h-10 flex-1 min-w-64" />
          <div className="skeleton h-10 w-36" />
          <div className="skeleton h-10 w-36" />
          <div className="skeleton h-10 w-36" />
        </div>
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center px-4 py-3 gap-4">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="skeleton h-5 flex-1" />
                <div className="skeleton h-4 w-24 rounded-full" />
                <div className="skeleton h-4 w-20" />
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
          <h1 className="page-title">Segnalazioni</h1>
          <p className="page-subtitle mt-1">
            Gestisci segnalazioni e suggerimenti
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Nuova Segnalazione
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-52">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Cerca segnalazioni..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
                aria-label="Cerca segnalazioni"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
            aria-label="Filtra per stato"
          >
            <option value="">Tutti gli stati</option>
            <option value="pending">In attesa</option>
            <option value="processing">In elaborazione</option>
            <option value="resolved">Risolto</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-auto"
            aria-label="Filtra per categoria"
          >
            <option value="">Tutte le categorie</option>
            <option value="bug">Bug</option>
            <option value="feature_request">Nuova funzionalita</option>
            <option value="improvement">Miglioramento</option>
            <option value="question">Domanda</option>
            <option value="other">Altro</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-auto"
            aria-label="Filtra per priorita"
          >
            <option value="">Tutte le priorita</option>
            <option value="low">Bassa</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Critica</option>
          </select>
          <button
            type="button"
            onClick={() => setShowMyInputs(!showMyInputs)}
            className={[
              'px-3 py-2 rounded-lg border text-sm transition-colors',
              showMyInputs
                ? 'bg-cyan-100 border-cyan-500 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
            ].join(' ')}
          >
            {showMyInputs ? 'Le mie' : 'Tutte'}
          </button>
        </div>
      </div>

      {/* Inputs Table */}
      {inputs.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageSquarePlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm || statusFilter || categoryFilter || priorityFilter
              ? 'Nessuna segnalazione trovata'
              : 'Nessuna segnalazione'}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            {searchTerm || statusFilter || categoryFilter || priorityFilter
              ? 'Prova a modificare i filtri di ricerca'
              : 'Invia una nuova segnalazione o suggerimento'}
          </p>
          {!searchTerm && !statusFilter && !categoryFilter && (
            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nuova Segnalazione
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            {/* Table header */}
            <div className="px-4 py-2.5 border-b border-cyan-500/5 grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center">
              <span className="w-8" />
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Segnalazione</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium hidden sm:block">Categoria</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium hidden md:block">Data</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Priorita</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Stato</span>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {inputs.map((input, idx) => (
                <motion.div
                  key={input.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.03 }}
                  onClick={() => navigate(`/inputs/${input.id}`)}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 border-t border-cyan-500/5 hover:bg-cyan-500/5 cursor-pointer transition-colors group"
                  role="row"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/inputs/${input.id}`)
                  }}
                  aria-label={`Vai alla segnalazione ${input.title}`}
                >
                  {/* Category icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryIconClass(input.category)}`}>
                    <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
                  </div>

                  {/* Title + code + author */}
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate block group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {input.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{input.code}</span>
                      {input.createdBy && (
                        <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                          <User className="w-3 h-3" aria-hidden="true" />
                          {input.createdBy.firstName} {input.createdBy.lastName?.charAt(0)}.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category badge */}
                  <span className={`hidden sm:inline-flex text-xs px-2 py-1 rounded-full whitespace-nowrap ${INPUT_CATEGORY_COLORS[input.category]}`}>
                    {INPUT_CATEGORY_LABELS[input.category]}
                  </span>

                  {/* Date */}
                  <div className="hidden md:flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" aria-hidden="true" />
                    {formatDate(input.createdAt)}
                  </div>

                  {/* Priority */}
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${TASK_PRIORITY_COLORS[input.priority]}`}>
                    {TASK_PRIORITY_LABELS[input.priority]}
                  </span>

                  {/* Status */}
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${INPUT_STATUS_COLORS[input.status]}`}>
                    {INPUT_STATUS_LABELS[input.status]}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Footer count */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 text-xs text-slate-400">
              {pagination.total} {pagination.total === 1 ? 'segnalazione' : 'segnalazioni'}
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

      {/* Create Modal */}
      <UserInputFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false)
          const fetchFn = showMyInputs ? fetchMyInputs : fetchInputs
          fetchFn({ page: 1 })
        }}
      />
    </div>
  )
}
