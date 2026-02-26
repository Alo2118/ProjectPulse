/**
 * SavedViewsBar - Horizontal pill bar for switching between saved filter views
 * Shows the user's views and shared team views for a given entity.
 * @module components/features/SavedViewsBar
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Users, Star, Edit2, Share2, Lock, Trash2, Check } from 'lucide-react'
import { useSavedViewStore } from '@stores/savedViewStore'
import { useAuthStore } from '@stores/authStore'
import { SaveViewModal } from './SaveViewModal'
import type { SavedView, SavedViewEntity } from '@/types'

interface SavedViewsBarProps {
  entity: SavedViewEntity
  currentFilters: Record<string, unknown>
  onApplyView: (filters: Record<string, unknown>, sortBy?: string, sortOrder?: string) => void
  sortBy?: string
  sortOrder?: string
}

interface ContextMenu {
  viewId: string
  x: number
  y: number
}

export function SavedViewsBar({
  entity,
  currentFilters,
  onApplyView,
  sortBy,
  sortOrder,
}: SavedViewsBarProps) {
  const { views, activeViewId, isLoading, fetchViews, deleteView, updateView, setActiveView } =
    useSavedViewStore()
  const { user } = useAuthStore()

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [editingView, setEditingView] = useState<SavedView | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Filter views for this entity
  const entityViews = views.filter((v) => v.entity === entity)

  useEffect(() => {
    fetchViews(entity)
  }, [entity, fetchViews])

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  const handlePillClick = useCallback(
    (view: SavedView) => {
      if (activeViewId === view.id) {
        // Deactivate: reset to "Tutti"
        setActiveView(null)
        onApplyView({})
      } else {
        setActiveView(view.id)
        onApplyView(
          view.filters as Record<string, unknown>,
          view.sortBy ?? undefined,
          view.sortOrder ?? undefined
        )
      }
      setContextMenu(null)
    },
    [activeViewId, setActiveView, onApplyView]
  )

  const handleTuttiClick = useCallback(() => {
    setActiveView(null)
    onApplyView({})
    setContextMenu(null)
  }, [setActiveView, onApplyView])

  const handleRightClick = useCallback((e: React.MouseEvent, viewId: string) => {
    e.preventDefault()
    setContextMenu({ viewId, x: e.clientX, y: e.clientY })
  }, [])

  const handleContextAction = useCallback(
    async (action: string, viewId: string) => {
      setContextMenu(null)
      const view = entityViews.find((v) => v.id === viewId)
      if (!view) return

      switch (action) {
        case 'rename':
        case 'edit':
          setEditingView(view)
          setShowSaveModal(true)
          break
        case 'share':
          await updateView(viewId, { isShared: !view.isShared })
          break
        case 'default':
          await updateView(viewId, { isDefault: !view.isDefault })
          break
        case 'delete':
          setDeletingId(viewId)
          try {
            await deleteView(viewId)
            if (activeViewId === viewId) {
              setActiveView(null)
              onApplyView({})
            }
          } finally {
            setDeletingId(null)
          }
          break
      }
    },
    [entityViews, updateView, deleteView, activeViewId, setActiveView, onApplyView]
  )

  const handleSaveNew = useCallback(() => {
    setEditingView(undefined)
    setShowSaveModal(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowSaveModal(false)
    setEditingView(undefined)
  }, [])

  const handleModalSaved = useCallback(
    (view: SavedView) => {
      // Auto-activate the newly saved/updated view
      setActiveView(view.id)
    },
    [setActiveView]
  )

  if (isLoading && entityViews.length === 0) {
    return (
      <div className="flex items-center gap-2 px-1 py-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-7 w-24 rounded-full" />
        ))}
      </div>
    )
  }

  const contextView = contextMenu ? entityViews.find((v) => v.id === contextMenu.viewId) : null
  const isOwner = contextView ? contextView.userId === user?.id : false

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {/* "Tutti" pill — always first */}
        <button
          onClick={handleTuttiClick}
          className={`flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            activeViewId === null
              ? 'bg-cyan-500 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Tutti
        </button>

        {/* Saved view pills */}
        {entityViews.map((view) => {
          const isActive = activeViewId === view.id
          const isBeingDeleted = deletingId === view.id

          return (
            <button
              key={view.id}
              onClick={() => handlePillClick(view)}
              onContextMenu={(e) => handleRightClick(e, view.id)}
              disabled={isBeingDeleted}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
                isActive
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
              title={view.isShared ? 'Vista condivisa — tasto destro per opzioni' : 'Tasto destro per opzioni'}
            >
              {/* Indicators */}
              {view.isDefault && (
                <Star
                  className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-yellow-200' : 'text-amber-500'}`}
                />
              )}
              {view.isShared && !view.isDefault && (
                <Users
                  className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-blue-200' : 'text-blue-500'}`}
                />
              )}
              <span className="truncate max-w-[140px]">{view.name}</span>
            </button>
          )
        })}

        {/* Save current filters button */}
        <button
          onClick={handleSaveNew}
          className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
          title="Salva i filtri correnti come nuova vista"
          aria-label="Salva vista corrente"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Salva</span>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && contextView && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {isOwner && (
            <button
              onClick={() => handleContextAction('edit', contextMenu.viewId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
              Rinomina / Modifica
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => handleContextAction('share', contextMenu.viewId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {contextView.isShared ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Rendi privata
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  Condividi con il team
                </>
              )}
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => handleContextAction('default', contextMenu.viewId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {contextView.isDefault ? (
                <>
                  <Check className="w-3.5 h-3.5 text-amber-500" />
                  Rimuovi come predefinita
                </>
              ) : (
                <>
                  <Star className="w-3.5 h-3.5 text-slate-400" />
                  Imposta come predefinita
                </>
              )}
            </button>
          )}

          {isOwner && (
            <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
              <button
                onClick={() => handleContextAction('delete', contextMenu.viewId)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Elimina vista
              </button>
            </div>
          )}

          {!isOwner && (
            <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic">
              Vista condivisa da{' '}
              {contextView.user
                ? `${contextView.user.firstName} ${contextView.user.lastName}`
                : 'un collega'}
            </div>
          )}
        </div>
      )}

      {/* Save/Edit Modal */}
      <SaveViewModal
        isOpen={showSaveModal}
        onClose={handleModalClose}
        entity={entity}
        filters={currentFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        existingView={editingView}
        onSaved={handleModalSaved}
      />
    </>
  )
}
