/**
 * CommandPalette - Global search overlay triggered by Ctrl+K
 * @module components/features/CommandPalette
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  CheckSquare,
  FolderOpen,
  User,
  AlertTriangle,
  FileText,
  Loader2,
  X,
} from 'lucide-react'
import { useSearchStore } from '@stores/searchStore'
import type {
  TaskSearchResult,
  ProjectSearchResult,
  UserSearchResult,
  RiskSearchResult,
  DocumentSearchResult,
} from '@stores/searchStore'

// ---------------------------------------------------------------------------
// Types for the flattened result list used for keyboard navigation
// ---------------------------------------------------------------------------

type ResultItem =
  | { kind: 'task'; data: TaskSearchResult }
  | { kind: 'project'; data: ProjectSearchResult }
  | { kind: 'user'; data: UserSearchResult }
  | { kind: 'risk'; data: RiskSearchResult }
  | { kind: 'document'; data: DocumentSearchResult }

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    // Task statuses
    todo: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    // Project statuses
    planning: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    // Risk statuses
    open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    mitigated: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    closed: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    // Document statuses
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    archived: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  }

  const cls = colorMap[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700/50">
      {label}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual result rows
// ---------------------------------------------------------------------------

function TaskRow({ item, selected, onSelect }: { item: TaskSearchResult; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
        selected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.title}
        </span>
        {item.projectName && (
          <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
            {item.projectName}
          </span>
        )}
      </span>
      <span className="text-xs text-gray-400 font-mono shrink-0">{item.code}</span>
      <StatusBadge status={item.status} />
    </button>
  )
}

function ProjectRow({ item, selected, onSelect }: { item: ProjectSearchResult; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
        selected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <FolderOpen className="w-4 h-4 text-purple-500 shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.name}
        </span>
      </span>
      <span className="text-xs text-gray-400 font-mono shrink-0">{item.code}</span>
      <StatusBadge status={item.status} />
    </button>
  )
}

function UserRow({ item, selected, onSelect }: { item: UserSearchResult; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
        selected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <User className="w-4 h-4 text-green-500 shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.firstName} {item.lastName}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
          {item.email}
        </span>
      </span>
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 shrink-0`}>
        {item.role}
      </span>
    </button>
  )
}

function RiskRow({ item, selected, onSelect }: { item: RiskSearchResult; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
        selected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.title}
        </span>
      </span>
      <span className="text-xs text-gray-400 font-mono shrink-0">{item.code}</span>
      <StatusBadge status={item.status} />
    </button>
  )
}

function DocumentRow({ item, selected, onSelect }: { item: DocumentSearchResult; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
        selected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <FileText className="w-4 h-4 text-amber-500 shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.title}
        </span>
      </span>
      <span className="text-xs text-gray-400 font-mono shrink-0">{item.code}</span>
      <StatusBadge status={item.status} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main CommandPalette component
// ---------------------------------------------------------------------------

export default function CommandPalette() {
  const navigate = useNavigate()
  const { isOpen, query, results, isLoading, setQuery, search, close } = useSearchStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Keyboard shortcut to open/close ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          close()
        } else {
          useSearchStore.getState().open()
        }
      }
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  // ---- Focus input when opened ----
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0)
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // ---- Build flat list of results for keyboard navigation ----
  const flatItems: ResultItem[] = []
  if (results) {
    results.tasks.forEach((t) => flatItems.push({ kind: 'task', data: t }))
    results.projects.forEach((p) => flatItems.push({ kind: 'project', data: p }))
    results.users.forEach((u) => flatItems.push({ kind: 'user', data: u }))
    results.risks.forEach((r) => flatItems.push({ kind: 'risk', data: r }))
    results.documents.forEach((d) => flatItems.push({ kind: 'document', data: d }))
  }

  // ---- Navigate on item select ----
  const handleSelect = useCallback(
    (item: ResultItem) => {
      close()
      switch (item.kind) {
        case 'task':
          navigate(`/tasks/${item.data.id}`)
          break
        case 'project':
          navigate(`/projects/${item.data.id}`)
          break
        case 'user':
          navigate(`/users/${item.data.id}/edit`)
          break
        case 'risk':
          navigate(`/risks/${item.data.id}`)
          break
        case 'document':
          navigate(`/documents/${item.data.id}`)
          break
      }
    },
    [close, navigate]
  )

  // ---- Keyboard navigation inside the palette ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + Math.max(flatItems.length, 1)) % Math.max(flatItems.length, 1))
      } else if (e.key === 'Enter' && flatItems.length > 0) {
        e.preventDefault()
        handleSelect(flatItems[selectedIndex])
      }
    },
    [flatItems, selectedIndex, handleSelect]
  )

  // ---- Handle input change with debounce ----
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setSelectedIndex(0)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void search(val)
    }, 300)
  }

  // ---- Compute index offsets for each section ----
  const taskOffset = 0
  const projectOffset = results ? results.tasks.length : 0
  const userOffset = projectOffset + (results ? results.projects.length : 0)
  const riskOffset = userOffset + (results ? results.users.length : 0)
  const documentOffset = riskOffset + (results ? results.risks.length : 0)

  const hasResults = flatItems.length > 0
  const showNoResults = query.trim().length >= 2 && !isLoading && !hasResults

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />

          {/* Palette container */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <motion.div
              key="palette"
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-xl pointer-events-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Ricerca globale"
            >
              <div className="modal-panel overflow-hidden">

                {/* Search input row */}
                <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-gray-400 shrink-0 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Cerca task, progetti, utenti..."
                    aria-label="Cerca"
                    className="w-full px-0 py-3.5 bg-transparent text-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
                  />
                  {query.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setQuery(''); useSearchStore.getState().clear() }}
                      className="btn-icon shrink-0"
                      aria-label="Cancella ricerca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-flex shrink-0 items-center gap-0.5 text-xs text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5">
                    Esc
                  </kbd>
                </div>

                {/* Results area */}
                <div className="max-h-[60vh] overflow-y-auto">

                  {/* Placeholder when query too short */}
                  {query.trim().length < 2 && !isLoading && (
                    <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                      Digita almeno 2 caratteri per cercare...
                    </div>
                  )}

                  {/* No results */}
                  {showNoResults && (
                    <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      Nessun risultato per{' '}
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        &ldquo;{query}&rdquo;
                      </span>
                    </div>
                  )}

                  {/* Task results */}
                  {hasResults && results && results.tasks.length > 0 && (
                    <div>
                      <SectionHeader label="Task" />
                      {results.tasks.map((task, i) => (
                        <TaskRow
                          key={task.id}
                          item={task}
                          selected={selectedIndex === taskOffset + i}
                          onSelect={() => handleSelect({ kind: 'task', data: task })}
                        />
                      ))}
                    </div>
                  )}

                  {/* Project results */}
                  {hasResults && results && results.projects.length > 0 && (
                    <div>
                      <SectionHeader label="Progetti" />
                      {results.projects.map((project, i) => (
                        <ProjectRow
                          key={project.id}
                          item={project}
                          selected={selectedIndex === projectOffset + i}
                          onSelect={() => handleSelect({ kind: 'project', data: project })}
                        />
                      ))}
                    </div>
                  )}

                  {/* User results */}
                  {hasResults && results && results.users.length > 0 && (
                    <div>
                      <SectionHeader label="Utenti" />
                      {results.users.map((user, i) => (
                        <UserRow
                          key={user.id}
                          item={user}
                          selected={selectedIndex === userOffset + i}
                          onSelect={() => handleSelect({ kind: 'user', data: user })}
                        />
                      ))}
                    </div>
                  )}

                  {/* Risk results */}
                  {hasResults && results && results.risks.length > 0 && (
                    <div>
                      <SectionHeader label="Rischi" />
                      {results.risks.map((risk, i) => (
                        <RiskRow
                          key={risk.id}
                          item={risk}
                          selected={selectedIndex === riskOffset + i}
                          onSelect={() => handleSelect({ kind: 'risk', data: risk })}
                        />
                      ))}
                    </div>
                  )}

                  {/* Document results */}
                  {hasResults && results && results.documents.length > 0 && (
                    <div>
                      <SectionHeader label="Documenti" />
                      {results.documents.map((doc, i) => (
                        <DocumentRow
                          key={doc.id}
                          item={doc}
                          selected={selectedIndex === documentOffset + i}
                          onSelect={() => handleSelect({ kind: 'document', data: doc })}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer hint */}
                {hasResults && (
                  <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <kbd className="border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">↑</kbd>
                      <kbd className="border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">↓</kbd>
                      naviga
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">↵</kbd>
                      apri
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">Esc</kbd>
                      chiudi
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
