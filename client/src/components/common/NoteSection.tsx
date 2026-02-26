/**
 * Note Section - Displays and manages notes for any entity
 * Reusable component for projects, tasks, and time entries
 * @module components/common/NoteSection
 */

import { useState } from 'react'
import { Loader2, Send, Trash2, StickyNote, Lock } from 'lucide-react'
import { Note, User, NoteableEntityType } from '@/types'
import api from '@services/api'
import { MentionTextarea } from '@components/common/MentionTextarea'
import { toast } from '@stores/toastStore'
import { formatDateTime } from '@utils/dateFormatters'

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
        toast.error('Errore', 'Errore durante la creazione della nota')
      }
    } catch {
      toast.error('Errore', 'Errore durante la creazione della nota. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.delete(`/notes/${noteId}`)
      onNoteDeleted(noteId)
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="card p-6">
      <h2 className="section-heading mb-4 flex items-center gap-2">
        <StickyNote className="w-4 h-4 text-cyan-500/70" />
        {title} ({notes.length})
      </h2>

      {/* New Note Form */}
      <form onSubmit={handleSubmitNote} className="mb-6">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/15 dark:bg-cyan-500/15 flex items-center justify-center text-cyan-400 dark:text-cyan-400 font-medium text-sm flex-shrink-0">
            {currentUser?.firstName?.charAt(0)}
            {currentUser?.lastName?.charAt(0)}
          </div>
          <div className="flex-1">
            <MentionTextarea
              value={newNote}
              onChange={setNewNote}
              placeholder="Scrivi una nota... digita @ per menzionare"
              minRows={3}
              className="input w-full"
            />
            <div className="mt-2 flex justify-between items-center">
              {showInternalToggle && (
                <label className="flex items-center text-sm text-slate-400 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="mr-2 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/30 accent-cyan-500"
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
        <div className="text-center py-8 text-slate-500 dark:text-slate-500">
          Nessuna nota ancora
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700/50 dark:bg-slate-700/50 flex items-center justify-center text-slate-300 dark:text-slate-300 font-medium text-sm flex-shrink-0">
                {note.user?.firstName?.charAt(0)}
                {note.user?.lastName?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-200 dark:text-slate-200">
                    {note.user?.firstName} {note.user?.lastName}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    {formatDateTime(note.createdAt)}
                  </span>
                  {note.isInternal && (
                    <span className="badge badge-amber flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Interno
                    </span>
                  )}
                </div>
                <p className="mt-1 text-slate-400 dark:text-slate-400 whitespace-pre-wrap text-sm">
                  {note.content}
                </p>
                {note.user?.id === currentUser?.id && (
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="mt-1 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Elimina
                  </button>
                )}
                {/* Replies */}
                {note.replies && note.replies.length > 0 && (
                  <div className="mt-3 ml-4 space-y-2 border-l-2 border-cyan-500/15 dark:border-cyan-500/15 pl-4">
                    {note.replies.map((reply) => (
                      <div key={reply.id} className="text-sm">
                        <span className="font-medium text-slate-300 dark:text-slate-300">
                          {reply.user?.firstName} {reply.user?.lastName}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-500 ml-2">
                          {formatDateTime(reply.createdAt)}
                        </span>
                        <p className="text-slate-400 dark:text-slate-400 mt-0.5">
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
