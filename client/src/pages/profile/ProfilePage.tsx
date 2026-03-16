import { useState } from "react"
import { User as UserIcon, Mail, Shield, Clock } from "lucide-react"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCurrentUser } from "@/hooks/api/useAuth"
import { useUpdateProfile } from "@/hooks/api/useUsers"
import { getUserInitials, getAvatarColor, cn } from "@/lib/utils"
import { useThemeStore } from "@/stores/themeStore"
import { useNotificationUIStore } from "@/stores/notificationUiStore"
import type { ThemeStyle, ThemeMode } from "@/types"
interface ProfileForm {
  firstName: string
  lastName: string
  email: string
}

export default function ProfilePage() {
  useSetPageContext({ domain: 'user' })
  const { data: user, isLoading } = useCurrentUser()
  const updateProfile = useUpdateProfile()

  const { theme, mode, setTheme, setMode } = useThemeStore()
  const { soundEnabled, desktopEnabled, toggleSound, toggleDesktop } = useNotificationUIStore()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    email: "",
  })

  const startEdit = () => {
    if (!user) return
    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
    })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ ...form })
      toast.success("Profilo aggiornato")
      setEditing(false)
    } catch {
      toast.error("Errore nell'aggiornamento del profilo")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) return null

  const firstName = user.firstName ?? ""
  const lastName = user.lastName ?? ""
  const email = user.email ?? ""
  const role = user.role ?? ""
  const initials = getUserInitials(firstName, lastName)
  const color = getAvatarColor(`${firstName} ${lastName}`)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Il Mio Profilo
      </h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Informazioni Personali</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback
                  className={cn("text-lg font-semibold text-white", color)}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {firstName} {lastName}
                </p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>

            <Separator />

            {editing ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Cognome</Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfile.isPending}
                  >
                    Salva
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditing(false)}
                  >
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground w-24">Nome</span>
                  <span className="text-foreground">
                    {firstName} {lastName}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground w-24">Email</span>
                  <span className="text-foreground">{email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground w-24">Ruolo</span>
                  <Badge variant="secondary" className="capitalize">
                    {role}
                  </Badge>
                </div>
                <Separator />
                <Button variant="outline" size="sm" onClick={startEdit}>
                  Modifica Profilo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Impostazioni */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impostazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ore settimanali</span>
                <span className="ml-auto font-medium text-foreground">
                  {user.weeklyHoursTarget ?? 40}h
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Aspetto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aspetto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select
                  value={theme}
                  onValueChange={(v) => setTheme(v as ThemeStyle)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office-classic">Office Classic</SelectItem>
                    <SelectItem value="asana-like">Asana Like</SelectItem>
                    <SelectItem value="tech-hud">Tech HUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modalità</Label>
                <Select
                  value={mode}
                  onValueChange={(v) => setMode(v as ThemeMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Chiaro</SelectItem>
                    <SelectItem value="dark">Scuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifiche */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifiche</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-toggle">Suono notifiche</Label>
                <Switch
                  id="sound-toggle"
                  checked={soundEnabled}
                  onCheckedChange={toggleSound}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="desktop-toggle">Notifiche desktop</Label>
                <Switch
                  id="desktop-toggle"
                  checked={desktopEnabled}
                  onCheckedChange={toggleDesktop}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
