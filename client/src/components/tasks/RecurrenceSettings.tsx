/**
 * Recurrence Settings Component - Configure recurring tasks
 * @module components/tasks/RecurrenceSettings
 */

import { useState } from 'react'
import { Repeat2, X, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import api from '@services/api'

type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface RecurrencePattern {
  type: RecurrenceType
  interval: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  endAfterOccurrences?: number
  recurrenceEnd?: string
}

interface RecurrenceSettingsProps {
  taskId: string
  isRecurring?: boolean
  recurrencePattern?: RecurrencePattern | null
  onSave?: () => void
}

const DAYS_OF_WEEK = [
  { label: 'Lunedì', value: 1 },
  { label: 'Martedì', value: 2 },
  { label: 'Mercoledì', value: 3 },
  { label: 'Giovedì', value: 4 },
  { label: 'Venerdì', value: 5 },
  { label: 'Sabato', value: 6 },
  { label: 'Domenica', value: 0 },
]

export default function RecurrenceSettings({ taskId, isRecurring = false, recurrencePattern, onSave }: RecurrenceSettingsProps) {
  const [enabled, setEnabled] = useState(isRecurring)
  const [showPattern, setShowPattern] = useState(!!recurrencePattern)
  const [type, setType] = useState<RecurrenceType>((recurrencePattern?.type as RecurrenceType) || 'daily')
  const [interval, setInterval] = useState(recurrencePattern?.interval || 1)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(recurrencePattern?.daysOfWeek || [1, 2, 3, 4, 5])
  const [dayOfMonth, setDayOfMonth] = useState(recurrencePattern?.dayOfMonth || 1)
  const [endAfterOccurrences, setEndAfterOccurrences] = useState<string>(
    recurrencePattern?.endAfterOccurrences ? String(recurrencePattern.endAfterOccurrences) : ''
  )
  const [recurrenceEnd, setRecurrenceEnd] = useState(recurrencePattern?.recurrenceEnd?.split('T')[0] || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleToggle = async (newEnabled: boolean) => {
    setEnabled(newEnabled)
    setError(null)
    setIsSaving(true)

    try {
      if (newEnabled) {
        // Enable recurring - no pattern required
        await api.post(`/tasks/${taskId}/recurrence`, {
          isRecurring: true,
        })
      } else {
        // Disable recurring
        setShowPattern(false)
        await api.post(`/tasks/${taskId}/recurrence`, {
          isRecurring: false,
        })
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      onSave?.()
    } catch (err) {
      setEnabled(!newEnabled) // Rollback
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePattern = async () => {
    if (!showPattern) {
      // Remove pattern, keep recurring
      setIsSaving(true)
      setError(null)
      try {
        await api.post(`/tasks/${taskId}/recurrence`, {
          isRecurring: true,
        })
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
        onSave?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (interval < 1) {
      setError('L\'intervallo deve essere almeno 1')
      return
    }

    if (type === 'weekly' && daysOfWeek.length === 0) {
      setError('Seleziona almeno un giorno della settimana')
      return
    }

    if (type === 'monthly' && (dayOfMonth < 1 || dayOfMonth > 31)) {
      setError('Il giorno del mese deve essere tra 1 e 31')
      return
    }

    if (endAfterOccurrences && parseInt(endAfterOccurrences) < 1) {
      setError('Il numero di occorrenze deve essere almeno 1')
      return
    }

    if (recurrenceEnd && endAfterOccurrences) {
      setError('Seleziona solo una opzione di fine: occorrenze o data')
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      const pattern: RecurrencePattern = {
        type,
        interval,
      }

      if (type === 'weekly') {
        pattern.daysOfWeek = daysOfWeek
      }

      if (type === 'monthly') {
        pattern.dayOfMonth = dayOfMonth
      }

      if (endAfterOccurrences) {
        pattern.endAfterOccurrences = parseInt(endAfterOccurrences)
      }

      if (recurrenceEnd) {
        pattern.recurrenceEnd = new Date(`${recurrenceEnd}T00:00:00Z`).toISOString()
      }

      await api.post(`/tasks/${taskId}/recurrence`, {
        isRecurring: true,
        recurrencePattern: pattern,
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      onSave?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  if (!enabled && !isRecurring) {
    return (
      <button
        type="button"
        onClick={() => handleToggle(true)}
        disabled={isSaving}
        className="p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 transition-colors flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 w-full justify-center disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Repeat2 className="w-4 h-4" />
        )}
        Rendi ricorrente
      </button>
    )
  }

  return (
    <div className="card p-4 space-y-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-medium text-gray-900 dark:text-white">Attività Ricorrente</h3>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(false)}
          disabled={isSaving}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
          title="Disattiva ricorrenza"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Questa attività non ha una scadenza definitiva e si ripete nel tempo.
      </p>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
          Salvataggio completato
        </div>
      )}

      {/* Collapsible pattern section */}
      <button
        type="button"
        onClick={() => setShowPattern(!showPattern)}
        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      >
        {showPattern ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        Configura frequenza (opzionale)
      </button>

      {showPattern && (
        <div className="space-y-4 pt-2 border-t border-blue-200 dark:border-blue-800">
          {/* Recurrence Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequenza
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RecurrenceType)}
              className="input"
            >
              <option value="daily">Giorno</option>
              <option value="weekly">Settimana</option>
              <option value="monthly">Mese</option>
              <option value="yearly">Anno</option>
            </select>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ogni {type === 'daily' ? 'N giorni' : type === 'weekly' ? 'N settimane' : type === 'monthly' ? 'N mesi' : 'N anni'}
            </label>
            <input
              type="number"
              min="1"
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="input"
            />
          </div>

          {/* Days of Week for Weekly */}
          {type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Giorni
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day.value}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                      daysOfWeek.includes(day.value)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={daysOfWeek.includes(day.value)}
                      onChange={() => toggleDayOfWeek(day.value)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Day of Month for Monthly */}
          {type === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Giorno del mese
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                className="input"
              />
            </div>
          )}

          {/* End Conditions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fine ricorrenza (opzionale)</p>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Numero di occorrenze
              </label>
              <input
                type="number"
                min="1"
                placeholder="Lascia vuoto per nessun limite"
                value={endAfterOccurrences}
                onChange={(e) => setEndAfterOccurrences(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Data di fine
              </label>
              <input
                type="date"
                placeholder="Lascia vuoto per nessun limite"
                value={recurrenceEnd}
                onChange={(e) => setRecurrenceEnd(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Save Pattern Button */}
          <button
            type="button"
            onClick={handleSavePattern}
            disabled={isSaving}
            className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Salva Frequenza'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
