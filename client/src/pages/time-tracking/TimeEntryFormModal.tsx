import { useState, useEffect } from 'react'
import { z } from 'zod'
import { X, Loader2, Save } from 'lucide-react'
import api from '@services/api'
import type { TimeEntry } from '@/types'
import TaskSearchSelect from '@components/TaskSearchSelect'

interface TimeEntryFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  entry?: TimeEntry | null
}

const formSchema = z
  .object({
    taskId: z.string().min(1, 'Seleziona un task'),
    date: z.string().min(1, 'Seleziona una data'),
    startTime: z.string().min(1, "Inserisci l'ora di inizio"),
    endTime: z.string().min(1, "Inserisci l'ora di fine"),
    description: z.string().optional(),
  })
  .refine(
    (d) => {
      const start = new Date(`${d.date}T${d.startTime}`)
      const end = new Date(`${d.date}T${d.endTime}`)
      return end > start
    },
    { message: "L'ora di fine deve essere dopo l'ora di inizio", path: ['endTime'] }
  )

type FormData = z.infer<typeof formSchema>

export default function TimeEntryFormModal({
  isOpen,
  onClose,
  onSuccess,
  entry,
}: TimeEntryFormModalProps) {
  const isEdit = !!entry

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<FormData>({
    taskId: '',
    date: today,
    startTime: '09:00',
    endTime: '10:00',
    description: '',
  })

  useEffect(() => {
    if (!isOpen) return
    setErrors({})
    setSubmitError(null)

    if (entry) {
      const start = new Date(entry.startTime)
      const end = entry.endTime ? new Date(entry.endTime) : null
      setForm({
        taskId: entry.taskId,
        date: start.toISOString().split('T')[0],
        startTime: start.toTimeString().slice(0, 5),
        endTime: end ? end.toTimeString().slice(0, 5) : '10:00',
        description: entry.description || '',
      })
    } else {
      setForm({ taskId: '', date: today, startTime: '09:00', endTime: '10:00', description: '' })
    }
  }, [isOpen, entry, today])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSubmitError(null)

    const result = formSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString()
        if (key) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    const startTime = new Date(`${form.date}T${form.startTime}:00`).toISOString()
    const endTime = new Date(`${form.date}T${form.endTime}:00`).toISOString()
    const durationMinutes = Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
    )

    setIsSubmitting(true)
    try {
      if (isEdit && entry) {
        await api.put(`/time-entries/${entry.id}`, {
          startTime,
          endTime,
          duration: durationMinutes,
          description: form.description || undefined,
        })
      } else {
        await api.post('/time-entries', {
          taskId: form.taskId,
          startTime,
          endTime,
          duration: durationMinutes,
          description: form.description || undefined,
        })
      }
      onSuccess()
      onClose()
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Errore durante il salvataggio'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEdit ? 'Modifica Registrazione' : 'Nuova Registrazione'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Task selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task *
              </label>
              {isEdit ? (
                <p className="text-sm text-gray-900 dark:text-white">
                  {entry?.task?.project?.name || '—'} - {entry?.task?.title}
                </p>
              ) : (
                <TaskSearchSelect
                  value={form.taskId}
                  onChange={(taskId) => setForm((f) => ({ ...f, taskId }))}
                />
              )}
              {errors.taskId && (
                <p className="text-sm text-red-500 mt-1">{errors.taskId}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="input"
              />
              {errors.date && <p className="text-sm text-red-500 mt-1">{errors.date}</p>}
            </div>

            {/* Start / End time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ora inizio *
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="input"
                />
                {errors.startTime && (
                  <p className="text-sm text-red-500 mt-1">{errors.startTime}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ora fine *
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="input"
                />
                {errors.endTime && (
                  <p className="text-sm text-red-500 mt-1">{errors.endTime}</p>
                )}
              </div>
            </div>

            {/* Duration preview */}
            {form.date && form.startTime && form.endTime && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Durata:{' '}
                {(() => {
                  const ms =
                    new Date(`${form.date}T${form.endTime}:00`).getTime() -
                    new Date(`${form.date}T${form.startTime}:00`).getTime()
                  if (ms <= 0) return '—'
                  const mins = Math.round(ms / 60000)
                  const h = Math.floor(mins / 60)
                  const m = mins % 60
                  return h > 0 ? `${h}h ${m}m` : `${m}m`
                })()}
              </p>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrizione
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="input"
                placeholder="Opzionale..."
              />
            </div>

            {submitError && (
              <p className="text-sm text-red-500">{submitError}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={onClose} className="btn-secondary">
                Annulla
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isEdit ? 'Salva Modifiche' : 'Registra'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
