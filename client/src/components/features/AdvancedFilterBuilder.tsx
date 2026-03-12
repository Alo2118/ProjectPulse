import { useCallback } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FilterField {
  key: string
  label: string
  type: "text" | "select" | "date" | "number"
  options?: { value: string; label: string }[]
}

export interface FilterRule {
  field: string
  operator: string
  value: string
}

// ---------------------------------------------------------------------------
// Operator maps
// ---------------------------------------------------------------------------

const TEXT_OPERATORS: { value: string; label: string }[] = [
  { value: "contains", label: "contiene" },
  { value: "equals", label: "uguale a" },
  { value: "starts_with", label: "inizia con" },
]

const SELECT_OPERATORS: { value: string; label: string }[] = [
  { value: "equals", label: "uguale a" },
  { value: "not_equals", label: "diverso da" },
]

const DATE_OPERATORS: { value: string; label: string }[] = [
  { value: "before", label: "prima del" },
  { value: "after", label: "dopo il" },
  { value: "between", label: "compreso tra" },
]

const NUMBER_OPERATORS: { value: string; label: string }[] = [
  { value: "equals", label: "uguale a" },
  { value: "gt", label: "maggiore di" },
  { value: "lt", label: "minore di" },
  { value: "gte", label: "maggiore o uguale a" },
  { value: "lte", label: "minore o uguale a" },
]

function getOperatorsForType(
  type: FilterField["type"]
): { value: string; label: string }[] {
  switch (type) {
    case "text":
      return TEXT_OPERATORS
    case "select":
      return SELECT_OPERATORS
    case "date":
      return DATE_OPERATORS
    case "number":
      return NUMBER_OPERATORS
    default:
      return TEXT_OPERATORS
  }
}

function defaultOperatorForType(type: FilterField["type"]): string {
  return getOperatorsForType(type)[0]?.value ?? "equals"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AdvancedFilterBuilderProps {
  filters: FilterRule[]
  onChange: (filters: FilterRule[]) => void
  fields: FilterField[]
}

export function AdvancedFilterBuilder({
  filters,
  onChange,
  fields,
}: AdvancedFilterBuilderProps) {
  const getField = useCallback(
    (key: string): FilterField | undefined => fields.find((f) => f.key === key),
    [fields]
  )

  const handleAddRule = useCallback(() => {
    const firstField = fields[0]
    if (!firstField) return
    const newRule: FilterRule = {
      field: firstField.key,
      operator: defaultOperatorForType(firstField.type),
      value: "",
    }
    onChange([...filters, newRule])
  }, [fields, filters, onChange])

  const handleRemoveRule = useCallback(
    (index: number) => {
      onChange(filters.filter((_, i) => i !== index))
    },
    [filters, onChange]
  )

  const handleFieldChange = useCallback(
    (index: number, fieldKey: string) => {
      const field = fields.find((f) => f.key === fieldKey)
      if (!field) return
      const updated = filters.map((rule, i) =>
        i === index
          ? { field: fieldKey, operator: defaultOperatorForType(field.type), value: "" }
          : rule
      )
      onChange(updated)
    },
    [fields, filters, onChange]
  )

  const handleOperatorChange = useCallback(
    (index: number, operator: string) => {
      const updated = filters.map((rule, i) =>
        i === index ? { ...rule, operator } : rule
      )
      onChange(updated)
    },
    [filters, onChange]
  )

  const handleValueChange = useCallback(
    (index: number, value: string) => {
      const updated = filters.map((rule, i) =>
        i === index ? { ...rule, value } : rule
      )
      onChange(updated)
    },
    [filters, onChange]
  )

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessun campo disponibile per il filtraggio.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {filters.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          Nessun filtro attivo. Clicca &quot;Aggiungi filtro&quot; per iniziare.
        </p>
      )}

      {filters.map((rule, index) => {
        const fieldMeta = getField(rule.field)
        const operators = fieldMeta
          ? getOperatorsForType(fieldMeta.type)
          : TEXT_OPERATORS

        return (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-2"
            role="group"
            aria-label={`Regola filtro ${index + 1}`}
          >
            {/* Field selector */}
            <Select
              value={rule.field}
              onValueChange={(val) => handleFieldChange(index, val)}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Campo" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.key} value={f.key} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator selector */}
            <Select
              value={rule.operator}
              onValueChange={(val) => handleOperatorChange(index, val)}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Operatore" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value} className="text-xs">
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value input */}
            <ValueInput
              fieldMeta={fieldMeta}
              value={rule.value}
              onChange={(val) => handleValueChange(index, val)}
            />

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemoveRule(index)}
              aria-label="Rimuovi filtro"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      })}

      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={handleAddRule}
      >
        <Plus className="h-3.5 w-3.5" />
        Aggiungi filtro
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Value input sub-component
// ---------------------------------------------------------------------------

interface ValueInputProps {
  fieldMeta: FilterField | undefined
  value: string
  onChange: (value: string) => void
}

function ValueInput({ fieldMeta, value, onChange }: ValueInputProps) {
  if (!fieldMeta) {
    return (
      <Input
        className="h-8 w-40 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Valore"
      />
    )
  }

  if (fieldMeta.type === "select" && fieldMeta.options) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="Seleziona..." />
        </SelectTrigger>
        <SelectContent>
          {fieldMeta.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (fieldMeta.type === "date") {
    return (
      <Input
        type="date"
        className="h-8 w-40 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (fieldMeta.type === "number") {
    return (
      <Input
        type="number"
        className="h-8 w-32 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Numero"
      />
    )
  }

  // Default: text
  return (
    <Input
      className="h-8 w-40 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Testo"
    />
  )
}
