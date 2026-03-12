import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAcceptInvitation } from "@/hooks/api/useInvitations"

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const acceptInvitation = useAcceptInvitation()

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.firstName.trim()) errs.firstName = "Nome obbligatorio"
    if (!form.lastName.trim()) errs.lastName = "Cognome obbligatorio"
    if (form.password.length < 8)
      errs.password = "La password deve avere almeno 8 caratteri"
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = "Le password non coincidono"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !token) return

    acceptInvitation.mutate(
      {
        token,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
      },
      {
        onSuccess: () => {
          // handled by success state below
        },
      }
    )
  }

  if (acceptInvitation.isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold text-foreground">
              Account creato con successo!
            </h2>
            <p className="text-sm text-muted-foreground">
              Puoi ora accedere con le tue credenziali.
            </p>
            <Button onClick={() => navigate("/login")} className="mt-2">
              Vai al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Accetta Invito</CardTitle>
          <CardDescription>
            Completa la registrazione per accedere al progetto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {acceptInvitation.isError && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Errore nell&apos;accettazione dell&apos;invito. Il link potrebbe
                essere scaduto.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
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
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={acceptInvitation.isPending}
            >
              {acceptInvitation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crea Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
