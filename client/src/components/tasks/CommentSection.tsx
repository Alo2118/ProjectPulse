/**
 * Comment Section - Displays and manages task comments
 * @module components/tasks/CommentSection
 */

import { useState } from 'react'
import { Loader2, Send, Trash2, MessageSquare } from 'lucide-react'
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
    } catch (error) {
      console.error('Failed to post comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`)
      onCommentDeleted(commentId)
    } catch (error) {
      console.error('Failed to delete comment:', error)
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
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Scrivi un commento..."
              rows={3}
              className="input w-full resize-none"
            />
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
                  <span className="font-medium text-gray-900 dark:text-white">
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
                <p className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {comment.content}
                </p>
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
