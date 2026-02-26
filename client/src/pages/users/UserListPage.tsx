/**
 * User List Page - Admin user management
 * @module pages/users/UserListPage
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserStore } from '@stores/userStore'
import { useAuthStore } from '@stores/authStore'
import {
  Plus,
  Search,
  Users,
  Mail,
  Shield,
  CircleDot,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Pagination } from '@components/common/Pagination'
import { useDebounce } from '@hooks/useDebounce'
import { USER_ROLE_LABELS, USER_ROLE_COLORS, USER_ROLE_OPTIONS } from '@/constants'
import { UserRole } from '@/types'

export default function UserListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { users, pagination, isLoading, fetchUsers, hardDeleteUser } = useUserStore()
  const currentUser = useAuthStore((s) => s.user)

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('isActive') || '')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; email: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const debouncedSearch = useDebounce(searchTerm, 300)

  useEffect(() => {
    const filters: Record<string, string> = {}
    if (debouncedSearch) filters.search = debouncedSearch
    if (roleFilter) filters.role = roleFilter
    if (activeFilter) filters.isActive = activeFilter

    setSearchParams(filters)

    fetchUsers({
      search: debouncedSearch || undefined,
      role: roleFilter || undefined,
      isActive: activeFilter || undefined,
      page: 1,
      limit: pagination.limit,
    })
  }, [debouncedSearch, roleFilter, activeFilter])

  const handleHardDelete = async () => {
    if (!deleteConfirm) return
    try {
      setDeleteError(null)
      await hardDeleteUser(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setDeleteError(error.response?.data?.error || 'Errore durante l\'eliminazione')
    }
  }

  const handlePageChange = (newPage: number) => {
    fetchUsers({
      search: debouncedSearch || undefined,
      role: roleFilter || undefined,
      isActive: activeFilter || undefined,
      page: newPage,
      limit: pagination.limit,
    })
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-28" />
            <div className="skeleton h-4 w-56 mt-2" />
          </div>
          <div className="skeleton h-10 w-36" />
        </div>

        {/* Filters skeleton */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-4">
            <div className="skeleton h-10 flex-1 min-w-64" />
            <div className="skeleton h-10 w-32" />
            <div className="skeleton h-10 w-24" />
          </div>
        </div>

        {/* User list skeleton */}
        <div className="card divide-y divide-slate-200 dark:divide-slate-700">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center p-4 gap-4">
              <div className="skeleton w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-4 w-56" />
              </div>
              <div className="flex items-center gap-3">
                <div className="skeleton h-6 w-20 rounded-full" />
                <div className="skeleton h-4 w-16" />
              </div>
              <div className="flex items-center gap-2">
                <div className="skeleton w-9 h-9 rounded-lg" />
                <div className="skeleton w-9 h-9 rounded-lg" />
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
          <h1 className="page-title">Utenti</h1>
          <p className="mt-1 page-subtitle">
            Gestisci gli utenti della piattaforma
          </p>
        </div>
        <button onClick={() => navigate('/users/new')} className="btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Utente
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="Cerca per nome o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">Tutti i ruoli</option>
            {USER_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">Tutti</option>
            <option value="true">Attivi</option>
            <option value="false">Disattivati</option>
          </select>
        </div>
      </div>

      {/* User List */}
      {users.length === 0 ? (
        <div className="card p-8 text-center">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            {searchTerm || roleFilter || activeFilter ? 'Nessun utente trovato' : 'Nessun utente'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {searchTerm || roleFilter || activeFilter
              ? 'Prova a modificare i filtri di ricerca'
              : 'Crea il primo utente per iniziare'}
          </p>
        </div>
      ) : (
        <>
          <div className="card divide-y divide-slate-200 dark:divide-slate-700">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {/* Avatar */}
                <div className="mr-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 font-semibold">
                    {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/users/${u.id}/edit`}
                      className="text-base font-medium text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400"
                    >
                      {u.firstName} {u.lastName}
                    </Link>
                    {u.isActive === false && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Disattivato
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5 mr-1" />
                      {u.email}
                    </span>
                  </div>
                </div>

                {/* Role & Status */}
                <div className="flex items-center gap-3 ml-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${USER_ROLE_COLORS[u.role as UserRole]}`}>
                    <Shield className="w-3 h-3 inline mr-1" />
                    {USER_ROLE_LABELS[u.role as UserRole]}
                  </span>
                  <span className={`flex items-center gap-1 text-xs ${u.isActive !== false ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                    <CircleDot className="w-3 h-3" />
                    {u.isActive !== false ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/users/${u.id}/edit`)}
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Modifica utente"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => setDeleteConfirm({ id: u.id, email: u.email })}
                      className="p-2 rounded-lg border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Elimina permanentemente"
                    >
                      <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
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
      {/* Hard Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="modal-panel max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Eliminazione permanente
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              Stai per eliminare permanentemente l'utente:
            </p>
            <p className="font-medium text-slate-900 dark:text-white mb-4">
              {deleteConfirm.email}
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              Questa azione non può essere annullata. Tutti i dati associati (time entry, commenti, note, allegati, report) verranno eliminati.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                {deleteError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(null) }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleHardDelete}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Eliminazione...' : 'Elimina permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
