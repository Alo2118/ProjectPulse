/**
 * User Input Form Modal - Create/Edit user input
 * @module pages/inputs/UserInputFormModal
 */

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useUserInputStore } from '@stores/userInputStore'
import { UserInput, InputCategory, TaskPriority } from '@/types'
import { INPUT_CATEGORY_OPTIONS, TASK_PRIORITY_OPTIONS } from '@/constants'
import { MentionTextarea } from '@components/common/MentionTextarea'

interface UserInputFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  input?: UserInput // For edit mode
}

export default function UserInputFormModal({
  isOpen,
  onClose,
  onSuccess,
  input,
}: UserInputFormModalProps) {
  const { createInput, updateInput, isLoading } = useUserInputStore()

  const [formData, setFormData] = useState({
    title: input?.title || '',
    description: input?.description || '',
    category: input?.category || ('other' as InputCategory),
    priority: input?.priority || ('medium' as TaskPriority),
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditMode = !!input

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) {
      newErrors.title = 'Il titolo è obbligatorio'
    }
    if (formData.title.length > 255) {
      newErrors.title = 'Il titolo non può superare 255 caratteri'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      if (isEditMode && input) {
        await updateInput(input.id, formData)
        // success
      } else {
        await createInput(formData)
        // success
      }
      onSuccess?.()
      onClose()
    } catch {
      // error handled by store
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-lg modal-panel">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditMode ? 'Modifica Segnalazione' : 'Nuova Segnalazione'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titolo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`input ${errors.title ? 'border-red-500' : ''}`}
                placeholder="Descrivi brevemente la segnalazione"
              />
              {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrizione
              </label>
              <MentionTextarea
                value={formData.description}
                onChange={(val) => setFormData({ ...formData, description: val })}
                minRows={4}
                placeholder="Fornisci dettagli aggiuntivi... digita @ per menzionare"
                className="input"
              />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Digita <span className="font-mono font-semibold">@</span> per menzionare un collega
              </p>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoria
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as InputCategory })
                  }
                  className="input"
                >
                  {INPUT_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priorità
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as TaskPriority })
                  }
                  className="input"
                >
                  {TASK_PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={onClose} className="btn-secondary">
                Annulla
              </button>
              <button type="submit" disabled={isLoading} className="btn-primary">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditMode ? 'Aggiornamento...' : 'Creazione...'}
                  </>
                ) : isEditMode ? (
                  'Aggiorna'
                ) : (
                  'Crea Segnalazione'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
