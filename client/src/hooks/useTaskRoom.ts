/**
 * useTaskRoom - Joins the task-specific Socket.io room while the detail page is mounted.
 * Provides callbacks for real-time comment creation, update, and deletion events so that
 * components do not need to know about socket internals.
 *
 * Usage:
 *   useTaskRoom(taskId, {
 *     onCommentCreated: (comment, taskId) => { ... },
 *     onCommentUpdated: (comment, taskId) => { ... },
 *     onCommentDeleted: (commentId, taskId) => { ... },
 *   })
 *
 * @module hooks/useTaskRoom
 */

import { useEffect, useRef } from 'react'
import { getSocket } from '@/services/socket'
import type { Comment } from '@/types'

export interface CommentCreatedPayload {
  comment: Comment
  taskId: string
}

export interface CommentUpdatedPayload {
  comment: Comment
  taskId: string
}

export interface CommentDeletedPayload {
  commentId: string
  taskId: string
}

interface UseTaskRoomOptions {
  onCommentCreated?: (payload: CommentCreatedPayload) => void
  onCommentUpdated?: (payload: CommentUpdatedPayload) => void
  onCommentDeleted?: (payload: CommentDeletedPayload) => void
}

/**
 * Joins the socket room `task:<taskId>` and registers listeners for comment events.
 * Automatically leaves the room and removes listeners on unmount or taskId change.
 *
 * @param taskId - The ID of the task whose room to join. Pass null/undefined to skip.
 * @param options - Event callbacks. Use stable references (useCallback) to avoid
 *                  re-subscribing unnecessarily.
 */
export function useTaskRoom(
  taskId: string | null | undefined,
  options: UseTaskRoomOptions = {}
): void {
  // Keep a ref to options so the effect closure always sees the latest callbacks
  // without needing to list them as dependencies (avoids infinite re-registration).
  const optionsRef = useRef<UseTaskRoomOptions>(options)
  optionsRef.current = options

  useEffect(() => {
    if (!taskId) return

    const socket = getSocket()
    if (!socket) return

    // Join the task-specific room
    socket.emit('join:task', taskId)

    const handleCommentCreated = (payload: CommentCreatedPayload) => {
      optionsRef.current.onCommentCreated?.(payload)
    }

    const handleCommentUpdated = (payload: CommentUpdatedPayload) => {
      optionsRef.current.onCommentUpdated?.(payload)
    }

    const handleCommentDeleted = (payload: CommentDeletedPayload) => {
      optionsRef.current.onCommentDeleted?.(payload)
    }

    socket.on('comment:created', handleCommentCreated)
    socket.on('comment:updated', handleCommentUpdated)
    socket.on('comment:deleted', handleCommentDeleted)

    return () => {
      socket.emit('leave:task', taskId)
      socket.off('comment:created', handleCommentCreated)
      socket.off('comment:updated', handleCommentUpdated)
      socket.off('comment:deleted', handleCommentDeleted)
    }
  }, [taskId])
}
