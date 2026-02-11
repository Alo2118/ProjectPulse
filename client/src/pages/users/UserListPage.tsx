/**
 * User List Page - Admin user management
 * @module pages/users/UserListPage
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserStore } from '@stores/userStore'
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  Mail,
  Shield,
  CircleDot,
  Edit2,
} from 'lucide-react'
import { USER_ROLE_LABELS, USER_ROLE_COLORS, USER_ROLE_OPTIONS } from '@/constants'
import { UserRole } from '@/types'

export default function UserListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { users, pagination, isLoading, fetchUsers } = useUserStore()

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('isActive') || '')

  useEffect(() => {
    const filters: Record<string, string> = {}
    if (searchTerm) filters.search = searchTerm
    if (roleFilter) filters.role = roleFilter
    if (activeFilter) filters.isActive = activeFilter

    setSearchParams(filters)

    fetchUsers({
      search: searchTerm || undefined,
      role: roleFilter || undefined,
      isActive: activeFilter || undefined,
      page: 1,
      limit: pagination.limit,
    })
  }, [searchTerm, roleFilter, activeFilter])

  const handlePageChange = (newPage: number) => {
    fetchUsers({
      search: searchTerm || undefined,
      role: roleFilter || undefined,
      isActive: activeFilter || undefined,
      page: newPage,
      limit: pagination.limit,
    })
  }

  if (isLoading && users.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Utenti</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || roleFilter || activeFilter ? 'Nessun utente trovato' : 'Nessun utente'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || roleFilter || activeFilter
              ? 'Prova a modificare i filtri di ricerca'
              : 'Crea il primo utente per iniziare'}
          </p>
        </div>
      ) : (
        <>
          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {/* Avatar */}
                <div className="mr-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 font-semibold">
                    {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/users/${u.id}/edit`}
                      className="text-base font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
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
                    <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
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
                  <span className={`flex items-center gap-1 text-xs ${u.isActive !== false ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                    <CircleDot className="w-3 h-3" />
                    {u.isActive !== false ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => navigate(`/users/${u.id}/edit`)}
                  className="ml-4 p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Modifica utente"
                >
                  <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} di{' '}
                {pagination.total} utenti
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
    </div>
  )
}
