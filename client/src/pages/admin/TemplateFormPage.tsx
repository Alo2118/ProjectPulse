/**
 * Template Form Page - Create and edit project templates (admin only)
 * @module pages/admin/TemplateFormPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTemplateStore } from '@stores/templateStore'
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  LayoutTemplate,
  Plus,
  X,
  GripVertical,
} from 'lucide-react'
import { Breadcrumb } from '@components/common/Breadcrumb'

const templateSchema = z.object({
  name: z
    .string()
    .min(2, 'Il nome deve avere almeno 2 caratteri')
    .max(100, 'Il nome non può superare i 100 caratteri'),
  description: z
    .string()
    .max(1000, 'La descrizione non può superare i 1000 caratteri')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean(),
  phases: z.array(
    z.object({
      value: z.string().min(1, 'Il nome della fase non può essere vuoto').max(100),
    })
  ),
})

type TemplateFormData = z.infer<typeof templateSchema>

export default function TemplateFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTemplate, isLoading, fetchTemplate, createTemplate, updateTemplate, clearCurrentTemplate } =
    useTemplateStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isEditMode = Boolean(id)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
      phases: [],
    },
  })

  const { fields: phaseFields, append, remove } = useFieldArray({ control, name: 'phases' })

  // Load template for editing
  useEffect(() => {
    if (isEditMode && id) {
      fetchTemplate(id)
    }
    return () => clearCurrentTemplate()
  }, [id, isEditMode, fetchTemplate, clearCurrentTemplate])

  // Populate form when template loaded
  useEffect(() => {
    if (isEditMode && currentTemplate) {
      reset({
        name: currentTemplate.name,
        description: currentTemplate.description || '',
        isActive: currentTemplate.isActive,
        phases: currentTemplate.phases.map((p) => ({ value: p })),
      })
    }
  }, [isEditMode, currentTemplate, reset])

  const onSubmit = async (data: TemplateFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = {
        name: data.name,
        description: data.description || null,
        isActive: data.isActive,
        phases: data.phases.map((p) => p.value).filter(Boolean),
      }

      if (isEditMode && id) {
        await updateTemplate(id, payload)
        navigate('/admin/templates')
      } else {
        await createTemplate(payload)
        navigate('/admin/templates')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore durante il salvataggio'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state for edit mode
  if (isEditMode && isLoading && !currentTemplate) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  // Template not found
  if (isEditMode && !isLoading && !currentTemplate) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Template non trovato</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          Il template richiesto non esiste o è stato eliminato.
        </p>
        <button onClick={() => navigate('/admin/templates')} className="btn-primary">
          Torna ai Template
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Template', href: '/admin/templates' },
          { label: isEditMode ? 'Modifica Template' : 'Nuovo Template' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="flex items-center">
          <LayoutTemplate className="w-6 h-6 text-cyan-500 mr-3" />
          <h1 className="page-title">
            {isEditMode ? 'Modifica Template' : 'Nuovo Template'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <div className="card p-6 space-y-6">
          {/* Submit Error */}
          {submitError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-400">{submitError}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome Template <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={`input ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Es. Template Standard, Template Rapido..."
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Descrizione
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className={`input resize-none ${errors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Breve descrizione del template (opzionale)"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Active toggle (edit mode only) */}
          {isEditMode && (
            <div className="flex items-center gap-3">
              <input
                id="isActive"
                type="checkbox"
                {...register('isActive')}
                className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Template attivo (visibile nella selezione)
              </label>
            </div>
          )}
        </div>

        {/* Phases */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Fasi del progetto
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Definisci le fasi standard per i progetti basati su questo template
              </p>
            </div>
            <button
              type="button"
              onClick={() => append({ value: '' })}
              className="btn-secondary flex items-center"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Aggiungi fase
            </button>
          </div>

          {phaseFields.length === 0 && (
            <div className="py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nessuna fase definita. Aggiungi le fasi del ciclo di vita del progetto.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {phaseFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <div className="text-slate-400 dark:text-gray-600 cursor-grab">
                  <GripVertical className="w-4 h-4" />
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400 w-6 text-right shrink-0">
                  {index + 1}.
                </span>
                <input
                  type="text"
                  {...register(`phases.${index}.value`)}
                  className={`input flex-1 ${
                    errors.phases?.[index]?.value ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder={`Es. Pianificazione, Sviluppo, Test...`}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {errors.phases && !Array.isArray(errors.phases) && (
              <p className="text-sm text-red-500">{errors.phases.message}</p>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/admin/templates')}
            className="btn-secondary"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (!isDirty && isEditMode)}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? 'Salva Modifiche' : 'Crea Template'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
