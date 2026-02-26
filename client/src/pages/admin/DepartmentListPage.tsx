/**
 * Department List Page - Manage departments (admin only)
 * Departments are organizational units (e.g. "Qualità", "Produzione") assigned to tasks
 * as executing teams. They do NOT have system login credentials.
 * @module pages/admin/DepartmentListPage
 */

import { useEffect, useState } from 'react'
import { useDepartmentStore } from '@stores/departmentStore'
import { useAuthStore } from '@stores/authStore'
import { Building2, Plus, Edit, Trash2, X, Check, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@components/common/ConfirmDialog'
import { Department } from '@/types'

const PRESET_COLORS = [
  '#6B7280', // gray
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#06B6D4', // cyan
]

interface DeptFormData {
  name: string
  description: string
  color: string
}

const emptyForm: DeptFormData = { name: '', description: '', color: '#6B7280' }

export default function DepartmentListPage() {
  const { user } = useAuthStore()
  const { departments, isLoading, fetchDepartments, createDepartment, updateDepartment, deleteDepartment } =
    useDepartmentStore()

  const [showInactive, setShowInactive] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [formData, setFormData] = useState<DeptFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchDepartments(showInactive)
  }, [fetchDepartments, showInactive])

  const openCreate = () => {
    setEditingDept(null)
    setFormData(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (dept: Department) => {
    setEditingDept(dept)
    setFormData({ name: dept.name, description: dept.description ?? '', color: dept.color })
    setFormError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingDept(null)
    setFormData(emptyForm)
    setFormError(null)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError('Il nome è obbligatorio')
      return
    }
    setIsSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
      }
      if (editingDept) {
        await updateDepartment(editingDept.id, payload)
      } else {
        await createDepartment(payload)
      }
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (dept: Department) => {
    try {
      await updateDepartment(dept.id, { isActive: !dept.isActive })
    } catch {
      // error handled in store
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await deleteDepartment(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch {
      // error handled in store
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading && departments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="w-6 h-6 text-cyan-400" />
            Reparti
          </h1>
          <p className="mt-1 text-sm page-subtitle">
            Unità organizzative assegnate ai task come team esecutori (non richiedono accesso al sistema)
          </p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Nuovo Reparto
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600 text-cyan-600"
          />
          Mostra inattivi
        </label>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">
              {editingDept ? 'Modifica Reparto' : 'Nuovo Reparto'}
            </h2>
            <button onClick={closeForm} aria-label="Chiudi form" className="btn-icon">
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="es. Qualità"
                className="input w-full"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Descrizione
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrizione opzionale"
                className="input w-full"
                maxLength={500}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Colore
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData((f) => ({ ...f, color }))}
                  aria-label={`Colore ${color}`}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-cyan-500"
                  style={{
                    backgroundColor: color,
                    borderColor: formData.color === color ? color : 'transparent',
                    boxShadow: formData.color === color ? `0 0 0 2px white, 0 0 0 3px ${color}` : undefined,
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: formData.color + '22',
                  color: formData.color,
                  border: `1px solid ${formData.color}44`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: formData.color }} />
                {formData.name || 'Anteprima'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={closeForm} className="btn-secondary" disabled={isSaving}>
              Annulla
            </button>
            <button onClick={handleSave} className="btn-primary flex items-center gap-2" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingDept ? 'Salva Modifiche' : 'Crea Reparto'}
            </button>
          </div>
        </div>
      )}

      {/* Department List */}
      {departments.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {showInactive ? 'Nessun reparto trovato' : 'Nessun reparto attivo'}
          </p>
          {isAdmin && !showForm && (
            <button onClick={openCreate} className="mt-4 btn-primary">
              <Plus className="w-4 h-4 mr-1.5" />
              Crea il primo reparto
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-cyan-500/5">
            {departments.map((dept) => (
              <li key={dept.id} className="flex items-center gap-4 px-6 py-4 table-row-hover">
                {/* Color dot */}
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dept.color }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-800 dark:text-white text-sm">
                      {dept.name}
                    </span>
                    {!dept.isActive && (
                      <span className="text-xs bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-600/50">
                        Inattivo
                      </span>
                    )}
                  </div>
                  {dept.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {dept.description}
                    </p>
                  )}
                </div>

                {/* Actions (admin only) */}
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(dept)}
                      title={dept.isActive ? 'Disattiva' : 'Attiva'}
                      aria-label={dept.isActive ? 'Disattiva reparto' : 'Attiva reparto'}
                      className="btn-icon text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {dept.isActive ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(dept)}
                      aria-label="Modifica reparto"
                      className="btn-icon text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ id: dept.id, name: dept.name })}
                      aria-label="Elimina reparto"
                      className="btn-icon text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Elimina Reparto"
          message={`Sei sicuro di voler eliminare il reparto "${deleteConfirm.name}"? I task associati manterranno il riferimento fino a modifica manuale.`}
          confirmLabel="Elimina"
          onConfirm={handleDelete}
          onClose={() => setDeleteConfirm(null)}
          isLoading={isDeleting}
          variant="danger"
        />
      )}
    </div>
  )
}
