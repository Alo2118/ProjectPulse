import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { EntityForm } from "@/components/common/EntityForm"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useUserQuery,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/hooks/api/useUsers"

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "direzione", label: "Direzione" },
  { value: "dipendente", label: "Dipendente" },
]

interface FormState {
  firstName: string
  lastName: string
  email: string
  role: string
  password: string
  weeklyHoursTarget: number
  isActive: boolean
}

const INITIAL_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  role: "dipendente",
  password: "",
  weeklyHoursTarget: 40,
  isActive: true,
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
}

function UserFormPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'admin', entityId: id })
  const navigate = useNavigate()
  const isNew = !id || id === "new"

  const { data: user, isLoading: loadingUser } = useUserQuery(isNew ? "" : id)

  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (!isNew && user) {
      setForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        role: user.role ?? "dipendente",
        password: "",
        weeklyHoursTarget: user.weeklyHoursTarget ?? 40,
        isActive: user.isActive ?? true,
      })
    }
  }, [isNew, user])

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.firstName.trim()) errs.firstName = "Il nome e' obbligatorio"
    if (!form.lastName.trim()) errs.lastName = "Il cognome e' obbligatorio"
    if (!form.email.trim()) {
      errs.email = "L'email e' obbligatoria"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Formato email non valido"
    }
    if (isNew && !form.password.trim()) {
      errs.password = "La password e' obbligatoria per i nuovi utenti"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      if (isNew) {
        await createMutation.mutateAsync({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.role,
          password: form.password,
          weeklyHoursTarget: form.weeklyHoursTarget,
          isActive: form.isActive,
        })
        toast.success("Utente creato con successo")
      } else {
        const payload: { id: string } & Record<string, unknown> = {
          id: id!,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.role,
          weeklyHoursTarget: form.weeklyHoursTarget,
          isActive: form.isActive,
        }
        if (form.password.trim()) {
          payload.password = form.password
        }
        await updateMutation.mutateAsync(payload)
        toast.success("Utente aggiornato con successo")
      }
      navigate("/admin/users")
    } catch {
      toast.error(isNew ? "Errore nella creazione" : "Errore nell'aggiornamento")
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Utente eliminato")
      navigate("/admin/users")
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key as keyof FormErrors]) {
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <EntityForm
      breadcrumbs={[
        { label: "Utenti", href: "/admin/users" },
        { label: isNew ? "Nuovo utente" : `${form.firstName} ${form.lastName}` || "..." },
      ]}
      title={isNew ? "Nuovo utente" : `Modifica ${form.firstName} ${form.lastName}`}
      isNew={isNew}
      isLoading={!isNew && loadingUser}
      onSubmit={handleSubmit}
      onCancel={() => navigate("/admin/users")}
      onDelete={isNew ? undefined : handleDelete}
      isSubmitting={isSubmitting}
      isDeleting={deleteMutation.isPending}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nome" required error={errors.firstName}>
            <Input
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              placeholder="Mario"
            />
          </FormField>
          <FormField label="Cognome" required error={errors.lastName}>
            <Input
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              placeholder="Rossi"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="mario.rossi@azienda.it"
            />
          </FormField>
          <FormField label="Ruolo">
            <Select value={form.role} onValueChange={(v) => setField("role", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Password"
            required={isNew}
            error={errors.password}
            description={isNew ? undefined : "Lascia vuoto per non modificare la password."}
          >
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder={isNew ? "Password" : "Nuova password (opzionale)"}
            />
          </FormField>
          <FormField label="Ore settimanali target">
            <Input
              type="number"
              min={0}
              max={168}
              value={form.weeklyHoursTarget}
              onChange={(e) => setField("weeklyHoursTarget", Number(e.target.value))}
            />
          </FormField>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="isActive"
            checked={form.isActive}
            onCheckedChange={(checked) => setField("isActive", checked)}
          />
          <Label htmlFor="isActive">Utente attivo</Label>
        </div>
      </div>
    </EntityForm>
  )
}

export default UserFormPage
