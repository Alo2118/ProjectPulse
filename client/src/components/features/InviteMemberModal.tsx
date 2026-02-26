/**
 * InviteMemberModal - Invite external users to a project
 * @module components/features/InviteMemberModal
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import api from '@services/api'
import { BaseModal } from '@components/ui/BaseModal'

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export interface InviteMemberModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onInviteSent: () => void
}

type ProjectRole = 'manager' | 'member' | 'viewer' | 'guest'

const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  manager: 'Manager',
  member: 'Membro',
  viewer: 'Osservatore',
  guest: 'Ospite',
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const inviteSchema = z.object({
  email: z
    .string()
    .min(1, "L'email è obbligatoria")
    .email('Inserisci un indirizzo email valido'),
  projectRole: z.enum(['manager', 'member', 'viewer', 'guest']),
})

type InviteFormData = z.infer<typeof inviteSchema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InviteMemberModal({
  projectId,
  isOpen,
  onClose,
  onInviteSent,
}: InviteMemberModalProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      projectRole: 'guest',
    },
  })

  const handleClose = () => {
    if (isSubmitting) return
    reset()
    setSubmitError(null)
    setInviteSent(false)
    onClose()
  }

  const onSubmit = async (data: InviteFormData) => {
    setSubmitError(null)
    try {
      await api.post(`/projects/${projectId}/invite`, {
        email: data.email,
        projectRole: data.projectRole,
      })
      setInviteSent(true)
      onInviteSent()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; message?: string } } }
      setSubmitError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Errore durante l'invio dell'invito. Riprova."
      )
    }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      showCloseButton={false}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
            <Mail className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h2
            id="invite-modal-title"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            Invita Membro Esterno
          </h2>
        </div>
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="btn-icon disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Chiudi"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700" />

      {/* Content */}
      <div className="p-6">
        {/* Success state */}
        {inviteSent ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-base font-medium text-slate-900 dark:text-white">
                Invito inviato con successo!
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                L'utente ricevera un'email con le istruzioni per accedere al progetto.
              </p>
            </div>
            <div className="flex gap-3 pt-2 w-full">
              <button
                type="button"
                onClick={() => {
                  reset()
                  setInviteSent(false)
                  setSubmitError(null)
                }}
                className="flex-1 btn-secondary"
              >
                Invia un altro
              </button>
              <button type="button" onClick={handleClose} className="flex-1 btn-primary">
                Chiudi
              </button>
            </div>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Error banner */}
            {submitError && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Email field */}
            <div>
              <label
                htmlFor="invite-email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email
              </label>
              <input
                {...register('email')}
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="nome@esempio.com"
                className={`input ${errors.email ? 'input-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Role selector */}
            <div>
              <label
                htmlFor="invite-role"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Ruolo nel progetto
              </label>
              <select
                {...register('projectRole')}
                id="invite-role"
                className="input"
                disabled={isSubmitting}
              >
                {(Object.entries(PROJECT_ROLE_LABELS) as [ProjectRole, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
              {errors.projectRole && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors.projectRole.message}
                </p>
              )}
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Gli ospiti hanno accesso limitato solo alle risorse condivise con loro.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="btn-secondary"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Invia Invito
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </BaseModal>
  )
}
