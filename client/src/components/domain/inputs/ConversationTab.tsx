import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/common/EmptyState"
import { cn, getUserInitials, getAvatarColor, formatDate } from "@/lib/utils"
import { useInputQuery, useReplyToInput } from "@/hooks/api/useInputs"
import { useCurrentUser } from "@/hooks/api/useAuth"

interface Reply {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
  }
}

const messageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.04 },
  },
}

interface ConversationTabProps {
  inputId: string
}

export function ConversationTab({ inputId }: ConversationTabProps) {
  const [replyContent, setReplyContent] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: input, isLoading } = useInputQuery(inputId)
  const { data: currentUser } = useCurrentUser()
  const replyMutation = useReplyToInput()

  const handleSubmit = useCallback(async () => {
    const trimmed = replyContent.trim()
    if (!trimmed) return
    try {
      await replyMutation.mutateAsync({ inputId, content: trimmed })
      setReplyContent("")
      toast.success("Risposta inviata")
    } catch {
      toast.error("Errore nell'invio della risposta")
    }
  }, [replyContent, inputId, replyMutation])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 items-start">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!input) return null

  const replies: Reply[] = input.replies ?? []
  const originatorId = input.createdBy?.id as string | undefined

  return (
    <div className="flex flex-col gap-4">
      {/* Original message */}
      <div className="flex gap-3 items-start">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback
            className="text-xs font-semibold text-white"
            style={{
              backgroundColor: input.createdBy
                ? getAvatarColor(
                    `${input.createdBy.firstName} ${input.createdBy.lastName}`
                  )
                : undefined,
            }}
          >
            {input.createdBy
              ? getUserInitials(input.createdBy.firstName, input.createdBy.lastName)
              : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {input.createdBy
                ? `${input.createdBy.firstName} ${input.createdBy.lastName}`
                : "Autore"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(input.createdAt)}
            </span>
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
              Segnalazione originale
            </span>
          </div>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {input.description || "Nessuna descrizione fornita."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Replies thread */}
      {replies.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nessuna risposta ancora"
          description="Scrivi il primo messaggio nel thread di questa segnalazione"
        />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="animate"
          animate="animate"
          className="space-y-3"
        >
          <AnimatePresence initial={false}>
            {replies.map((reply) => {
              const isOwn = currentUser?.id === reply.user.id
              const isOriginator = originatorId === reply.user.id
              return (
                <motion.div
                  key={reply.id}
                  variants={messageVariants}
                  layout
                  className={cn(
                    "flex gap-3 items-start",
                    isOwn && "flex-row-reverse"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className="text-xs font-semibold text-white"
                      style={{
                        backgroundColor: getAvatarColor(
                          `${reply.user.firstName} ${reply.user.lastName}`
                        ),
                      }}
                    >
                      {getUserInitials(reply.user.firstName, reply.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "flex-1 min-w-0 max-w-[80%]",
                      isOwn && "items-end flex flex-col"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-baseline gap-2 mb-1",
                        isOwn && "flex-row-reverse"
                      )}
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {`${reply.user.firstName} ${reply.user.lastName}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(reply.createdAt)}
                      </span>
                      {isOriginator && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          Segnalante
                        </span>
                      )}
                    </div>
                    <Card
                      className={cn(
                        "w-full",
                        isOriginator
                          ? "border-primary/20 bg-primary/5"
                          : "border-border bg-muted/50"
                      )}
                    >
                      <CardContent className="p-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {reply.content}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Reply form */}
      <div className="border-t border-border pt-4 mt-2">
        <div className="flex gap-3 items-end">
          {currentUser && (
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback
                className="text-xs font-semibold text-white"
                style={{
                  backgroundColor: getAvatarColor(
                    `${currentUser.firstName} ${currentUser.lastName}`
                  ),
                }}
              >
                {getUserInitials(currentUser.firstName, currentUser.lastName)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 space-y-2">
            <Textarea
              ref={textareaRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi una risposta… (Ctrl+Invio per inviare)"
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!replyContent.trim() || replyMutation.isPending}
              >
                {replyMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full"
                    />
                    Invio…
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Invia risposta
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
