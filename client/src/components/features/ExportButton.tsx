/**
 * ExportButton - Reusable CSV export button component
 * Triggers a file download from the export API endpoint.
 * @module components/features/ExportButton
 */

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import api from '@/services/api'
import { toast } from '@stores/toastStore'

interface ExportButtonProps {
  entity: 'tasks' | 'projects' | 'time-entries'
  filters?: Record<string, string>
  className?: string
  label?: string
}

export function ExportButton({
  entity,
  filters,
  className = '',
  label = 'Esporta CSV',
}: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    if (isLoading) return
    setIsLoading(true)

    try {
      const response = await api.get(`/export/${entity}`, {
        params: filters,
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.download = `${entity}-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Errore', 'Esportazione fallita')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isLoading}
      className={`btn-secondary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      title={`Esporta ${entity} come CSV`}
      aria-label={`Esporta ${entity} come CSV`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span>{isLoading ? 'Esportando...' : label}</span>
    </button>
  )
}

export default ExportButton
