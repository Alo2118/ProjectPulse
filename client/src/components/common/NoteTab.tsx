import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, Pencil, Trash2, Send } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/common/EmptyState"
import {
  useNoteListQuery,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from "@/hooks/api/useNotes"
import { useCurrentUser } from "@/hooks/api/useAuth"
import { cn, getUserInitials, getAvatarColor, formatRelative } from "@/lib/utils"
import { isPrivileged } from "@/lib/constants"
import type { Note } from "@/types"

interface NoteTabProps {
  entityType: string
  entityId: string
}

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

function NoteCard({
  note,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
  isEditing,
  onSaveEdit,
  onCancelEdit,
}: {
  note: Note
  currentUserId: string | undefined
  currentUserRole: string | undefined
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  isEditing: boolean
  onSaveEdit: (id: string, content: string) => void
  onCancelEdit: () => void
}) {
  const [editContent, setEditContent] = useState(note.content)

  const user = note.user
  const authorName = user
    ? `${user.firstName} ${user.lastName}`
    : "Utente sconosciuto"
  const initials = user ? getUserInitials(user.firstName, user.lastName) : "?"
  const avatarColor = getAvatarColor(authorName)

  const canModify =
    currentUserId === note.userId ||
    currentUserRole === "admin" ||
    isPrivileged(currentUserRole ?? "")

  const handleSave = useCallback(() => {
    const trimmed = editContent.trim()
    if (!trimmed) return
    onSaveEdit(note.id, trimmed)
  }, [editContent, note.id, onSaveEdit])

  return (
    <motion.div variants={itemVariants} layout>
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className={cn(avatarColor, "text-white text-xs")}>
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {authorName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(note.createdAt)}
                  </span>
                </div>

                {canModify && !isEditing && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditContent(note.content)
                        onEdit(note.id)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[80px] resize-none"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSave}>
                      Salva
                    </Button>
                    <Button size="sm" variant="outline" onClick={onCancelEdit}>
                      Annulla
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                  {note.content}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function NoteTab({ entityType, entityId }: NoteTabProps) {
  const { data: notes, isLoading } = useNoteListQuery(entityType, entityId)
  const { data: currentUser } = useCurrentUser()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const [newContent, setNewContent] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleCreate = useCallback(() => {
    const trimmed = newContent.trim()
    if (!trimmed) return
    createNote.mutate(
      { entityType, entityId, content: trimmed },
      {
        onSuccess: () => {
          setNewContent("")
          toast.success("Nota aggiunta")
        },
        onError: () => toast.error("Errore nell'aggiunta della nota"),
      }
    )
  }, [newContent, entityType, entityId, createNote])

  const handleSaveEdit = useCallback(
    (id: string, content: string) => {
      updateNote.mutate(
        { id, content, entityType, entityId },
        {
          onSuccess: () => {
            setEditingId(null)
            toast.success("Nota aggiornata")
          },
          onError: () => toast.error("Errore nell'aggiornamento della nota"),
        }
      )
    },
    [updateNote, entityType, entityId]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteNote.mutate(
        { id, entityType, entityId },
        {
          onSuccess: () => toast.success("Nota eliminata"),
          onError: () => toast.error("Errore nell'eliminazione della nota"),
        }
      )
    },
    [deleteNote, entityType, entityId]
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const noteList = (notes as Note[] | undefined) ?? []

  return (
    <div className="space-y-4">
      {/* Note list */}
      {noteList.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nessuna nota"
          description="Aggiungi la prima nota per iniziare la discussione."
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            className="space-y-3"
            initial="initial"
            animate="animate"
            variants={{
              animate: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {noteList.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                currentUserId={currentUser?.id}
                currentUserRole={currentUser?.role}
                onEdit={setEditingId}
                onDelete={handleDelete}
                isEditing={editingId === note.id}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingId(null)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* New note form */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="space-y-3">
            <Textarea
              placeholder="Aggiungi nota..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  handleCreate()
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Ctrl+Invio per inviare
              </span>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newContent.trim() || createNote.isPending}
              >
                <Send className="h-4 w-4 mr-1.5" />
                Invia
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
