/**
 * ProjectMembersSection - Manages project members: view, add, change role, remove
 * Self-contained: fetches its own data via API calls.
 * Only shown to users with canManageMembers permission.
 * @module components/projects/ProjectMembersSection
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { Users, Plus, Trash2, ChevronDown, Loader2, X, UserPlus, Shield } from 'lucide-react'
import { useAuthStore } from '@stores/authStore'
import { ConfirmDialog } from '@components/common/ConfirmDialog'
import { EmptyState } from '@components/common/EmptyState'
import { toast } from '@stores/toastStore'
import api from '@services/api'
import { User } from '@/types'
import { getAvatarColor } from '@utils/avatarColors'

// ============================================================
// TYPES
// ============================================================

type ProjectMemberRole = 'owner' | 'manager' | 'member' | 'viewer'

interface ProjectMember {
  id: string
  userId: string
  projectId: string
  role: ProjectMemberRole
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
  }
}

interface ProjectMembersSectionProps {
  projectId: string
}

// ============================================================
// CONSTANTS
// ============================================================

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietario',
  manager: 'Manager',
  member: 'Membro',
  viewer: 'Osservatore',
  guest: 'Ospite',
}

const ROLE_BADGE_CLASSES: Record<string, string> = {
  owner:
    'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/40',
  manager:
    'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40',
  member:
    'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40',
  viewer:
    'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600/40',
  guest:
    'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/40',
}

const MANAGEABLE_ROLES: ProjectMemberRole[] = ['manager', 'member', 'viewer']


// ============================================================
// SUB-COMPONENTS
// ============================================================

interface AvatarProps {
  firstName: string
  lastName: string
  avatarUrl: string | null
  size?: 'sm' | 'md'
}

function Avatar({ firstName, lastName, avatarUrl, size = 'md' }: AvatarProps) {
  const color = getAvatarColor(firstName + lastName)
  const sizeClasses = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        className={`${sizeClasses} rounded-full object-cover flex-shrink-0`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClasses} rounded-full ${color.bg} ${color.text} flex items-center justify-center font-semibold flex-shrink-0 select-none`}
    >
      {firstName.charAt(0).toUpperCase()}
      {lastName.charAt(0).toUpperCase()}
    </div>
  )
}

interface RoleBadgeProps {
  role: string
}

function RoleBadge({ role }: RoleBadgeProps) {
  const classes = ROLE_BADGE_CLASSES[role] ?? ROLE_BADGE_CLASSES.viewer
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

// ============================================================
// ROLE DROPDOWN — inline select with a custom popover
// ============================================================

interface RoleDropdownProps {
  currentRole: ProjectMemberRole
  memberId: string
  disabled: boolean
  onChangeRole: (memberId: string, newRole: ProjectMemberRole) => Promise<void>
}

function RoleDropdown({ currentRole, memberId, disabled, onChangeRole }: RoleDropdownProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = useCallback(
    async (role: ProjectMemberRole) => {
      if (role === currentRole) {
        setOpen(false)
        return
      }
      setLoading(true)
      setOpen(false)
      try {
        await onChangeRole(memberId, role)
      } finally {
        setLoading(false)
      }
    },
    [currentRole, memberId, onChangeRole]
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Cambia ruolo"
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <>
            <span>{ROLE_LABELS[currentRole] ?? currentRole}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Scegli ruolo"
          className="absolute right-0 mt-1 w-40 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-20 py-1 overflow-hidden"
        >
          {MANAGEABLE_ROLES.map((role) => (
            <button
              key={role}
              role="option"
              aria-selected={role === currentRole}
              type="button"
              onClick={() => void handleSelect(role)}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors
                ${role === currentRole
                  ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// ADD MEMBER FORM — inline collapsible panel
// ============================================================

interface AddMemberFormProps {
  projectId: string
  existingUserIds: string[]
  onMemberAdded: (member: ProjectMember) => void
  onClose: () => void
}

function AddMemberForm({ projectId, existingUserIds, onMemberAdded, onClose }: AddMemberFormProps) {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>('member')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [showUserList, setShowUserList] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Fetch all users once
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingUsers(true)
      try {
        const res = await api.get<{ success: boolean; data: User[] }>('/users?limit=200')
        if (!cancelled && res.data.success) {
          setAllUsers(res.data.data)
        }
      } catch {
        if (!cancelled) toast.error('Errore', 'Impossibile caricare la lista utenti')
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  // Close user list on outside click
  useEffect(() => {
    if (!showUserList) return
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowUserList(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUserList])

  const availableUsers = allUsers.filter(
    (u) =>
      !existingUserIds.includes(u.id) &&
      (userSearch.trim() === '' ||
        `${u.firstName} ${u.lastName} ${u.email}`
          .toLowerCase()
          .includes(userSearch.toLowerCase()))
  )

  const selectedUser = allUsers.find((u) => u.id === selectedUserId)

  const handleSelectUser = (user: User) => {
    setSelectedUserId(user.id)
    setUserSearch(`${user.firstName} ${user.lastName}`)
    setShowUserList(false)
  }

  const handleClearUser = () => {
    setSelectedUserId('')
    setUserSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) return

    setIsSubmitting(true)
    try {
      const res = await api.post<{ success: boolean; data: ProjectMember }>(
        `/projects/${projectId}/members`,
        { userId: selectedUserId, role: selectedRole }
      )
      if (res.data.success) {
        onMemberAdded(res.data.data)
        toast.success(
          'Membro aggiunto',
          `${selectedUser?.firstName} ${selectedUser?.lastName} aggiunto al progetto`
        )
        onClose()
      }
    } catch {
      toast.error('Errore', 'Impossibile aggiungere il membro. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          Aggiungi membro
        </h4>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi form"
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-600/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col sm:flex-row gap-3">
        {/* User selector */}
        <div ref={searchRef} className="relative flex-1">
          <label htmlFor="member-search" className="sr-only">
            Cerca utente
          </label>
          <div className="relative">
            <input
              id="member-search"
              type="text"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value)
                setSelectedUserId('')
                setShowUserList(true)
              }}
              onFocus={() => setShowUserList(true)}
              placeholder={loadingUsers ? 'Caricamento utenti...' : 'Cerca utente...'}
              disabled={loadingUsers || isSubmitting}
              autoComplete="off"
              className="input pr-8 text-sm"
            />
            {selectedUserId && (
              <button
                type="button"
                onClick={handleClearUser}
                aria-label="Rimuovi selezione"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {showUserList && !loadingUsers && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-30 max-h-48 overflow-y-auto">
              {availableUsers.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                  {userSearch.trim() ? 'Nessun risultato' : 'Tutti gli utenti sono gia membri'}
                </p>
              ) : (
                availableUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left"
                  >
                    <Avatar
                      firstName={user.firstName}
                      lastName={user.lastName}
                      avatarUrl={user.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Role selector */}
        <div className="flex-shrink-0">
          <label htmlFor="member-role" className="sr-only">
            Ruolo
          </label>
          <select
            id="member-role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as ProjectMemberRole)}
            disabled={isSubmitting}
            className="input text-sm h-full min-w-[130px]"
          >
            {MANAGEABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        {/* Confirm button */}
        <button
          type="submit"
          disabled={!selectedUserId || isSubmitting}
          className="btn-primary flex items-center gap-1.5 text-sm flex-shrink-0 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="w-4 h-4" aria-hidden="true" />
          )}
          Aggiungi
        </button>
      </form>
    </div>
  )
}

// ============================================================
// MEMBER ROW
// ============================================================

interface MemberRowProps {
  member: ProjectMember
  canManage: boolean
  currentUserId: string
  onChangeRole: (memberId: string, newRole: ProjectMemberRole) => Promise<void>
  onRemove: (member: ProjectMember) => void
}

function MemberRow({ member, canManage, currentUserId, onChangeRole, onRemove }: MemberRowProps) {
  const isOwner = member.role === 'owner'
  const isSelf = member.userId === currentUserId

  return (
    <tr className="group border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      {/* Avatar + Name */}
      <td className="py-3 pr-3">
        <div className="flex items-center gap-3">
          <Avatar
            firstName={member.user.firstName}
            lastName={member.user.lastName}
            avatarUrl={member.user.avatarUrl}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {member.user.firstName} {member.user.lastName}
              {isSelf && (
                <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500 font-normal">
                  (tu)
                </span>
              )}
            </p>
          </div>
        </div>
      </td>

      {/* Email */}
      <td className="py-3 pr-3 hidden sm:table-cell">
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
          {member.user.email}
        </p>
      </td>

      {/* Role */}
      <td className="py-3 pr-3">
        {canManage && !isOwner ? (
          <RoleDropdown
            currentRole={member.role}
            memberId={member.id}
            disabled={false}
            onChangeRole={onChangeRole}
          />
        ) : (
          <RoleBadge role={member.role} />
        )}
      </td>

      {/* Actions */}
      {canManage && (
        <td className="py-3 text-right">
          {isOwner ? (
            <span
              aria-label="Il proprietario non puo essere rimosso"
              title="Il proprietario non puo essere rimosso"
              className="inline-flex items-center p-1.5 rounded-md text-slate-300 dark:text-slate-600 cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onRemove(member)}
              aria-label={`Rimuovi ${member.user.firstName} ${member.user.lastName}`}
              className="inline-flex items-center p-1.5 rounded-md text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </td>
      )}
    </tr>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ProjectMembersSection({ projectId }: ProjectMembersSectionProps) {
  const currentUser = useAuthStore((s) => s.user)

  const [members, setMembers] = useState<ProjectMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // ---- Fetch members on mount ----
  useEffect(() => {
    let cancelled = false

    async function fetchMembers() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await api.get<{
          success: boolean
          data: ProjectMember[]
          canManage?: boolean
        }>(`/projects/${projectId}/members`)

        if (!cancelled && res.data.success) {
          setMembers(res.data.data)
          // Server may return canManage; fall back to role-based check
          if (typeof res.data.canManage === 'boolean') {
            setCanManage(res.data.canManage)
          } else {
            const role = currentUser?.role
            setCanManage(role === 'admin' || role === 'direzione')
          }
        }
      } catch {
        if (!cancelled) {
          setError('Impossibile caricare i membri del progetto.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchMembers()
    return () => { cancelled = true }
  }, [projectId, currentUser?.role])

  // ---- Change role (optimistic) ----
  const handleChangeRole = useCallback(
    async (memberId: string, newRole: ProjectMemberRole) => {
      const previous = members
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      )

      try {
        await api.patch(`/projects/${projectId}/members/${memberId}`, { role: newRole })
        toast.success('Ruolo aggiornato', `Ruolo cambiato in ${ROLE_LABELS[newRole]}`)
      } catch {
        setMembers(previous)
        toast.error('Errore', 'Impossibile aggiornare il ruolo. Riprova.')
        throw new Error('update failed')
      }
    },
    [projectId, members]
  )

  // ---- Add member ----
  const handleMemberAdded = useCallback((newMember: ProjectMember) => {
    setMembers((prev) => [...prev, newMember])
  }, [])

  // ---- Remove member ----
  const handleConfirmRemove = useCallback(async () => {
    if (!memberToRemove) return
    setIsRemoving(true)

    // Optimistic update
    const previous = members
    setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id))
    setMemberToRemove(null)

    try {
      await api.delete(`/projects/${projectId}/members/${memberToRemove.id}`)
      toast.success(
        'Membro rimosso',
        `${memberToRemove.user.firstName} ${memberToRemove.user.lastName} rimosso dal progetto`
      )
    } catch {
      setMembers(previous)
      toast.error('Errore', 'Impossibile rimuovere il membro. Riprova.')
    } finally {
      setIsRemoving(false)
    }
  }, [memberToRemove, members, projectId])

  const existingUserIds = members.map((m) => m.userId)

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section
      aria-labelledby="members-section-heading"
      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
        <h2
          id="members-section-heading"
          className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2"
        >
          <Shield className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          Membri del progetto
          {!isLoading && members.length > 0 && (
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              ({members.length})
            </span>
          )}
        </h2>

        {canManage && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Aggiungi membro
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {/* Add member form */}
        {showAddForm && (
          <AddMemberForm
            projectId={projectId}
            existingUserIds={existingUserIds}
            onMemberAdded={handleMemberAdded}
            onClose={() => setShowAddForm(false)}
          />
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-10" aria-live="polite" aria-busy="true">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" aria-hidden="true" />
            <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
              Caricamento membri...
            </span>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3"
          >
            <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-auto text-xs text-red-600 dark:text-red-400 underline hover:no-underline"
            >
              Ricarica
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && members.length === 0 && (
          <EmptyState
            icon={Users}
            title="Nessun membro aggiunto"
            description={
              canManage
                ? 'Aggiungi i membri del team per collaborare su questo progetto.'
                : 'Nessun membro e stato ancora aggiunto a questo progetto.'
            }
            compact
            className="pt-6"
          />
        )}

        {/* Members table */}
        {!isLoading && !error && members.length > 0 && (
          <div className="mt-2 overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[400px]" aria-label="Lista membri progetto">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <th
                    scope="col"
                    className="pb-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide"
                  >
                    Utente
                  </th>
                  <th
                    scope="col"
                    className="pb-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="pb-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide"
                  >
                    Ruolo
                  </th>
                  {canManage && (
                    <th scope="col" className="pb-2">
                      <span className="sr-only">Azioni</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    canManage={canManage}
                    currentUserId={currentUser?.id ?? ''}
                    onChangeRole={handleChangeRole}
                    onRemove={(m) => setMemberToRemove(m)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remove confirmation dialog */}
      <ConfirmDialog
        isOpen={memberToRemove !== null}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => void handleConfirmRemove()}
        title="Rimuovi membro"
        message={
          memberToRemove
            ? `Sei sicuro di voler rimuovere ${memberToRemove.user.firstName} ${memberToRemove.user.lastName} dal progetto? Perdera l'accesso immediatamente.`
            : ''
        }
        confirmLabel="Rimuovi"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={isRemoving}
      />
    </section>
  )
}
