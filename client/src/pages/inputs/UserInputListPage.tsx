/**
 * User Input List Page - Shows all user inputs with filters
 * @module pages/inputs/UserInputListPage
 */

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useUserInputStore } from '@stores/userInputStore'
import { useAuthStore } from '@stores/authStore'
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  User,
  Calendar,
} from 'lucide-react'
import {
  INPUT_STATUS_LABELS,
  INPUT_STATUS_COLORS,
  INPUT_CATEGORY_LABELS,
  INPUT_CATEGORY_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@/constants'
import UserInputFormModal from './UserInputFormModal'

export default function UserInputListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  useAuthStore()
  const { inputs, pagination, isLoading, fetchInputs, fetchMyInputs } = useUserInputStore()

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '')
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showMyInputs, setShowMyInputs] = useState(false)

  useEffect(() => {
    const filters: Record<string, string> = {}
    if (searchTerm) filters.search = searchTerm
    if (statusFilter) filters.status = statusFilter
    if (categoryFilter) filters.category = categoryFilter
    if (priorityFilter) filters.priority = priorityFilter

    const params = new URLSearchParams(filters)
    setSearchParams(params)

    const fetchFn = showMyInputs ? fetchMyInputs : fetchInputs
    fetchFn({
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      priority: priorityFilter || undefined,
      page: pagination.page,
      limit: pagination.limit,
    })
  }, [searchTerm, statusFilter, categoryFilter, priorityFilter, showMyInputs])

  const handlePageChange = (newPage: number) => {
    const fetchFn = showMyInputs ? fetchMyInputs : fetchInputs
    fetchFn({
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      priority: priorityFilter || undefined,
      page: newPage,
      limit: pagination.limit,
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (isLoading && inputs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Segnalazioni</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
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
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Cerca segnalazioni..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
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
          >
            <option value="">Tutte le categorie</option>
            <option value="bug">Bug</option>
            <option value="feature_request">Nuova funzionalità</option>
            <option value="improvement">Miglioramento</option>
            <option value="question">Domanda</option>
            <option value="other">Altro</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">Tutte le priorità</option>
            <option value="low">Bassa</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Critica</option>
          </select>
          <button
            onClick={() => setShowMyInputs(!showMyInputs)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              showMyInputs
                ? 'bg-primary-100 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {showMyInputs ? 'Le mie' : 'Tutte'}
          </button>
        </div>
      </div>

      {/* Inputs List */}
      {inputs.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageSquarePlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || statusFilter || categoryFilter || priorityFilter
              ? 'Nessuna segnalazione trovata'
              : 'Nessuna segnalazione'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
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
          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {inputs.map((input) => (
              <div
                key={input.id}
                className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                {/* Category Icon */}
                <div className="mr-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      input.category === 'bug'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : input.category === 'feature_request'
                        ? 'bg-purple-100 dark:bg-purple-900/30'
                        : input.category === 'improvement'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : input.category === 'question'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <MessageSquarePlus
                      className={`w-5 h-5 ${
                        input.category === 'bug'
                          ? 'text-red-600 dark:text-red-400'
                          : input.category === 'feature_request'
                          ? 'text-purple-600 dark:text-purple-400'
                          : input.category === 'improvement'
                          ? 'text-blue-600 dark:text-blue-400'
                          : input.category === 'question'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Input Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/inputs/${input.id}`}
                      className="text-base font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate"
                    >
                      {input.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{input.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${INPUT_CATEGORY_COLORS[input.category]}`}>
                      {INPUT_CATEGORY_LABELS[input.category]}
                    </span>
                    {input.createdBy && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <User className="w-3 h-3 mr-1" />
                        <span className="max-w-24 truncate">
                          {input.createdBy.firstName} {input.createdBy.lastName?.charAt(0)}.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Input Details */}
                <div className="flex items-center gap-4 ml-4">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(input.createdAt)}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${TASK_PRIORITY_COLORS[input.priority]}`}>
                    {TASK_PRIORITY_LABELS[input.priority]}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${INPUT_STATUS_COLORS[input.status]}`}>
                    {INPUT_STATUS_LABELS[input.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} segnalazioni
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Pagina {pagination.page} di {pagination.pages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
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
