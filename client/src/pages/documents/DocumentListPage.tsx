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
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  CheckCircle,
  Clock,
} from 'lucide-react'
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

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    const filters: Record<string, string> = {}
    if (searchTerm) filters.search = searchTerm
    if (statusFilter) filters.status = statusFilter
    if (typeFilter) filters.type = typeFilter
    if (projectFilter) filters.projectId = projectFilter

    const params = new URLSearchParams(filters)
    setSearchParams(params)

    fetchDocuments({
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      projectId: projectFilter || undefined,
      page: pagination.page,
      limit: pagination.limit,
    })
  }, [searchTerm, statusFilter, typeFilter, projectFilter])

  const handlePageChange = (newPage: number) => {
    fetchDocuments({
      search: searchTerm || undefined,
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documenti</h1>
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
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{doc.code}</span>
                    {doc.project && (
                      <Link
                        to={`/projects/${doc.project.id}`}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {doc.project.name}
                      </Link>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${DOCUMENT_TYPE_COLORS[doc.type]}`}>
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </span>
                  </div>
                </div>

                {/* Document Details */}
                <div className="flex items-center gap-4 ml-4">
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
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} di{' '}
                {pagination.total} documenti
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
