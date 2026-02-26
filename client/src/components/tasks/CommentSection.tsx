/**
 * Comment Section - Displays and manages task comments with @mention support and threading
 * @module components/tasks/CommentSection
 */

import { useState } from 'react'
import { Loader2, Send, Trash2, MessageSquare, CornerDownRight, X, ChevronDown } from 'lucide-react'
import { Comment, User } from '@/types'
import api from '@services/api'
import { toast } from '@stores/toastStore'
import { MentionTextarea } from '@components/common/MentionTextarea'
import { formatDateTime } from '@utils/dateFormatters'
import { getAvatarColor } from '@utils/avatarColors'

interface CommentSectionProps {
  taskId: string
  comments: Comment[]
  currentUser: User | null
  isLoading: boolean
  onCommentAdded: (comment: Comment) => void
  onCommentDeleted: (commentId: string) => void
}

/** Render comment text with @mentions as inline chips */
function CommentText({ content }: { content: string }) {
  const parts = content.split(/(@\S+)/g)
  return (
    <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span
            key={i}
            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-semibold bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 mx-0.5"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </p>
  )
}

function UserAvatar({ user, small }: { user: { firstName: string; lastName: string }; small?: boolean }) {
  const color = getAvatarColor(user.firstName + user.lastName)
  const size = small ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div
      className={`${size} rounded-full ${color.bg} ${color.text} flex items-center justify-center font-bold flex-shrink-0`}
    >
      {user.firstName.charAt(0).toUpperCase()}
      {user.lastName.charAt(0).toUpperCase()}
    </div>
  )
}

interface CommentBubbleProps {
  comment: Comment
  currentUser: User | null
  onReply?: () => void
  onDelete: (id: string) => void
  isReply?: boolean
}

function CommentBubble({ comment, currentUser, onReply, onDelete, isReply = false }: CommentBubbleProps) {
  return (
    <div className={`flex gap-3 group ${isReply ? '' : ''}`}>
      {comment.user && <UserAvatar user={comment.user} small={isReply} />}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 dark:text-white text-sm">
            {comment.user?.firstName} {comment.user?.lastName}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {formatDateTime(comment.createdAt)}
          </span>
          {comment.isInternal && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full font-medium">
              Interno
            </span>
          )}
        </div>

        {/* Chat bubble */}
        <div
          className={`mt-1.5 rounded-xl px-4 py-3 ${
            isReply
              ? 'bg-blue-50 dark:bg-blue-900/20 rounded-tl-sm'
              : 'bg-slate-50 dark:bg-slate-700/50 rounded-tl-sm'
          }`}
        >
          <CommentText content={comment.content} />
        </div>

        {/* Actions (visible on hover) */}
        <div className="mt-1.5 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Reply button — only for root comments */}
          {!isReply && onReply && (
            <button
              onClick={onReply}
              className="text-xs text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <CornerDownRight className="w-3 h-3" />
              Rispondi
            </button>
          )}

          {/* Delete button */}
          {comment.user?.id === currentUser?.id && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Elimina
            </button>
          )}
        </div>
      </div>
    </div>
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [showAllReplies, setShowAllReplies] = useState<Record<string, boolean>>({})

  /** Find the author name for the comment we are replying to */
  const replyingToAuthor: string = (() => {
    if (!replyingTo) return ''
    const root = comments.find((c) => c.id === replyingTo)
    if (root?.user) return `${root.user.firstName} ${root.user.lastName}`
    return 'questo commento'
  })()

  const toggleShowAllReplies = (commentId: string) => {
    setShowAllReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }))
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskId || !newComment.trim()) return
    setIsSubmitting(true)
    try {
      const response = await api.post<{ success: boolean; data: Comment }>('/comments', {
        taskId,
        content: newComment.trim(),
        ...(replyingTo ? { parentId: replyingTo } : {}),
      })
      if (response.data.success) {
        onCommentAdded(response.data.data)
        setNewComment('')
        setReplyingTo(null)
      }
    } catch {
      // silently ignore
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = (commentId: string) => {
    // Find the comment (including nested replies) for undo restore
    let deletedComment: Comment | undefined
    for (const c of comments) {
      if (c.id === commentId) { deletedComment = c; break }
      const reply = c.replies?.find((r) => r.id === commentId)
      if (reply) { deletedComment = reply; break }
    }

    // Optimistically remove from UI
    onCommentDeleted(commentId)

    toast.withUndo(
      'Commento eliminato',
      async () => {
        try {
          await api.delete(`/comments/${commentId}`)
        } catch {
          // Restore comment if API fails — re-add via callback
          if (deletedComment) onCommentAdded(deletedComment)
          toast.error('Errore', 'Impossibile eliminare il commento')
        }
      },
      () => {
        // Undo: put the comment back
        if (deletedComment) onCommentAdded(deletedComment)
      }
    )
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
        <MessageSquare className="w-5 h-5 mr-2" />
        Commenti ({comments.length})
      </h2>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex gap-3 items-start">
          {currentUser && <UserAvatar user={currentUser} />}
          <div className="flex-1">
            {/* Reply banner */}
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
                <span className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5" />
                  Rispondendo a <strong>{replyingToAuthor}</strong>...
                </span>
                <button
                  type="button"
                  onClick={handleCancelReply}
                  className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
                  aria-label="Annulla risposta"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Textarea with mention support */}
            <div
              className="rounded-xl border transition-colors bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-within:border-cyan-400 dark:focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-100 dark:focus-within:ring-cyan-900/30"
            >
              <MentionTextarea
                value={newComment}
                onChange={setNewComment}
                placeholder={replyingTo ? 'Scrivi una risposta... digita @ per menzionare' : 'Scrivi un commento... digita @ per menzionare'}
                disabled={isSubmitting}
                minRows={3}
                maxRows={10}
                className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />

              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 pb-2.5">
                <span className="text-xs text-slate-400 dark:text-slate-500 select-none">
                  @ per menzionare
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-white disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {replyingTo ? 'Rispondi' : 'Invia'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
          Nessun commento ancora. Scrivi il primo!
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => (
            <div key={comment.id}>
              {/* Root comment */}
              <CommentBubble
                comment={comment}
                currentUser={currentUser}
                onReply={() => setReplyingTo(comment.id)}
                onDelete={handleDeleteComment}
              />

              {/* Threaded replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-8 space-y-2 mt-2 pl-4 border-l-2 border-slate-100 dark:border-slate-700/50">
                  {(showAllReplies[comment.id]
                    ? comment.replies
                    : comment.replies.slice(0, 3)
                  ).map((reply) => (
                    <CommentBubble
                      key={reply.id}
                      comment={reply}
                      currentUser={currentUser}
                      onDelete={handleDeleteComment}
                      isReply
                    />
                  ))}

                  {/* "Show more replies" toggle */}
                  {comment.replies.length > 3 && !showAllReplies[comment.id] && (
                    <button
                      onClick={() => toggleShowAllReplies(comment.id)}
                      className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors mt-1"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      Mostra altre {comment.replies.length - 3} risposte
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
