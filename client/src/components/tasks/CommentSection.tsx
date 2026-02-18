/**
 * Comment Section - Displays and manages task comments with @mention support
 * @module components/tasks/CommentSection
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, Send, Trash2, MessageSquare, AtSign } from 'lucide-react'
import { Comment, User } from '@/types'
import api from '@services/api'

interface CommentSectionProps {
  taskId: string
  comments: Comment[]
  currentUser: User | null
  isLoading: boolean
  onCommentAdded: (comment: Comment) => void
  onCommentDeleted: (commentId: string) => void
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

/** Render comment text with @mentions highlighted */
function CommentText({ content }: { content: string }) {
  const parts = content.split(/(@\S+)/g)
  return (
    <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="font-semibold text-primary-600 dark:text-primary-400">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </p>
  )
}

export function CommentSection({
  taskId,
  comments,
  currentUser,
  isLoading,
  onCommentAdded,
  onCommentDeleted,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionUsers, setMentionUsers] = useState<User[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch users once for mention autocomplete
  useEffect(() => {
    api
      .get<{ success: boolean; data: User[] }>('/users?limit=100&isActive=true')
      .then((res) => {
        if (res.data.success) setAllUsers(res.data.data)
      })
      .catch(() => {
        // silently ignore
      })
  }, [])

  const handleCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setNewComment(val)

      // Detect @mention trigger: find last @ before cursor
      const cursor = e.target.selectionStart ?? val.length
      const textBeforeCursor = val.slice(0, cursor)
      const match = textBeforeCursor.match(/@(\w*)$/)

      if (match) {
        const query = match[1].toLowerCase()
        setMentionQuery(query)
        setMentionIndex(0)
        setMentionUsers(
          allUsers
            .filter(
              (u) =>
                u.firstName.toLowerCase().includes(query) ||
                u.lastName.toLowerCase().includes(query)
            )
            .slice(0, 6)
        )
      } else {
        setMentionQuery(null)
        setMentionUsers([])
      }
    },
    [allUsers]
  )

  const insertMention = useCallback(
    (user: User) => {
      if (!textareaRef.current) return
      const cursor = textareaRef.current.selectionStart ?? newComment.length
      const textBeforeCursor = newComment.slice(0, cursor)
      const textAfterCursor = newComment.slice(cursor)
      // Replace the @query with @FirstName_LastName
      const withoutQuery = textBeforeCursor.replace(/@(\w*)$/, '')
      const mention = `@${user.firstName}${user.lastName} `
      const newVal = withoutQuery + mention + textAfterCursor
      setNewComment(newVal)
      setMentionQuery(null)
      setMentionUsers([])
      // Restore focus and move cursor
      setTimeout(() => {
        if (textareaRef.current) {
          const pos = (withoutQuery + mention).length
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(pos, pos)
        }
      }, 0)
    },
    [newComment]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionUsers.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((i) => Math.min(i + 1, mentionUsers.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (mentionQuery !== null && mentionUsers.length > 0) {
          e.preventDefault()
          insertMention(mentionUsers[mentionIndex])
        }
      } else if (e.key === 'Escape') {
        setMentionQuery(null)
        setMentionUsers([])
      }
    },
    [mentionUsers, mentionQuery, mentionIndex, insertMention]
  )

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskId || !newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await api.post<{ success: boolean; data: Comment }>('/comments', {
        taskId,
        content: newComment.trim(),
      })
      if (response.data.success) {
        onCommentAdded(response.data.data)
        setNewComment('')
      }
    } catch {
      // silently ignore
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`)
      onCommentDeleted(commentId)
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <MessageSquare className="w-5 h-5 mr-2" />
        Commenti ({comments.length})
      </h2>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium text-sm flex-shrink-0">
            {currentUser?.firstName?.charAt(0)}
            {currentUser?.lastName?.charAt(0)}
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleCommentChange}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un commento... (usa @ per menzionare un utente)"
              rows={3}
              className="input w-full resize-none"
            />

            {/* @mention dropdown */}
            {mentionQuery !== null && mentionUsers.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
              >
                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <AtSign className="w-3 h-3" />
                  Menziona utente
                </div>
                {mentionUsers.map((user, idx) => (
                  <button
                    key={user.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      insertMention(user)
                    }}
                    className={`w-full px-3 py-2 flex items-center gap-2 text-sm text-left transition-colors ${
                      idx === mentionIndex
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xs font-bold flex-shrink-0">
                      {user.firstName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="btn-primary flex items-center disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Invia
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Nessun commento ancora
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium text-sm flex-shrink-0">
                {comment.user?.firstName?.charAt(0)}
                {comment.user?.lastName?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {comment.user?.firstName} {comment.user?.lastName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(comment.createdAt)}
                  </span>
                  {comment.isInternal && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                      Interno
                    </span>
                  )}
                </div>
                <CommentText content={comment.content} />
                {comment.user?.id === currentUser?.id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="mt-1 text-xs text-red-500 hover:text-red-600 flex items-center"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Elimina
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

