/**
 * Note Section - Displays and manages notes for any entity
 * Reusable component for projects, tasks, and time entries
 * @module components/common/NoteSection
 */

import { useState } from 'react'
import { Loader2, Send, Trash2, StickyNote, Lock } from 'lucide-react'
import { Note, User, NoteableEntityType } from '@/types'
import api from '@services/api'

interface NoteSectionProps {
  entityType: NoteableEntityType
  entityId: string
  notes: Note[]
  currentUser: User | null
  isLoading: boolean
  onNoteAdded: (note: Note) => void
  onNoteDeleted: (noteId: string) => void
  showInternalToggle?: boolean // Only for direzione/admin
  title?: string
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NoteSection({
  entityType,
  entityId,
  notes,
  currentUser,
  isLoading,
  onNoteAdded,
  onNoteDeleted,
  showInternalToggle = false,
  title = 'Note',
}: NoteSectionProps) {
  const [newNote, setNewNote] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entityId || !newNote.trim()) {
      console.warn('Note submission blocked: entityId=', entityId, 'note empty=', !newNote.trim())
      return
    }

    setIsSubmitting(true)
    try {
      const response = await api.post<{ success: boolean; data: Note }>('/notes', {
        entityType,
        entityId,
        content: newNote.trim(),
        isInternal,
      })
      if (response.data.success) {
        onNoteAdded(response.data.data)
        setNewNote('')
        setIsInternal(false)
      } else {
        console.error('Note creation failed:', response.data)
        alert('Errore durante la creazione della nota')
      }
    } catch (error) {
      console.error('Failed to post note:', error)
      alert('Errore durante la creazione della nota. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.delete(`/notes/${noteId}`)
      onNoteDeleted(noteId)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <StickyNote className="w-5 h-5 mr-2" />
        {title} ({notes.length})
      </h2>

      {/* New Note Form */}
      <form onSubmit={handleSubmitNote} className="mb-6">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium text-sm flex-shrink-0">
            {currentUser?.firstName?.charAt(0)}
            {currentUser?.lastName?.charAt(0)}
          </div>
          <div className="flex-1">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Scrivi una nota..."
              rows={3}
              className="input w-full resize-none"
            />
            <div className="mt-2 flex justify-between items-center">
              {showInternalToggle && (
                <label className="flex items-center text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <Lock className="w-4 h-4 mr-1" />
                  Nota interna (solo direzione)
                </label>
              )}
              <div className={showInternalToggle ? '' : 'ml-auto'}>
                <button
                  type="submit"
                  disabled={!newNote.trim() || isSubmitting}
                  className="btn-primary flex items-center disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Notes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nessuna nota ancora
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium text-sm flex-shrink-0">
                {note.user?.firstName?.charAt(0)}
                {note.user?.lastName?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {note.user?.firstName} {note.user?.lastName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(note.createdAt)}
                  </span>
                  {note.isInternal && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded flex items-center">
                      <Lock className="w-3 h-3 mr-1" />
                      Interno
                    </span>
                  )}
                </div>
                <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {note.content}
                </p>
                {note.user?.id === currentUser?.id && (
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="mt-1 text-xs text-red-500 hover:text-red-600 flex items-center"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Elimina
                  </button>
                )}
                {/* Replies */}
                {note.replies && note.replies.length > 0 && (
                  <div className="mt-3 ml-4 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                    {note.replies.map((reply) => (
                      <div key={reply.id} className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {reply.user?.firstName} {reply.user?.lastName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {formatDateTime(reply.createdAt)}
                        </span>
                        <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
