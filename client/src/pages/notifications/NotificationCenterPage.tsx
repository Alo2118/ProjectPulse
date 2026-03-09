/**
 * NotificationCenterPage - Full-page notification center
 * @module pages/notifications/NotificationCenterPage
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Search,
  Trash2,
  CheckCheck,
  CheckCircle,
  MessageSquare,
  Volume2,
  VolumeX,
  Monitor,
  MonitorOff,
  Filter,
  X,
  ChevronDown,
} from 'lucide-react'
import { useNotificationStore } from '@stores/notificationStore'
import { EmptyState } from '@components/common/EmptyState'
import { Pagination } from '@components/common/Pagination'
import type { Notification, NotificationType } from '@/types'
import { LOCALE } from '@/constants'
import {
  NOTIFICATION_ICON_MAP as iconMap,
  NOTIFICATION_COLOR_MAP as colorMap,
  NOTIFICATION_BG_MAP,
  NOTIFICATION_LABEL_MAP,
} from '@utils/notificationDisplay'

// ---------------------------------------------------------------------------
// Time formatting — Italian locale
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'ora'
  if (minutes < 60) return `${minutes}m fa`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}g fa`
  return new Date(dateStr).toLocaleDateString(LOCALE)
}

// ---------------------------------------------------------------------------
// Navigate-on-click helper — derives route from notification.data
// ---------------------------------------------------------------------------

function resolveRoute(notification: Notification): string | null {
  const data = notification.data
  if (!data) return null
  if (data.taskId) return `/tasks/${data.taskId}`
  if (data.projectId) return `/projects/${data.projectId}`
  if (data.inputId) return `/inputs/${data.inputId}`
  if (data.riskId) return `/risks/${data.riskId}`
  if (data.documentId) return `/documents/${data.documentId}`
  return null
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type ReadFilter = 'all' | 'unread' | 'read'

// ---------------------------------------------------------------------------
// NotificationCard — full-width card for the center page
// ---------------------------------------------------------------------------

interface NotificationCardProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onClick: (notification: Notification) => void
}

function NotificationCard({ notification, onMarkAsRead, onDelete, onClick }: NotificationCardProps) {
  const Icon = iconMap[notification.type] ?? MessageSquare
  const iconColor = colorMap[notification.type] ?? 'text-themed-secondary'
  const iconBg = NOTIFICATION_BG_MAP[notification.type] ?? 'bg-[var(--bg-hover)]'

  const handleCardClick = useCallback(() => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }
    onClick(notification)
  }, [notification, onMarkAsRead, onClick])

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete(notification.id)
    },
    [notification.id, onDelete]
  )

  const handleMarkRead = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onMarkAsRead(notification.id)
    },
    [notification.id, onMarkAsRead]
  )

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Notifica: ${notification.title}`}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      className={`
        group relative flex items-start gap-4 p-4 rounded-xl border cursor-pointer
        transition-all duration-200 backdrop-blur-md
        ${notification.isRead
          ? 'bg-[var(--bg-card)] border-[var(--border-default)]'
          : 'bg-[var(--accent-primary-bg)]/40 border-[var(--accent-primary)]/60'
        }
      `}
    >
      {/* Unread dot */}
      {!notification.isRead && (
        <span
          aria-label="Non letta"
          className="absolute top-4 right-12 w-2 h-2 rounded-full bg-[var(--accent-primary)] flex-shrink-0 shadow-glow-accent"
        />
      )}

      {/* Icon bubble */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm leading-snug ${
              notification.isRead
                ? 'text-themed-label'
                : 'text-themed-heading font-semibold'
            }`}
          >
            {notification.title}
          </p>
          <span className="flex-shrink-0 text-xs text-themed-tertiary mt-0.5 whitespace-nowrap font-mono">
            {timeAgo(notification.createdAt)}
          </span>
        </div>

        <p className="mt-1 text-sm text-themed-secondary line-clamp-2">
          {notification.message}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-hover)]/50 text-themed-secondary border border-[var(--border-default)]">
            {NOTIFICATION_LABEL_MAP[notification.type] ?? notification.type}
          </span>
        </div>
      </div>

      {/* Action buttons — visible on hover */}
      <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {!notification.isRead && (
          <button
            onClick={handleMarkRead}
            title="Segna come letta"
            aria-label="Segna come letta"
            className="p-1.5 rounded-lg text-themed-tertiary hover:text-semantic-success hover:bg-semantic-success transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleDelete}
          title="Elimina notifica"
          aria-label="Elimina notifica"
          className="p-1.5 rounded-lg text-themed-tertiary hover:text-semantic-danger hover:bg-semantic-danger transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-4 flex items-start gap-4">
          <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between gap-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-16" />
            </div>
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
            <div className="skeleton h-5 w-28 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toggle button for read/unread filter
// ---------------------------------------------------------------------------

interface ReadFilterButtonProps {
  value: ReadFilter
  current: ReadFilter
  label: string
  onClick: (v: ReadFilter) => void
}

function ReadFilterButton({ value, current, label, onClick }: ReadFilterButtonProps) {
  const active = value === current
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
        active
          ? 'bg-[var(--accent-primary)]/15 text-themed-accent border border-[var(--accent-primary)]/40 shadow-sm'
          : 'bg-transparent border border-[var(--border-default)] text-themed-secondary hover:border-[var(--accent-primary)]/30'
      }`}
    >
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Preference toggle row
// ---------------------------------------------------------------------------

interface PrefRowProps {
  icon: React.ElementType
  offIcon: React.ElementType
  label: string
  description: string
  enabled: boolean
  onToggle: (v: boolean) => void
}

function PrefRow({ icon: OnIcon, offIcon: OffIcon, label, description, enabled, onToggle }: PrefRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${enabled ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20' : 'bg-[var(--bg-hover)]/50 border-[var(--border-default)]'}`}>
          {enabled
            ? <OnIcon className="w-4 h-4 text-themed-accent" />
            : <OffIcon className="w-4 h-4 text-themed-tertiary" />
          }
        </div>
        <div>
          <p className="text-sm font-medium text-themed-label">{label}</p>
          <p className="text-xs text-themed-secondary">{description}</p>
        </div>
      </div>

      {/* Toggle switch */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 ${
          enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-default)]'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function NotificationCenterPage() {
  const navigate = useNavigate()

  const {
    notifications,
    unreadCount,
    isLoading,
    pagination,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    desktopEnabled,
    setDesktopEnabled,
    soundEnabled,
    setSoundEnabled,
  } = useNotificationStore()

  // Local filter state — purely client-side over the fetched page
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('')
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch on mount and page change
  useEffect(() => {
    void fetchNotifications(currentPage)
  }, [currentPage, fetchNotifications])

  // Reset page when filters change so the user does not land on an empty page
  const handleTypeFilterChange = useCallback((value: NotificationType | '') => {
    setTypeFilter(value)
  }, [])

  const handleReadFilterChange = useCallback((value: ReadFilter) => {
    setReadFilter(value)
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const clearSearch = useCallback(() => setSearchQuery(''), [])

  // Client-side filtering over the current page's notifications
  const filtered = useMemo(() => {
    let result = notifications

    if (readFilter === 'unread') {
      result = result.filter((n) => !n.isRead)
    } else if (readFilter === 'read') {
      result = result.filter((n) => n.isRead)
    }

    if (typeFilter) {
      result = result.filter((n) => n.type === typeFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q)
      )
    }

    return result
  }, [notifications, readFilter, typeFilter, searchQuery])

  const hasActiveFilters = readFilter !== 'all' || typeFilter !== '' || searchQuery.trim() !== ''

  const handleClearFilters = useCallback(() => {
    setReadFilter('all')
    setTypeFilter('')
    setSearchQuery('')
  }, [])

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      const route = resolveRoute(notification)
      if (route) {
        navigate(route)
      }
    },
    [navigate]
  )

  const handleDeleteRead = useCallback(async () => {
    const readIds = notifications.filter((n) => n.isRead).map((n) => n.id)
    // Fire deletions sequentially to avoid overwhelming the API
    for (const id of readIds) {
      await deleteNotification(id)
    }
  }, [notifications, deleteNotification])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const readCount = useMemo(() => notifications.filter((n) => n.isRead).length, [notifications])

  // All possible type options for the dropdown — only those present in the current fetch
  const availableTypes = useMemo<NotificationType[]>(() => {
    const types = new Set(notifications.map((n) => n.type))
    return Array.from(types).sort()
  }, [notifications])

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------------ */}
      {/* Page Header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-themed-accent" aria-hidden="true" />
          </div>
          <div>
            <h1 className="page-title leading-tight">
              Centro Notifiche
            </h1>
            <p className="text-sm page-subtitle mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} notifich${unreadCount === 1 ? 'a' : 'e'} non lett${unreadCount === 1 ? 'a' : 'e'}`
                : 'Tutte le notifiche lette'}
            </p>
          </div>
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} non lette`}
              className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-[var(--accent-primary)] text-white text-xs font-bold shadow-glow-accent"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0}
            className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-40"
          >
            <CheckCheck className="w-4 h-4" aria-hidden="true" />
            Segna tutte come lette
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteRead()}
            disabled={readCount === 0}
            className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-40 hover:text-semantic-danger"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Elimina lette
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter Bar                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Text search */}
          <div className="relative flex-1 min-w-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-themed-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cerca notifiche..."
              aria-label="Cerca notifiche"
              className="input pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Cancella ricerca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-themed-tertiary hover:text-themed-secondary transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type filter dropdown */}
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-themed-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value as NotificationType | '')}
              aria-label="Filtra per tipo"
              className="appearance-none w-full sm:w-52 pl-9 pr-8 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-sm text-themed-heading focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 transition-colors cursor-pointer"
            >
              <option value="">Tutti i tipi</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {NOTIFICATION_LABEL_MAP[type]}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-themed-tertiary pointer-events-none"
              aria-hidden="true"
            />
          </div>

          {/* Read/unread toggle */}
          <div className="flex items-center gap-1 bg-[var(--bg-hover)]/60 rounded-lg p-1">
            <ReadFilterButton value="all" current={readFilter} label="Tutte" onClick={handleReadFilterChange} />
            <ReadFilterButton value="unread" current={readFilter} label="Non lette" onClick={handleReadFilterChange} />
            <ReadFilterButton value="read" current={readFilter} label="Lette" onClick={handleReadFilterChange} />
          </div>
        </div>

        {/* Active filter summary */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-themed-secondary">
              {filtered.length} risultat{filtered.length === 1 ? 'o' : 'i'}
            </span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-themed-accent hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Azzera filtri
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Notification List                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div>
        {isLoading && notifications.length === 0 ? (
          <NotificationSkeleton />
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Bell}
              title={hasActiveFilters ? 'Nessun risultato' : 'Nessuna notifica'}
              description={
                hasActiveFilters
                  ? 'Nessuna notifica corrisponde ai filtri selezionati. Prova ad azzerare i filtri.'
                  : 'Sei in pari con le notifiche. Quando arriveranno nuovi aggiornamenti li troverai qui.'
              }
              action={
                hasActiveFilters
                  ? { label: 'Azzera filtri', onClick: handleClearFilters }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="Lista notifiche">
            {filtered.map((notification) => (
              <div key={notification.id} role="listitem">
                <NotificationCard
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onClick={handleNotificationClick}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination                                                          */}
      {/* ------------------------------------------------------------------ */}
      {pagination && pagination.pages > 1 && !hasActiveFilters && (
        <div className="card p-5">
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Preferences Section                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-themed-heading mb-3">
          Preferenze notifiche
        </h2>
        <p className="text-xs text-themed-secondary mb-3">
          Gestisci come ricevi le notifiche sul tuo dispositivo.
        </p>

        <div className="divide-y divide-[var(--border-default)]">
          <PrefRow
            icon={Monitor}
            offIcon={MonitorOff}
            label="Notifiche desktop"
            description="Mostra notifiche push del browser anche quando l'app non e' in primo piano"
            enabled={desktopEnabled}
            onToggle={setDesktopEnabled}
          />
          <PrefRow
            icon={Volume2}
            offIcon={VolumeX}
            label="Suono notifiche"
            description="Riproduci un suono quando arriva una nuova notifica"
            enabled={soundEnabled}
            onToggle={setSoundEnabled}
          />
        </div>
      </div>
    </div>
  )
}
