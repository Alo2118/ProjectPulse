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
  Clock,
  Search,
  X,
} from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/stores/uiStore"
import { useSearchQuery, type SearchDomain } from "@/hooks/api/useSearch"
import { cn } from "@/lib/utils"

const DOMAIN_TABS: Array<{ value: SearchDomain; label: string; icon: React.ElementType }> = [
  { value: "all", label: "Tutto", icon: Search },
  { value: "tasks", label: "Task", icon: CheckSquare },
  { value: "projects", label: "Progetti", icon: FolderKanban },
  { value: "users", label: "Utenti", icon: Users },
  { value: "risks", label: "Rischi", icon: AlertTriangle },
  { value: "documents", label: "Documenti", icon: FileText },
]

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen)
  const setOpen = useUIStore((s) => s.setCommandPalette)
  const recentSearches = useUIStore((s) => s.recentSearches)
  const addRecentSearch = useUIStore((s) => s.addRecentSearch)
  const clearRecentSearches = useUIStore((s) => s.clearRecentSearches)
  const navigate = useNavigate()

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [activeDomain, setActiveDomain] = useState<SearchDomain>("all")

  // Debounce query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isLoading } = useSearchQuery(debouncedQuery, activeDomain)

  const handleSelect = useCallback(
    (path: string) => {
      if (debouncedQuery.length >= 2) {
        addRecentSearch(debouncedQuery)
      }
      navigate(path)
      setOpen(false)
      setQuery("")
      setActiveDomain("all")
    },
    [navigate, setOpen, debouncedQuery, addRecentSearch]
  )

  const handleOpenChange = useCallback(
    (value: boolean) => {
      setOpen(value)
      if (!value) {
        setQuery("")
        setActiveDomain("all")
      }
    },
    [setOpen]
  )

  const handleRecentSearchClick = useCallback(
    (recentQuery: string) => {
      setQuery(recentQuery)
    },
    []
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
  const showRecentSearches = !showSearch && recentSearches.length > 0

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Cerca task, progetti, utenti..."
        value={query}
        onValueChange={setQuery}
      />

      {/* Domain filter tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        {DOMAIN_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveDomain(tab.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                activeDomain === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

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

        {/* Recent searches (shown when input is empty) */}
        {showRecentSearches && (
          <CommandGroup
            heading={
              <span className="flex items-center justify-between w-full">
                <span>Ricerche recenti</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-0 px-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearRecentSearches()
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancella cronologia
                </Button>
              </span>
            }
          >
            {recentSearches.map((recent) => (
              <CommandItem
                key={`recent-${recent.timestamp}`}
                value={`recent-${recent.query}`}
                onSelect={() => handleRecentSearchClick(recent.query)}
              >
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{recent.query}</span>
              </CommandItem>
            ))}
          </CommandGroup>
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
