import { useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Edit, Users } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useProjectMembersQuery, useRemoveProjectMember } from "@/hooks/api/useProjectMembers"
import { usePrivilegedRole } from "@/hooks/ui/usePrivilegedRole"
import { PROJECT_ROLE_LABELS } from "@/lib/constants"
import { cn, getUserInitials, getAvatarColor } from "@/lib/utils"

interface MemberRow {
  id: string
  projectRole: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    isActive: boolean
  }
}

interface TeamTabProps {
  projectId: string
}

const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
}

function TeamSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}

export function TeamTab({ projectId }: TeamTabProps) {
  const { data: membersData, isLoading } = useProjectMembersQuery(projectId)
  const { isPrivileged: canManage } = usePrivilegedRole()
  const removeMember = useRemoveProjectMember()

  const [memberToRemove, setMemberToRemove] = useState<MemberRow | null>(null)

  const members = (membersData ?? []) as MemberRow[]

  if (isLoading) return <TeamSkeleton />

  const handleRemove = () => {
    if (!memberToRemove) return
    removeMember.mutate(
      { projectId, memberId: memberToRemove.id },
      {
        onSuccess: () => {
          toast.success(
            `${memberToRemove.user.firstName} ${memberToRemove.user.lastName} rimosso dal team`
          )
          setMemberToRemove(null)
        },
        onError: () => {
          toast.error("Errore durante la rimozione del membro")
          setMemberToRemove(null)
        },
      }
    )
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Header actions */}
      {canManage && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "membro" : "membri"} nel team
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/projects/${projectId}/edit`}>
              <Edit className="h-4 w-4 mr-1.5" />
              Gestisci team
            </Link>
          </Button>
        </div>
      )}

      {/* Empty state */}
      {members.length === 0 ? (
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center gap-3 text-center">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nessun membro nel team</p>
            {canManage && (
              <Button size="sm" asChild>
                <Link to={`/projects/${projectId}/edit`}>Aggiungi membri</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {members.slice(0, 20).map((member) => {
            const fullName = `${member.user.firstName} ${member.user.lastName}`
            return (
              <motion.div key={member.id} variants={itemVariants} transition={{ duration: 0.18 }}>
                <Card className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback
                          className={cn("text-sm text-white", getAvatarColor(fullName))}
                        >
                          {getUserInitials(member.user.firstName, member.user.lastName)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fullName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {member.user.email}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {/* Project role */}
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          >
                            {PROJECT_ROLE_LABELS[member.projectRole] ?? member.projectRole}
                          </Badge>
                          {/* System role */}
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            {member.user.role}
                          </Badge>
                          {/* Inactive indicator */}
                          {!member.user.isActive && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            >
                              Inattivo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Remove button for privileged users */}
                    {canManage && (
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setMemberToRemove(member)}
                        >
                          Rimuovi
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Remove confirmation dialog */}
      <AlertDialog open={memberToRemove !== null} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi membro</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere{" "}
              <span className="font-medium">
                {memberToRemove
                  ? `${memberToRemove.user.firstName} ${memberToRemove.user.lastName}`
                  : ""}
              </span>{" "}
              dal team di questo progetto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
