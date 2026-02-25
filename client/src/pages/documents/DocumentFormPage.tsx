/**
 * Document Form Page - Create or edit a document
 * @module pages/documents/DocumentFormPage
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDocumentStore } from '@stores/documentStore'
import { useProjectStore } from '@stores/projectStore'
import { ArrowLeft, Loader2, Save, Upload, X, FileText, FileImage, FileSpreadsheet, File } from 'lucide-react'
import { DOCUMENT_TYPE_OPTIONS } from '@/constants'
import { Document, DocumentType } from '@/types'
import { Breadcrumb } from '@/components/common/Breadcrumb'

export default function DocumentFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const { currentDocument, isLoading, fetchDocument, createDocument, updateDocument, clearCurrentDocument } =
    useDocumentStore()
  const { projects, fetchProjects } = useProjectStore()

  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    type: 'design_input' as DocumentType,
    reviewDueDate: '',
    reviewFrequencyDays: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="w-8 h-8 text-green-500" />
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="w-8 h-8 text-blue-500" />
    return <File className="w-8 h-8 text-gray-500" />
  }

  const handleFileChange = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return
    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, file: 'Il file supera il limite di 10MB' }))
      return
    }
    setErrors((prev) => { const next = { ...prev }; delete next.file; return next })
    setFile(selectedFile)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileChange(dropped)
  }

  useEffect(() => {
    fetchProjects()
    if (id) {
      fetchDocument(id)
    }
    return () => clearCurrentDocument()
  }, [id, fetchProjects, fetchDocument, clearCurrentDocument])

  useEffect(() => {
    if (isEditing && currentDocument) {
      setFormData({
        projectId: currentDocument.projectId,
        title: currentDocument.title,
        description: currentDocument.description || '',
        type: currentDocument.type,
        reviewDueDate: currentDocument.reviewDueDate
          ? new Date(currentDocument.reviewDueDate).toISOString().split('T')[0]
          : '',
        reviewFrequencyDays: currentDocument.reviewFrequencyDays
          ? String(currentDocument.reviewFrequencyDays)
          : '',
      })
    }
  }, [isEditing, currentDocument])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.projectId) {
      newErrors.projectId = 'Seleziona un progetto'
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Il titolo e obbligatorio'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      if (isEditing && id) {
        await updateDocument(id, {
          title: formData.title,
          description: formData.description || undefined,
          type: formData.type,
          reviewDueDate: formData.reviewDueDate || null,
          reviewFrequencyDays: formData.reviewFrequencyDays ? parseInt(formData.reviewFrequencyDays, 10) : null,
        } as Partial<Document>)
        navigate(`/documents/${id}`)
      } else {
        const data = new FormData()
        data.append('projectId', formData.projectId)
        data.append('title', formData.title)
        if (formData.description) data.append('description', formData.description)
        data.append('type', formData.type)
        if (formData.reviewDueDate) data.append('reviewDueDate', formData.reviewDueDate)
        if (formData.reviewFrequencyDays) data.append('reviewFrequencyDays', formData.reviewFrequencyDays)
        if (file) data.append('file', file)

        const newDoc = await createDocument(data)
        navigate(`/documents/${newDoc.id}`)
      }
    } catch {
      // silently ignore
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Documenti', href: '/documents' },
          { label: isEditing ? 'Modifica Documento' : 'Nuovo Documento' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Modifica Documento' : 'Nuovo Documento'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Selection */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progetto</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Seleziona progetto *
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className={`input ${errors.projectId ? 'border-red-500' : ''}`}
              disabled={isEditing}
            >
              <option value="">Seleziona...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {errors.projectId && <p className="mt-1 text-sm text-red-500">{errors.projectId}</p>}
          </div>
        </div>

        {/* Document Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dettagli Documento</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titolo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`input ${errors.title ? 'border-red-500' : ''}`}
                placeholder="Titolo del documento..."
              />
              {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="input"
                placeholder="Descrizione del documento..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo Documento
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as DocumentType })}
                className="input"
              >
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Review fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data prossima revisione
                </label>
                <input
                  type="date"
                  value={formData.reviewDueDate}
                  onChange={(e) => setFormData({ ...formData, reviewDueDate: e.target.value })}
                  className="input"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Data entro cui il documento deve essere rivisto
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Frequenza revisione (giorni)
                </label>
                <input
                  type="number"
                  min={0}
                  max={3650}
                  value={formData.reviewFrequencyDays}
                  onChange={(e) => setFormData({ ...formData, reviewFrequencyDays: e.target.value })}
                  className="input"
                  placeholder="es. 365"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Ogni quanti giorni il documento deve essere rivisto
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload (only on create) */}
        {!isEditing && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">File</h2>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg transition-colors ${
                isDragging
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : file
                  ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 cursor-pointer'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />

              {file ? (
                /* File selected — preview */
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="btn-icon text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                    aria-label="Rimuovi file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                /* Empty state — invite to upload */
                <div className="p-8 text-center">
                  <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isDragging ? 'Rilascia il file qui' : 'Trascina un file o clicca per sfogliare'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    PDF, DOCX, XLSX, PNG, JPEG, TXT — Max 10MB
                  </p>
                </div>
              )}
            </div>

            {errors.file && (
              <p className="mt-2 text-sm text-red-500">{errors.file}</p>
            )}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Annulla
          </button>
          <button type="submit" disabled={isSaving} className="btn-primary flex items-center">
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? 'Salva Modifiche' : 'Crea Documento'}
          </button>
        </div>
      </form>
    </div>
  )
}
