/**
 * Time Entry Detail Modal - Shows time entry details with notes and attachments
 * @module pages/time-tracking/TimeEntryDetailModal
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { X, Clock, FolderKanban, CheckSquare, Calendar, FileText } from 'lucide-react'
import { TimeEntry, Note, Attachment } from '@/types'
import { NoteSection } from '@/components/common/NoteSection'
import { AttachmentSection } from '@/components/common/AttachmentSection'
import { useAuthStore } from '@stores/authStore'
import api from '@services/api'
import { formatDuration } from '@utils/dateFormatters'

interface TimeEntryDetailModalProps {
  isOpen: boolean
  entry: TimeEntry | null
  onClose: () => void
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TimeEntryDetailModal({ isOpen, entry, onClose }: TimeEntryDetailModalProps) {
  const { user } = useAuthStore()

  const [notes, setNotes] = useState<Note[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'attachments'>('details')

  const loadNotes = useCallback(async (entryId: string) => {
    setNotesLoading(true)
    try {
      const response = await api.get<{ success: boolean; data: Note[] }>(
        `/notes/time_entry/${entryId}`
      )
      if (response.data.success) {
        setNotes(response.data.data)
      }
    } catch {
      // silently ignore
    } finally {
      setNotesLoading(false)
    }
  }, [])

  const loadAttachments = useCallback(async (entryId: string) => {
    setAttachmentsLoading(true)
    try {
      const response = await api.get<{ success: boolean; data: Attachment[] }>(
        `/attachments/time_entry/${entryId}`
      )
      if (response.data.success) {
        setAttachments(response.data.data)
      }
    } catch {
      // silently ignore
    } finally {
      setAttachmentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && entry) {
      loadNotes(entry.id)
      loadAttachments(entry.id)
      setActiveTab('details')
    }
  }, [isOpen, entry, loadNotes, loadAttachments])

  const handleNoteAdded = useCallback((note: Note) => {
    setNotes((prev) => [note, ...prev])
  }, [])

  const handleNoteDeleted = useCallback((noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }, [])

  const handleAttachmentAdded = useCallback((attachment: Attachment) => {
    setAttachments((prev) => [attachment, ...prev])
  }, [])

  const handleAttachmentDeleted = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }, [])

  const showInternalToggle = user?.role === 'admin' || user?.role === 'direzione'

  if (!isOpen || !entry) return null

  const tabs = [
    { id: 'details' as const, label: 'Dettagli', icon: FileText },
    { id: 'notes' as const, label: `Note (${notes.length})`, icon: FileText },
    { id: 'attachments' as const, label: `Allegati (${attachments.length})`, icon: FileText },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative w-full max-w-2xl modal-panel max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-cyan-500/15 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Dettaglio Registrazione
              </h2>
              <p className="text-sm font-mono text-amber-500 dark:text-amber-400 mt-0.5">
                {formatDuration(entry.duration)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="btn-icon"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-cyan-500/15 flex-shrink-0">
            <nav className="flex px-4 gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Task Info */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckSquare className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="meta-row-label">Task</p>
                    <Link
                      to={`/tasks/${entry.taskId}`}
                      className="font-medium text-slate-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                      onClick={onClose}
                    >
                      {entry.task?.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{entry.task?.code}</p>
                  </div>
                </div>

                {/* Project Info */}
                {entry.task?.project && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <FolderKanban className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="meta-row-label">Progetto</p>
                      <Link
                        to={`/projects/${entry.task.project.id}`}
                        className="font-medium text-slate-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                        onClick={onClose}
                      >
                        {entry.task.project.name}
                      </Link>
                    </div>
                  </div>
                )}

                {/* Time Info */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <Calendar className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="meta-row-label">Periodo</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {formatDateTime(entry.startTime)}
                    </p>
                    {entry.endTime && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                        fino alle {formatTime(entry.endTime)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="meta-row-label">Durata</p>
                    <p className="font-bold font-mono text-amber-600 dark:text-amber-400 text-lg">
                      {formatDuration(entry.duration)}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {entry.description && (
                  <div className="pt-4 border-t border-cyan-500/10">
                    <p className="meta-row-label mb-2">Descrizione</p>
                    <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap text-sm">
                      {entry.description}
                    </p>
                  </div>
                )}

                {/* User */}
                {entry.user && (
                  <div className="pt-4 border-t border-cyan-500/10">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Registrato da: <span className="text-slate-700 dark:text-slate-200">{entry.user.firstName} {entry.user.lastName}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <NoteSection
                entityType="time_entry"
                entityId={entry.id}
                notes={notes}
                currentUser={user}
                isLoading={notesLoading}
                onNoteAdded={handleNoteAdded}
                onNoteDeleted={handleNoteDeleted}
                showInternalToggle={showInternalToggle}
                title="Note"
              />
            )}

            {activeTab === 'attachments' && (
              <AttachmentSection
                entityType="time_entry"
                entityId={entry.id}
                attachments={attachments}
                currentUser={user}
                isLoading={attachmentsLoading}
                onAttachmentAdded={handleAttachmentAdded}
                onAttachmentDeleted={handleAttachmentDeleted}
                title="Allegati"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
