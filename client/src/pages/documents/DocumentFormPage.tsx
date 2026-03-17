import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Upload, X } from "lucide-react"
import { toast } from "sonner"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { EntityForm } from "@/components/common/EntityForm"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants"
import { formatFileSize } from "@/lib/utils"
import {
  useDocumentQuery,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
} from "@/hooks/api/useDocuments"
import { useProjectListQuery } from "@/hooks/api/useProjects"

const TYPE_OPTIONS = [
  { value: "design_input", label: "Design Input" },
  { value: "design_output", label: "Design Output" },
  { value: "verification_report", label: "Rapporto Verifica" },
  { value: "validation_report", label: "Rapporto Validazione" },
  { value: "change_control", label: "Change Control" },
]

const STATUS_OPTIONS = Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

interface FormState {
  code: string
  title: string
  description: string
  type: string
  status: string
  projectId: string
}

const INITIAL_FORM: FormState = {
  code: "",
  title: "",
  description: "",
  type: "design_input",
  status: "draft",
  projectId: "",
}

interface FormErrors {
  code?: string
  title?: string
}

function DocumentFormPage() {
  const { id } = useParams<{ id: string }>()
  useSetPageContext({ domain: 'document', entityId: id })
  const navigate = useNavigate()
  const isNew = !id || id === "new"
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: doc, isLoading: loadingDoc } = useDocumentQuery(isNew ? "" : id)
  const { data: projectsData } = useProjectListQuery({ limit: "100" })

  const createMutation = useCreateDocument()
  const updateMutation = useUpdateDocument()
  const deleteMutation = useDeleteDocument()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [file, setFile] = useState<File | null>(null)

  const projects = projectsData?.data ?? []

  useEffect(() => {
    if (!isNew && doc) {
      setForm({
        code: doc.code ?? "",
        title: doc.title ?? "",
        description: doc.description ?? "",
        type: doc.type ?? "design_input",
        status: doc.status ?? "draft",
        projectId: doc.projectId ?? "",
      })
    }
  }, [isNew, doc])

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.code.trim()) errs.code = "Il codice e' obbligatorio"
    if (!form.title.trim()) errs.title = "Il titolo e' obbligatorio"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      if (isNew) {
        const formData = new FormData()
        formData.append("code", form.code)
        formData.append("title", form.title)
        formData.append("description", form.description)
        formData.append("type", form.type)
        formData.append("status", form.status)
        if (form.projectId) formData.append("projectId", form.projectId)
        if (file) formData.append("file", file)
        const result = await createMutation.mutateAsync(formData)
        const newId = (result as { id?: string }).id
        toast.success("Documento creato con successo", {
          action: newId
            ? { label: "Apri →", onClick: () => navigate(`/documents/${newId}`) }
            : undefined,
        })
        navigate(newId ? `/documents/${newId}` : "/documents")
      } else {
        const payload = {
          id,
          ...form,
          projectId: form.projectId || undefined,
        }
        await updateMutation.mutateAsync(payload)
        toast.success("Documento aggiornato con successo", {
          action: {
            label: "Apri →",
            onClick: () => navigate(`/documents/${id}`),
          },
        })
        navigate(`/documents/${id}`)
      }
    } catch {
      toast.error(isNew ? "Errore nella creazione" : "Errore nell'aggiornamento")
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Documento eliminato")
      navigate("/documents")
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <EntityForm
      breadcrumbs={[
        { label: "Documenti", href: "/documents" },
        { label: isNew ? "Nuovo documento" : form.code || "..." },
      ]}
      title={isNew ? "Nuovo documento" : `Modifica ${form.code}`}
      isNew={isNew}
      isLoading={!isNew && loadingDoc}
      onSubmit={handleSubmit}
      onCancel={() => navigate("/documents")}
      onDelete={isNew ? undefined : handleDelete}
      isSubmitting={isSubmitting}
      isDeleting={deleteMutation.isPending}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Codice" required error={errors.code}>
            <Input
              value={form.code}
              onChange={(e) => setField("code", e.target.value)}
              placeholder="DOC-001"
            />
          </FormField>
          <FormField label="Titolo" required error={errors.title}>
            <Input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Titolo del documento"
            />
          </FormField>
        </div>

        <FormField label="Descrizione">
          <Textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Descrizione del documento..."
            rows={4}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Tipo">
            <Select value={form.type} onValueChange={(v) => setField("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Stato">
            <Select value={form.status} onValueChange={(v) => setField("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Progetto">
            <Select
              value={form.projectId || "__none__"}
              onValueChange={(v) => setField("projectId", v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona progetto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nessun progetto</SelectItem>
                {projects.map((p: { id: string; name: string }) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {isNew && (
          <FormField label="File" description="Carica un file da allegare al documento.">
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Scegli file
                </Button>
              )}
            </div>
          </FormField>
        )}
      </div>
    </EntityForm>
  )
}

export default DocumentFormPage
