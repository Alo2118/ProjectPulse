import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  CheckSquare,
  FolderKanban,
  Users,
  AlertTriangle,
  FileText,
  Plus,
  BarChart3,
  Loader2,
} from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { useUIStore } from "@/stores/uiStore"
import { useSearchQuery } from "@/hooks/api/useSearch"

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen)
  const setOpen = useUIStore((s) => s.setCommandPalette)
  const navigate = useNavigate()

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Debounce query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, setOpen])

  const { data: results, isLoading } = useSearchQuery(debouncedQuery)

  const handleSelect = useCallback(
    (path: string) => {
      navigate(path)
      setOpen(false)
      setQuery("")
    },
    [navigate, setOpen]
  )

  const handleOpenChange = useCallback(
    (value: boolean) => {
      setOpen(value)
      if (!value) setQuery("")
    },
    [setOpen]
  )

  const tasks = results?.tasks ?? []
  const projects = results?.projects ?? []
  const users = results?.users ?? []
  const risks = results?.risks ?? []
  const documents = results?.documents ?? []

  const hasResults =
    tasks.length > 0 ||
    projects.length > 0 ||
    users.length > 0 ||
    risks.length > 0 ||
    documents.length > 0

  const showSearch = debouncedQuery.length >= 2

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Cerca task, progetti, utenti..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {showSearch && isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {showSearch && !isLoading && !hasResults && (
          <CommandEmpty>
            Nessun risultato per &apos;{debouncedQuery}&apos;
          </CommandEmpty>
        )}

        {showSearch && !isLoading && hasResults && (
          <>
            {tasks.length > 0 && (
              <CommandGroup heading="Task">
                {tasks.map((t: Record<string, string>) => (
                  <CommandItem
                    key={t.id}
                    value={`task-${t.id}`}
                    onSelect={() => handleSelect(`/tasks/${t.id}`)}
                  >
                    <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1.5">
                      {t.code}
                    </span>
                    <span>{t.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {projects.length > 0 && (
              <CommandGroup heading="Progetti">
                {projects.map((p: Record<string, string>) => (
                  <CommandItem
                    key={p.id}
                    value={`project-${p.id}`}
                    onSelect={() => handleSelect(`/projects/${p.id}`)}
                  >
                    <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {users.length > 0 && (
              <CommandGroup heading="Utenti">
                {users.map((u: Record<string, string>) => (
                  <CommandItem
                    key={u.id}
                    value={`user-${u.id}`}
                    onSelect={() => handleSelect(`/users/${u.id}`)}
                  >
                    <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>
                      {u.firstName} {u.lastName}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {risks.length > 0 && (
              <CommandGroup heading="Rischi">
                {risks.map((r: Record<string, string>) => (
                  <CommandItem
                    key={r.id}
                    value={`risk-${r.id}`}
                    onSelect={() => handleSelect(`/risks/${r.id}`)}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1.5">
                      {r.code}
                    </span>
                    <span>{r.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {documents.length > 0 && (
              <CommandGroup heading="Documenti">
                {documents.map((d: Record<string, string>) => (
                  <CommandItem
                    key={d.id}
                    value={`document-${d.id}`}
                    onSelect={() => handleSelect(`/documents/${d.id}`)}
                  >
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground mr-1.5">
                      {d.code}
                    </span>
                    <span>{d.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}

        {!showSearch && (
          <CommandGroup heading="Azioni rapide">
            <CommandItem
              value="nuovo-task"
              onSelect={() => handleSelect("/tasks/new")}
            >
              <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Nuovo Task</span>
            </CommandItem>
            <CommandItem
              value="nuovo-progetto"
              onSelect={() => handleSelect("/projects/new")}
            >
              <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Nuovo Progetto</span>
            </CommandItem>
            <CommandItem
              value="analytics"
              onSelect={() => handleSelect("/analytics")}
            >
              <BarChart3 className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Analytics</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
