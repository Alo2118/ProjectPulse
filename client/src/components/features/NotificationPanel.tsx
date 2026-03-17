import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCheck } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotificationUIStore } from "@/stores/notificationUiStore"
import {
  useNotificationListQuery,
  useUnreadCountQuery,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/api/useNotifications"
import { NotificationItem, type NotificationData } from "./NotificationItem"

export function NotificationPanel() {
  const panelOpen = useNotificationUIStore((s) => s.panelOpen)
  const setPanelOpen = useNotificationUIStore((s) => s.setPanelOpen)
  const navigate = useNavigate()

  const { data, isLoading } = useNotificationListQuery(
    panelOpen ? { page: 1, limit: 20 } : {}
  )
  const { data: unreadCount } = useUnreadCountQuery()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications: NotificationData[] = data?.data ?? []

  const handleRead = useCallback(
    (id: string) => {
      markRead.mutate(id)
    },
    [markRead]
  )

  const handleNavigate = useCallback(
    (notification: NotificationData) => {
      const d = notification.data
      if (d?.taskId) {
        navigate(`/tasks/${d.taskId}`)
      } else if (d?.projectId) {
        navigate(`/projects/${d.projectId}`)
      } else if (d?.riskId) {
        navigate(`/risks/${d.riskId}`)
      } else if (d?.documentId) {
        navigate(`/documents/${d.documentId}`)
      }
      setPanelOpen(false)
    },
    [navigate, setPanelOpen]
  )

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate()
  }, [markAllRead])

  const grouped = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 7)

    const groups: { label: string; items: NotificationData[] }[] = []
    const todayItems: NotificationData[] = []
    const yesterdayItems: NotificationData[] = []
    const weekItems: NotificationData[] = []
    const olderItems: NotificationData[] = []

    for (const n of notifications) {
      const d = new Date(n.createdAt)
      if (d >= today) todayItems.push(n)
      else if (d >= yesterday) yesterdayItems.push(n)
      else if (d >= weekAgo) weekItems.push(n)
      else olderItems.push(n)
    }

    if (todayItems.length) groups.push({ label: "Oggi", items: todayItems })
    if (yesterdayItems.length) groups.push({ label: "Ieri", items: yesterdayItems })
    if (weekItems.length) groups.push({ label: "Questa settimana", items: weekItems })
    if (olderItems.length) groups.push({ label: "Precedenti", items: olderItems })

    return groups
  }, [notifications])

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle>Notifiche</SheetTitle>
              {typeof unreadCount === "number" && unreadCount > 0 && (
                <Badge variant="default" className="h-5 min-w-[20px] px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending || !unreadCount}
              className="text-xs"
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Segna tutte come lette
            </Button>
          </div>
          <SheetDescription className="sr-only">
            Pannello notifiche
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Nessuna notifica
                </p>
              </div>
            )}

            {!isLoading && notifications.length > 0 &&
              grouped.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </p>
                  {group.items.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={handleRead}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
