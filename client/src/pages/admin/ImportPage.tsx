/**
 * ImportPage - Step-by-step CSV import wizard for tasks
 * Route: /admin/import
 * @module pages/admin/ImportPage
 */

import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  RotateCcw,
  Download,
} from 'lucide-react'
import api from '@/services/api'
import { useProjectStore } from '@stores/projectStore'
import { useEffect } from 'react'
import {
  CsvFieldMapper,
  autoDetectMapping,
  TASK_FIELD_OPTIONS,
} from '@components/features/CsvFieldMapper'

// ============================================================
// TYPES
// ============================================================

interface PreviewData {
  headers: string[]
  preview: Record<string, string>[]
  totalRows: number
}

interface ImportError {
  row: number
  message: string
}

interface ImportResult {
  imported: number
  errors: ImportError[]
}

type WizardStep = 1 | 2 | 3 | 4

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Carica File',
  2: 'Mappa Colonne',
  3: 'Impostazioni',
  4: 'Risultato',
}

// ============================================================
// COMPONENT
// ============================================================

export default function ImportPage() {
  const [step, setStep] = useState<WizardStep>(1)
  const [csvContent, setCsvContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [defaultProjectId, setDefaultProjectId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { projects, fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // ============================================================
  // FILE HANDLING
  // ============================================================

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve((e.target?.result as string) ?? '')
      reader.onerror = () => reject(new Error('Errore lettura file'))
      reader.readAsText(file, 'utf-8')
    })

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Seleziona un file CSV valido.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Il file non può superare 5 MB.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const content = await readFileAsText(file)
      setFileName(file.name)
      setCsvContent(content)

      // Preview
      const response = await api.post<{
        success: boolean
        data: PreviewData
      }>('/import/tasks/preview', { csvContent: content })

      if (response.data.success) {
        const data = response.data.data
        setPreviewData(data)

        // Auto-detect mappings
        const detected: Record<string, string> = {}
        data.headers.forEach((h) => {
          detected[h] = autoDetectMapping(h)
        })
        setMappings(detected)

        setStep(2)
      }
    } catch (err) {
      setError('Errore durante l\'analisi del file. Verifica che sia un CSV valido.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  // ============================================================
  // IMPORT
  // ============================================================

  const handleImport = useCallback(async () => {
    if (!csvContent) return
    setIsLoading(true)
    setError('')

    try {
      const response = await api.post<{
        success: boolean
        data: ImportResult
      }>('/import/tasks', {
        csvContent,
        mappings,
        defaultProjectId: defaultProjectId || undefined,
      })

      if (response.data.success) {
        setImportResult(response.data.data)
        setStep(4)
      }
    } catch (err) {
      setError('Errore durante l\'importazione. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }, [csvContent, mappings, defaultProjectId])

  const handleReset = () => {
    setStep(1)
    setCsvContent('')
    setFileName('')
    setPreviewData(null)
    setMappings({})
    setDefaultProjectId('')
    setError('')
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Validate step 2: title must be mapped
  const isMappingValid = Object.values(mappings).includes('title')

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const renderStepIndicator = () => (
    <div className="flex items-center gap-0 mb-8">
      {([1, 2, 3, 4] as WizardStep[]).map((s, idx) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > s
                  ? 'bg-emerald-500 text-white'
                  : step === s
                  ? 'bg-primary-500 text-white ring-4 ring-primary-100 dark:ring-primary-900/50'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {step > s ? <CheckCircle className="w-4 h-4" /> : s}
            </div>
            <span
              className={`text-xs mt-1 font-medium hidden sm:block ${
                step >= s
                  ? 'text-gray-700 dark:text-gray-300'
                  : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
          </div>
          {idx < 3 && (
            <div
              className={`h-0.5 w-12 sm:w-20 mx-1 mt-[-12px] sm:mt-[-18px] transition-colors ${
                step > s ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  // ============================================================
  // STEP 1: Upload
  // ============================================================

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Carica il file CSV</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Il file deve avere una riga di intestazione. Dimensione massima: 5 MB.
        </p>
      </div>

      {/* Drag and drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
        role="button"
        aria-label="Trascina un file CSV o clicca per selezionarlo"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Analisi in corso...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary-500" />
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                Trascina qui il file CSV
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                oppure <span className="text-primary-500 font-medium">clicca per selezionarlo</span>
              </p>
            </div>
            <p className="text-xs text-gray-400">.csv, max 5 MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Download template */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <FileText className="w-4 h-4 flex-shrink-0" />
        <span>
          Non hai un file?{' '}
          <button
            type="button"
            onClick={() => {
              const bom = '\uFEFF'
              const header = 'Titolo,Descrizione,Tipo,Stato,Priorità,Codice Progetto,Email Assegnatario,Nome Reparto,Data Inizio,Scadenza,Ore Stimate'
              const example = 'Esempio Task,,task,todo,medium,PRJ001,utente@azienda.it,Sviluppo,2026-03-01,2026-03-31,8'
              const csv = bom + header + '\r\n' + example
              const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
              const link = document.createElement('a')
              link.href = url
              link.download = 'template-import-task.csv'
              link.click()
              window.URL.revokeObjectURL(url)
            }}
            className="text-primary-500 hover:underline inline-flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            scarica il template
          </button>
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )

  // ============================================================
  // STEP 2: Column mapping + Preview
  // ============================================================

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mappa le colonne</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          File: <span className="font-medium text-gray-700 dark:text-gray-300">{fileName}</span>
          {previewData && (
            <> &mdash; {previewData.totalRows} righe rilevate</>
          )}
        </p>
      </div>

      {/* Preview table */}
      {previewData && previewData.preview.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Anteprima (prime {previewData.preview.length} righe)
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="text-xs min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {previewData.headers.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap border-b border-gray-200 dark:border-gray-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {previewData.preview.map((row, idx) => (
                  <tr
                    key={idx}
                    className="bg-white dark:bg-gray-800/20 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    {previewData.headers.map((h) => (
                      <td
                        key={h}
                        className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[160px] truncate"
                        title={row[h]}
                      >
                        {row[h] || <span className="text-gray-300 dark:text-gray-600">&mdash;</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Field mapper */}
      {previewData && (
        <CsvFieldMapper
          headers={previewData.headers}
          mappings={mappings}
          onChange={setMappings}
        />
      )}

      {!isMappingValid && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Mappa almeno una colonna al campo <strong>Titolo</strong> per continuare.
        </div>
      )}
    </div>
  )

  // ============================================================
  // STEP 3: Defaults
  // ============================================================

  const renderStep3 = () => {
    const titleMapped = Object.entries(mappings).find(([, v]) => v === 'title')
    const projectMapped = Object.entries(mappings).find(([, v]) => v === 'projectCode')

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Impostazioni predefinite</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configura i valori di default per i campi non mappati o vuoti.
          </p>
        </div>

        {/* Summary of mappings */}
        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Riepilogo Mappature</h3>
          <div className="space-y-1">
            {Object.entries(mappings)
              .filter(([, v]) => v !== 'ignore')
              .map(([header, field]) => {
                const fieldLabel =
                  TASK_FIELD_OPTIONS.find((o) => o.value === field)?.label ?? field
                return (
                  <div key={header} className="flex items-center gap-2 text-sm">
                    <span className="font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded text-xs">
                      {header}
                    </span>
                    <span className="text-gray-400">&rarr;</span>
                    <span className="text-gray-700 dark:text-gray-300">{fieldLabel}</span>
                  </div>
                )
              })}
            {Object.values(mappings).every((v) => v === 'ignore') && (
              <p className="text-sm text-gray-400">Nessun campo mappato.</p>
            )}
          </div>
        </div>

        {/* Default project */}
        {!projectMapped && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Progetto Predefinito
              <span className="ml-1 text-gray-400 font-normal">(opzionale)</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Se non hai mappato la colonna "Codice Progetto", puoi assegnare tutti i task importati
              a un progetto.
            </p>
            <select
              value={defaultProjectId}
              onChange={(e) => setDefaultProjectId(e.target.value)}
              className="input w-full sm:w-auto"
              aria-label="Seleziona progetto predefinito"
            >
              <option value="">Nessun progetto (standalone)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Recap */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
            Pronto all'importazione
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>
              Colonna titolo: <strong>{titleMapped?.[0] ?? '—'}</strong>
            </li>
            <li>
              Righe da importare: <strong>{previewData?.totalRows ?? 0}</strong>
            </li>
            {defaultProjectId && (
              <li>
                Progetto predefinito:{' '}
                <strong>
                  {projects.find((p) => p.id === defaultProjectId)?.name ?? defaultProjectId}
                </strong>
              </li>
            )}
          </ul>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // STEP 4: Result
  // ============================================================

  const renderStep4 = () => {
    if (!importResult) return null
    const hasErrors = importResult.errors.length > 0

    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          {importResult.imported > 0 ? (
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {importResult.imported > 0 ? 'Importazione completata' : 'Nessun task importato'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {importResult.imported} task importat{importResult.imported === 1 ? 'o' : 'i'}{' '}
            con successo
            {hasErrors ? `, ${importResult.errors.length} error${importResult.errors.length === 1 ? 'e' : 'i'}` : ''}
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {importResult.imported}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Importati</p>
          </div>
          <div className={`card p-4 text-center ${hasErrors ? 'border-red-200 dark:border-red-700/50' : ''}`}>
            <p className={`text-3xl font-bold ${hasErrors ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
              {importResult.errors.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Errori</p>
          </div>
        </div>

        {/* Error details */}
        {hasErrors && (
          <div>
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Dettaglio Errori
            </h3>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-red-200 dark:border-red-700/50">
              {importResult.errors.map((err, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 px-4 py-2.5 text-sm ${
                    idx % 2 === 0
                      ? 'bg-red-50 dark:bg-red-900/10'
                      : 'bg-white dark:bg-gray-800/10'
                  }`}
                >
                  <span className="font-mono text-red-500 dark:text-red-400 flex-shrink-0 font-medium">
                    Riga {err.row}
                  </span>
                  <span className="text-red-700 dark:text-red-300">{err.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Nuova Importazione
          </button>
          <a href="/tasks" className="btn-primary flex items-center gap-2 justify-center">
            <CheckCircle className="w-4 h-4" />
            Vai ai Task
          </a>
        </div>
      </div>
    )
  }

  // ============================================================
  // NAVIGATION BUTTONS
  // ============================================================

  const renderNavigation = () => {
    if (step === 4) return null

    return (
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1) as WizardStep)}
          disabled={step === 1}
          className="btn-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Indietro
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 1 && !csvContent) return
              if (step === 2 && !isMappingValid) return
              setStep((s) => Math.min(4, s + 1) as WizardStep)
            }}
            disabled={(step === 1 && !csvContent) || (step === 2 && !isMappingValid)}
            className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Avanti
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleImport}
            disabled={isLoading}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Avvia Importazione
              </>
            )}
          </button>
        )}
      </div>
    )
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Importa Task da CSV
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Importa task in massa utilizzando un file CSV con mappatura personalizzata delle colonne.
        </p>
      </div>

      {/* Wizard card */}
      <div className="card p-6 sm:p-8">
        {renderStepIndicator()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {renderNavigation()}
      </div>
    </div>
  )
}
