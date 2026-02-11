/**
 * Document Form Page - Create or edit a document
 * @module pages/documents/DocumentFormPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDocumentStore } from '@stores/documentStore'
import { useProjectStore } from '@stores/projectStore'
import { ArrowLeft, Loader2, Save, Upload } from 'lucide-react'
import { DOCUMENT_TYPE_OPTIONS } from '@/constants'
import { DocumentType } from '@/types'

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
  })
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

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
        })
        navigate(`/documents/${id}`)
      } else {
        const data = new FormData()
        data.append('projectId', formData.projectId)
        data.append('title', formData.title)
        if (formData.description) data.append('description', formData.description)
        data.append('type', formData.type)
        if (file) data.append('file', file)

        const newDoc = await createDocument(data)
        navigate(`/documents/${newDoc.id}`)
      }
    } catch (error) {
      console.error('Failed to save document:', error)
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
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
                  {project.code} - {project.name}
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
          </div>
        </div>

        {/* File Upload (only on create) */}
        {!isEditing && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">File</h2>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
              <div className="text-center">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {file ? file.name : 'Seleziona un file da caricare'}
                </p>
                {file && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                )}
                <label className="btn-secondary cursor-pointer inline-block">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  Scegli File
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  PDF, DOCX, XLSX, PNG, JPEG, TXT - Max 10MB
                </p>
              </div>
            </div>
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
