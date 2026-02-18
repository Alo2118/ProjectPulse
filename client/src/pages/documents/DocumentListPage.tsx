/**
 * Document List Page - Shows all documents with filters
 * @module pages/documents/DocumentListPage
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDocumentStore } from '@stores/documentStore'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import {
  Plus,
  Search,
  FileText,
  Download,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { Pagination } from '@components/common/Pagination'
import { useDebounce } from '@hooks/useDebounce'
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_COLORS,
} from '@/constants'

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { documents, pagination, isLoading, fetchDocuments } = useDocumentStore()
  const { projects, fetchProjects } = useProjectStore()

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '')

  const debouncedSearch = useDebounce(searchTerm, 300)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    const filters: Record<string, string> = {}
    if (debouncedSearch) filters.search = debouncedSearch
    if (statusFilter) filters.status = statusFilter
    if (typeFilter) filters.type = typeFilter
    if (projectFilter) filters.projectId = projectFilter

    const params = new URLSearchParams(filters)
    setSearchParams(params)

    fetchDocuments({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      projectId: projectFilter || undefined,
      page: pagination.page,
      limit: pagination.limit,
    })
  }, [debouncedSearch, statusFilter, typeFilter, projectFilter])

  const handlePageChange = (newPage: number) => {
    fetchDocuments({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      projectId: projectFilter || undefined,
      page: newPage,
      limit: pagination.limit,
    })
  }

  const canManageDocuments = user?.role === 'admin' || user?.role === 'direzione'

  if (isLoading && documents.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-4 w-56 mt-2" />
          </div>
          <div className="skeleton h-10 w-40" />
        </div>
        <div className="card p-4">
          <div className="flex flex-wrap gap-4">
            <div className="skeleton h-10 flex-1 min-w-64" />
            <div className="skeleton h-10 w-40" />
            <div className="skeleton h-10 w-36" />
            <div className="skeleton h-10 w-36" />
          </div>
        </div>
        <div className="card divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: 6 }).map((_, i) => (
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
              <div className="flex items-center gap-3">
                <div className="skeleton h-4 w-12" />
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-6 w-16 rounded-full" />
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Documenti</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Gestione documentale ISO 13485
          </p>
        </div>
        {canManageDocuments && (
          <button onClick={() => navigate('/documents/new')} className="btn-primary flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Documento
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Cerca documenti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input w-auto"
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
            <option value="draft">Bozza</option>
            <option value="review">In Revisione</option>
            <option value="approved">Approvato</option>
            <option value="obsolete">Obsoleto</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">Tutti i tipi</option>
            <option value="design_input">Design Input</option>
            <option value="design_output">Design Output</option>
            <option value="verification_report">Report Verifica</option>
            <option value="validation_report">Report Validazione</option>
            <option value="change_control">Change Control</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="card p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || statusFilter || typeFilter || projectFilter
              ? 'Nessun documento trovato'
              : 'Nessun documento'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || statusFilter || typeFilter || projectFilter
              ? 'Prova a modificare i filtri di ricerca'
              : 'Inizia caricando documenti di progetto'}
          </p>
          {canManageDocuments && !searchTerm && !statusFilter && !typeFilter && (
            <button onClick={() => navigate('/documents/new')} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Crea Documento
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card divide-y divide-gray-200 dark:divide-gray-700">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {/* Document Icon */}
                <div className="mr-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/documents/${doc.id}`}
                      className="text-base font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate"
                    >
                      {doc.title}
                    </Link>
                    {/* Status badge visible on mobile inline with title */}
                    <span className={`sm:hidden text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${DOCUMENT_STATUS_COLORS[doc.status]}`}>
                      {DOCUMENT_STATUS_LABELS[doc.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{doc.code}</span>
                    {doc.project && (
                      <Link
                        to={`/projects/${doc.project.id}`}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline truncate"
                      >
                        {doc.project.name}
                      </Link>
                    )}
                    <span className={`hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full ${DOCUMENT_TYPE_COLORS[doc.type]}`}>
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </span>
                  </div>
                  {/* Mobile secondary row */}
                  <div className="flex items-center gap-3 mt-1 sm:hidden">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${DOCUMENT_TYPE_COLORS[doc.type]}`}>
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(doc.createdAt)}</span>
                    {doc.filePath && (
                      <span className="text-xs text-gray-400">v{doc.version}</span>
                    )}
                  </div>
                </div>

                {/* Document Details - hidden on mobile */}
                <div className="hidden sm:flex items-center gap-4 ml-4">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    v{doc.version}
                  </div>
                  {doc.filePath && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(doc.fileSize)}
                    </span>
                  )}
                  {doc.approvedBy && (
                    <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span className="max-w-24 truncate">
                        {doc.approvedBy.firstName} {doc.approvedBy.lastName?.charAt(0)}.
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(doc.createdAt)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${DOCUMENT_STATUS_COLORS[doc.status]}`}>
                    {DOCUMENT_STATUS_LABELS[doc.status]}
                  </span>
                  {doc.filePath && (
                    <a
                      href={`${import.meta.env.VITE_API_URL || '/api'}/documents/${doc.id}/download`}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                      title="Scarica"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Download button - always visible on mobile */}
                {doc.filePath && (
                  <a
                    href={`${import.meta.env.VITE_API_URL || '/api'}/documents/${doc.id}/download`}
                    className="sm:hidden p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0"
                    title="Scarica"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
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
    </div>
  )
}
