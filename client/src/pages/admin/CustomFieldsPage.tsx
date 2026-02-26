/**
 * Custom Fields Page - Admin page to manage custom field definitions
 * @module pages/admin/CustomFieldsPage
 */

import { useEffect, useState } from 'react'
import { Settings2, Plus, Edit, Trash2, X, Check, Loader2, Globe, FolderKanban } from 'lucide-react'
import { useCustomFieldStore } from '@stores/customFieldStore'
import { useAuthStore } from '@stores/authStore'
import { useProjectStore } from '@stores/projectStore'
import { ConfirmDialog } from '@components/common/ConfirmDialog'
import { CustomFieldDefinition, CustomFieldType } from '@/types'

// ============================================================
// CONSTANTS
// ============================================================

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Testo',
  number: 'Numero',
  dropdown: 'Selezione',
  date: 'Data',
  checkbox: 'Checkbox',
}

const FIELD_TYPE_OPTIONS: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Testo' },
  { value: 'number', label: 'Numero' },
  { value: 'dropdown', label: 'Selezione (dropdown)' },
  { value: 'date', label: 'Data' },
  { value: 'checkbox', label: 'Checkbox (Sì/No)' },
]

// ============================================================
// FORM TYPES
// ============================================================

interface FieldFormData {
  name: string
  fieldType: CustomFieldType
  options: string
  projectId: string
  isRequired: boolean
  position: string
}

const emptyForm: FieldFormData = {
  name: '',
  fieldType: 'text',
  options: '',
  projectId: '',
  isRequired: false,
  position: '0',
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function CustomFieldsPage() {
  const { user } = useAuthStore()
  const { definitions, isLoading, fetchDefinitions, createDefinition, updateDefinition, deleteDefinition } =
    useCustomFieldStore()
  const { projects, fetchProjects } = useProjectStore()

  const [showInactive, setShowInactive] = useState(false)
  const [filterProjectId, setFilterProjectId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingDef, setEditingDef] = useState<CustomFieldDefinition | null>(null)
  const [formData, setFormData] = useState<FieldFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const canManage = user?.role === 'admin' || user?.role === 'direzione'

  useEffect(() => {
    void fetchDefinitions(filterProjectId || undefined, showInactive)
  }, [fetchDefinitions, filterProjectId, showInactive])

  useEffect(() => {
    void fetchProjects()
  }, [fetchProjects])

  const openCreate = () => {
    setEditingDef(null)
    setFormData(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (def: CustomFieldDefinition) => {
    setEditingDef(def)
    setFormData({
      name: def.name,
      fieldType: def.fieldType,
      options: def.options ? def.options.join('\n') : '',
      projectId: def.projectId ?? '',
      isRequired: def.isRequired,
      position: String(def.position),
    })
    setFormError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingDef(null)
    setFormData(emptyForm)
    setFormError(null)
  }

  const parseOptions = (raw: string): string[] => {
    return raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError('Il nome è obbligatorio')
      return
    }
    if (formData.fieldType === 'dropdown' && !formData.options.trim()) {
      setFormError('Per un campo selezione devi specificare almeno un\'opzione')
      return
    }
    setIsSaving(true)
    setFormError(null)

    try {
      const payload = {
        name: formData.name.trim(),
        fieldType: formData.fieldType,
        options: formData.fieldType === 'dropdown' ? parseOptions(formData.options) : undefined,
        projectId: formData.projectId || undefined,
        isRequired: formData.isRequired,
        position: parseInt(formData.position, 10) || 0,
      }

      if (editingDef) {
        await updateDefinition(editingDef.id, payload)
      } else {
        await createDefinition(payload)
      }
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (def: CustomFieldDefinition) => {
    try {
      await updateDefinition(def.id, { isActive: !def.isActive })
    } catch {
      // handled by store
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await deleteDefinition(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch {
      // handled by store
    } finally {
      setIsDeleting(false)
    }
  }

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  if (isLoading && definitions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary-600" />
            Campi Personalizzati
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Definisci campi aggiuntivi per i task, globali o specifici per progetto
          </p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Nuovo Campo
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-primary-600"
          />
          Mostra inattivi
        </label>

        <select
          value={filterProjectId}
          onChange={(e) => setFilterProjectId(e.target.value)}
          className="input text-sm w-auto"
        >
          <option value="">Tutti i campi</option>
          <option value="__global__">Solo globali</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {editingDef ? 'Modifica Campo' : 'Nuovo Campo Personalizzato'}
            </h2>
            <button onClick={closeForm} aria-label="Chiudi form" className="btn-icon">
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="es. Codice cliente"
                className="input w-full"
                maxLength={100}
              />
            </div>

            {/* Field type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.fieldType}
                onChange={(e) => setFormData((f) => ({ ...f, fieldType: e.target.value as CustomFieldType }))}
                className="input w-full"
              >
                {FIELD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Project scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ambito
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData((f) => ({ ...f, projectId: e.target.value }))}
                className="input w-full"
              >
                <option value="">Globale (tutti i progetti)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Posizione
              </label>
              <input
                type="number"
                min={0}
                value={formData.position}
                onChange={(e) => setFormData((f) => ({ ...f, position: e.target.value }))}
                className="input w-full"
              />
            </div>
          </div>

          {/* Dropdown options */}
          {formData.fieldType === 'dropdown' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Opzioni <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                  (una per riga)
                </span>
              </label>
              <textarea
                value={formData.options}
                onChange={(e) => setFormData((f) => ({ ...f, options: e.target.value }))}
                placeholder={'Opzione 1\nOpzione 2\nOpzione 3'}
                rows={4}
                className="input w-full resize-none"
              />
            </div>
          )}

          {/* Required */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isRequired}
              onChange={(e) => setFormData((f) => ({ ...f, isRequired: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-600 text-primary-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Campo obbligatorio</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={closeForm} className="btn-secondary" disabled={isSaving}>
              Annulla
            </button>
            <button onClick={handleSave} className="btn-primary flex items-center gap-2" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingDef ? 'Salva Modifiche' : 'Crea Campo'}
            </button>
          </div>
        </div>
      )}

      {/* Definitions list */}
      {definitions.length === 0 ? (
        <div className="card p-12 text-center">
          <Settings2 className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {showInactive ? 'Nessun campo trovato' : 'Nessun campo personalizzato attivo'}
          </p>
          {canManage && !showForm && (
            <button onClick={openCreate} className="mt-4 btn-primary">
              <Plus className="w-4 h-4 mr-1.5" />
              Crea il primo campo
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_100px_140px_80px_80px_120px] gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <span>Nome</span>
            <span>Tipo</span>
            <span>Ambito</span>
            <span>Richiesto</span>
            <span>Stato</span>
            <span className="text-right">Azioni</span>
          </div>

          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {definitions.map((def) => {
              const project = def.projectId ? projectMap.get(def.projectId) : null
              return (
                <li key={def.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <div className="flex flex-col sm:grid sm:grid-cols-[1fr_100px_140px_80px_80px_120px] sm:gap-4 sm:items-center gap-2">
                    {/* Name */}
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {def.name}
                      </span>
                      {def.fieldType === 'dropdown' && def.options && def.options.length > 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {def.options.slice(0, 3).join(', ')}{def.options.length > 3 ? ` +${def.options.length - 3}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Type */}
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full w-fit">
                      {FIELD_TYPE_LABELS[def.fieldType]}
                    </span>

                    {/* Scope */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      {project ? (
                        <>
                          <FolderKanban className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{project.name}</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          <span>Globale</span>
                        </>
                      )}
                    </div>

                    {/* Required */}
                    <span className={`text-xs ${def.isRequired ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      {def.isRequired ? 'Sì' : 'No'}
                    </span>

                    {/* Status */}
                    <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${def.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {def.isActive ? 'Attivo' : 'Inattivo'}
                    </span>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-1 sm:justify-end">
                        <button
                          onClick={() => handleToggleActive(def)}
                          title={def.isActive ? 'Disattiva' : 'Attiva'}
                          aria-label={def.isActive ? 'Disattiva campo' : 'Attiva campo'}
                          className="btn-icon text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {def.isActive ? (
                            <X className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(def)}
                          aria-label="Modifica campo"
                          className="btn-icon text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: def.id, name: def.name })}
                          aria-label="Elimina campo"
                          className="btn-icon text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Elimina Campo Personalizzato"
          message={`Sei sicuro di voler eliminare il campo "${deleteConfirm.name}"? Tutti i valori associati ai task verranno eliminati permanentemente.`}
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
