/**
 * TagInput - Component for adding/removing tags on an entity
 * Shows current tags as removable badges with autocomplete dropdown
 * @module components/tags/TagInput
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Search } from 'lucide-react'
import { Tag, TaggableEntityType } from '@/types'
import { TAG_COLORS } from '@/constants'
import { useTagStore } from '@/stores/tagStore'
import TagBadge from './TagBadge'

interface TagInputProps {
  entityType: TaggableEntityType
  entityId: string | null
  value: Tag[]
  onChange: (tags: Tag[]) => void
}

export default function TagInput({ entityType, entityId, value, onChange }: TagInputProps) {
  const { tags: allTags, fetchTags, createTag, assignTag, unassignTag } = useTagStore()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showNewTagForm, setShowNewTagForm] = useState(false)
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5].value) // default Blu
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowNewTagForm(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedIds = new Set(value.map((t) => t.id))

  const filtered = allTags.filter(
    (t) => !selectedIds.has(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  )

  const exactMatch = allTags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase())

  const handleSelectTag = useCallback(async (tag: Tag) => {
    if (entityId) {
      try {
        await assignTag(tag.id, entityType, entityId)
      } catch {
        // ignore duplicate assignment errors
      }
    }
    onChange([...value, tag])
    setSearch('')
    setIsOpen(false)
  }, [entityId, entityType, assignTag, onChange, value])

  const handleRemoveTag = useCallback(async (tagId: string) => {
    if (entityId) {
      await unassignTag(tagId, entityType, entityId)
    }
    onChange(value.filter((t) => t.id !== tagId))
  }, [entityId, entityType, unassignTag, onChange, value])

  const handleCreateTag = useCallback(async () => {
    const name = search.trim()
    if (!name) return

    try {
      const newTag = await createTag({ name, color: newTagColor })
      if (entityId) {
        try {
          await assignTag(newTag.id, entityType, entityId)
        } catch {
          // ignore
        }
      }
      onChange([...value, newTag])
      setSearch('')
      setShowNewTagForm(false)
      setIsOpen(false)
    } catch {
      // tag name might already exist
    }
  }, [search, newTagColor, createTag, entityId, assignTag, entityType, onChange, value])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current tags + add button */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-[2rem]">
        {value.map((tag) => (
          <TagBadge
            key={tag.id}
            tag={tag}
            size="sm"
            onRemove={() => handleRemoveTag(tag.id)}
          />
        ))}
        <button
          type="button"
          onClick={() => {
            setIsOpen(true)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Tag
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) {
                    e.preventDefault()
                    if (filtered.length > 0) {
                      handleSelectTag(filtered[0])
                    } else if (!exactMatch) {
                      setShowNewTagForm(true)
                    }
                  }
                  if (e.key === 'Escape') {
                    setIsOpen(false)
                    setSearch('')
                  }
                }}
                placeholder="Cerca o crea tag..."
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Tag list */}
          <div className="max-h-40 overflow-y-auto p-1">
            {filtered.length > 0 ? (
              filtered.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleSelectTag(tag)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-gray-700 dark:text-gray-300 truncate">{tag.name}</span>
                </button>
              ))
            ) : search.trim() && !exactMatch ? (
              <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
                Nessun tag trovato
              </div>
            ) : (
              <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
                {allTags.length === 0 ? 'Nessun tag disponibile' : 'Tutti i tag sono già assegnati'}
              </div>
            )}
          </div>

          {/* Create new tag */}
          {search.trim() && !exactMatch && !showNewTagForm && (
            <div className="border-t border-gray-100 dark:border-gray-700 p-1">
              <button
                type="button"
                onClick={() => setShowNewTagForm(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Crea &quot;{search.trim()}&quot;
              </button>
            </div>
          )}

          {/* New tag form - color picker */}
          {showNewTagForm && (
            <div className="border-t border-gray-100 dark:border-gray-700 p-3 space-y-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Colore per &quot;{search.trim()}&quot;
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewTagColor(c.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      newTagColor === c.value
                        ? 'border-gray-800 dark:border-white scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleCreateTag}
                className="w-full mt-1 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Crea tag
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
