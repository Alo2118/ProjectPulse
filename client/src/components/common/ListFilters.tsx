import { useCallback, useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export interface FilterConfig {
  key: string
  label: string
  type: "search" | "select" | "date"
  options?: { value: string; label: string }[]
  placeholder?: string
}

interface ListFiltersProps {
  filters: FilterConfig[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onClear: () => void
}

const DEBOUNCE_MS = 300

export function ListFilters({ filters, values, onChange, onClear }: ListFiltersProps) {
  const hasActiveFilters = Object.values(values).some((v) => v !== "")

  return (
    <div className="flex flex-wrap items-center gap-3">
      {filters.map((filter) => {
        switch (filter.type) {
          case "search":
            return (
              <SearchInput
                key={filter.key}
                value={values[filter.key] ?? ""}
                placeholder={filter.placeholder ?? `Cerca ${filter.label.toLowerCase()}...`}
                onChange={(val) => onChange(filter.key, val)}
              />
            )
          case "select":
            return (
              <Select
                key={filter.key}
                value={values[filter.key] || "__all__"}
                onValueChange={(val) => onChange(filter.key, val === "__all__" ? "" : val)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tutti</SelectItem>
                  {filter.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          case "date":
            return (
              <Input
                key={filter.key}
                type="date"
                value={values[filter.key] ?? ""}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="w-[180px]"
              />
            )
          default:
            return null
        }
      })}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          <X className="h-4 w-4 mr-1" />
          Pulisci filtri
        </Button>
      )}
    </div>
  )
}

function SearchInput({
  value,
  placeholder,
  onChange,
}: {
  value: string
  placeholder: string
  onChange: (val: string) => void
}) {
  const [local, setLocal] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from parent when value changes externally (e.g. clear)
  useEffect(() => {
    setLocal(value)
  }, [value])

  const handleChange = useCallback(
    (val: string) => {
      setLocal(val)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange(val)
      }, DEBOUNCE_MS)
    },
    [onChange],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 w-[240px]"
      />
    </div>
  )
}
