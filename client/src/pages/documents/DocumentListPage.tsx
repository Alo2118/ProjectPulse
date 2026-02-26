/**
 * Document List Page - Table layout with consistent styling
 * @module pages/documents/DocumentListPage
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
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

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
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
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-4 w-56 mt-2" />
          </div>
          <div className="skeleton h-10 w-40" />
        </div>
        <div className="card p-4 flex flex-wrap gap-3">
          <div className="skeleton h-10 flex-1 min-w-64" />
          <div className="skeleton h-10 w-40" />
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
                <div className="skeleton h-4 w-12" />
                <div className="skeleton h-4 w-20" />
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
          <h1 className="page-title">Documenti</h1>
          <p className="page-subtitle mt-1">
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
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-52">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Cerca documenti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
                aria-label="Cerca documenti"
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
            <option value="draft">Bozza</option>
            <option value="review">In Revisione</option>
            <option value="approved">Approvato</option>
            <option value="obsolete">Obsoleto</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-auto"
            aria-label="Filtra per tipo"
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

      {/* Documents Table */}
      {documents.length === 0 ? (
        <div className="card p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm || statusFilter || typeFilter || projectFilter
              ? 'Nessun documento trovato'
              : 'Nessun documento'}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
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
          <div className="card overflow-hidden">
            {/* Table header */}
            <div className="px-4 py-2.5 border-b border-cyan-500/5 grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 items-center">
              <span className="w-8" />
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Documento</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium hidden sm:block">Tipo</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium hidden md:block">Versione</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium hidden md:block">Dimensione</span>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Stato</span>
              <span className="w-8" />
            </div>

            {/* Table rows */}
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {documents.map((doc, idx) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.03 }}
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 items-center px-4 py-3 border-t border-cyan-500/5 hover:bg-cyan-500/5 cursor-pointer transition-colors group"
                  role="row"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/documents/${doc.id}`)
                  }}
                  aria-label={`Vai al documento ${doc.title}`}
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-500" aria-hidden="true" />
                  </div>

                  {/* Title + project */}
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate block group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {doc.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{doc.code}</span>
                      {doc.project && (
                        <span
                          className="text-xs text-slate-400 truncate"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/projects/${doc.project!.id}`)
                          }}
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation()
                              navigate(`/projects/${doc.project!.id}`)
                            }
                          }}
                        >
                          · {doc.project.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Type */}
                  <span className={`hidden sm:inline-flex text-xs px-2 py-1 rounded-full whitespace-nowrap ${DOCUMENT_TYPE_COLORS[doc.type]}`}>
                    {DOCUMENT_TYPE_LABELS[doc.type]}
                  </span>

                  {/* Version */}
                  <div className="hidden md:flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    v{doc.version}
                  </div>

                  {/* Size */}
                  <span className="hidden md:block text-xs text-slate-400">
                    {doc.filePath ? formatFileSize(doc.fileSize) : '—'}
                  </span>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${DOCUMENT_STATUS_COLORS[doc.status]}`}>
                      {DOCUMENT_STATUS_LABELS[doc.status]}
                    </span>
                    {doc.approvedBy && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" aria-label="Approvato" />
                    )}
                  </div>

                  {/* Download action */}
                  <div className="flex items-center justify-center">
                    {doc.filePath ? (
                      <a
                        href={`${import.meta.env.VITE_API_URL || '/api'}/documents/${doc.id}/download`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-slate-400 hover:text-cyan-500 transition-colors"
                        title="Scarica"
                        aria-label={`Scarica ${doc.title}`}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="w-7" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer count */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 text-xs text-slate-400">
              {pagination.total} {pagination.total === 1 ? 'documento' : 'documenti'}
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
