/**
 * Template List Page - Manage project templates (admin only)
 * @module pages/admin/TemplateListPage
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTemplateStore } from '@stores/templateStore'
import { useAuthStore } from '@stores/authStore'
import {
  Plus,
  LayoutTemplate,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  FolderKanban,
  Loader2,
} from 'lucide-react'
import { ConfirmDialog } from '@components/common/ConfirmDialog'

export default function TemplateListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { templates, isLoading, fetchTemplates, deleteTemplate, updateTemplate } = useTemplateStore()

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchTemplates(showInactive)
  }, [fetchTemplates, showInactive])

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await deleteTemplate(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch {
      // toast already shown by store
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async (template: { id: string; isActive: boolean }) => {
    try {
      await updateTemplate(template.id, { isActive: !template.isActive })
    } catch {
      // toast already shown
    }
  }

  if (isLoading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-cyan-500" />
            Template Progetto
          </h1>
          <p className="mt-1 page-subtitle">
            Gestisci i template riutilizzabili per la creazione di nuovi progetti
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/admin/templates/new')}
            className="btn-primary flex items-center self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Template
          </button>
        )}
      </div>

      {/* Filter toggle */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            Mostra template disattivati
          </label>
        </div>
      )}

      {/* Template Grid */}
      {templates.length === 0 ? (
        <div className="card p-12 text-center">
          <LayoutTemplate className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Nessun template disponibile
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Crea il primo template per velocizzare la creazione di nuovi progetti
          </p>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/templates/new')}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crea Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`card p-5 flex flex-col gap-3 ${
                !template.isActive ? 'opacity-60' : ''
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <LayoutTemplate className="w-5 h-5 text-cyan-500 shrink-0" />
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {template.name}
                  </h3>
                </div>
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                    template.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  }`}
                >
                  {template.isActive ? 'Attivo' : 'Disattivo'}
                </span>
              </div>

              {/* Description */}
              {template.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {template.description}
                </p>
              )}

              {/* Phases */}
              {template.phases.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Fasi ({template.phases.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {template.phases.slice(0, 4).map((phase, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
                      >
                        {phase}
                      </span>
                    ))}
                    {template.phases.length > 4 && (
                      <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">
                        +{template.phases.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 mt-auto">
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                  <FolderKanban className="w-4 h-4 mr-1" />
                  {template.projectCount} {template.projectCount === 1 ? 'progetto' : 'progetti'}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(template)}
                      title={template.isActive ? 'Disattiva' : 'Attiva'}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      {template.isActive ? (
                        <XCircle className="w-4 h-4 text-slate-500" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/admin/templates/${template.id}/edit`)}
                      title="Modifica"
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ id: template.id, name: template.name })}
                      title="Elimina"
                      disabled={template.projectCount > 0}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Elimina template"
        message={`Sei sicuro di voler eliminare il template "${deleteConfirm?.name}"? L'operazione non può essere annullata.`}
        confirmLabel="Elimina"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
