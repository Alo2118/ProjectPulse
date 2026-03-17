import { useState } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useTaskCommentsQuery, useCreateComment } from "@/hooks/api/useComments"
import { formatRelative, getUserInitials, getAvatarColor } from "@/lib/utils"

interface Comment {
  id: string
  content: string
  isInternal?: boolean
  createdAt: string
  user?: {
    id: string
    firstName: string
    lastName: string
  } | null
  replies?: Comment[]
}

interface CommentSectionProps {
  taskId: string
}

function CommentSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CommentItem({ comment }: { comment: Comment }) {
  const firstName = comment.user?.firstName ?? "?"
  const lastName = comment.user?.lastName ?? "?"
  const initials = getUserInitials(firstName, lastName)
  const color = getAvatarColor(`${firstName}${lastName}`)

  return (
    <div className="flex gap-3">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${color}`}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {firstName} {lastName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelative(comment.createdAt)}
          </span>
          {comment.isInternal && (
            <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium">
              Interno
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {comment.content}
        </p>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 ml-2 pl-3 border-l-2 border-muted space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CommentSection({ taskId }: CommentSectionProps) {
  const { data: comments, isLoading } = useTaskCommentsQuery(taskId)
  const createComment = useCreateComment()
  const [content, setContent] = useState("")

  const commentList = (comments ?? []) as Comment[]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    createComment.mutate(
      { content: trimmed, taskId },
      {
        onSuccess: () => {
          setContent("")
          toast.success("Commento aggiunto")
        },
        onError: () => toast.error("Errore nell'aggiunta del commento"),
      }
    )
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {isLoading ? (
          <CommentSkeleton />
        ) : commentList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nessun commento
          </p>
        ) : (
          <div className="space-y-4">
            {commentList.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}

        {/* Add comment form */}
        <form onSubmit={handleSubmit} className="pt-4 border-t space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Scrivi un commento..."
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || createComment.isPending}
            >
              <Send className="h-4 w-4 mr-1" />
              {createComment.isPending ? "Invio..." : "Invia"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
