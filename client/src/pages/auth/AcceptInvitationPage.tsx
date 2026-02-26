/**
 * AcceptInvitationPage - Public page for accepting project invitations
 * Route: /invite/:token
 * @module pages/auth/AcceptInvitationPage
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  FolderOpen,
} from 'lucide-react'
import api from '@services/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvitationDetails {
  projectName: string
  projectRole: string
  inviterName: string
  email: string
  isExistingUser: boolean
}

type PageStep = 'loading' | 'invalid' | 'form' | 'success'

const PROJECT_ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  member: 'Membro',
  viewer: 'Osservatore',
  guest: 'Ospite',
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const registrationSchema = z
  .object({
    firstName: z.string().min(2, 'Il nome deve avere almeno 2 caratteri').max(50),
    lastName: z.string().min(2, 'Il cognome deve avere almeno 2 caratteri').max(50),
    password: z.string().min(8, 'La password deve avere almeno 8 caratteri'),
    confirmPassword: z.string().min(1, 'Conferma la password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  })

type RegistrationFormData = z.infer<typeof registrationSchema>

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ step }: { step: PageStep }) {
  const steps = [
    { key: 'loading', label: 'Verifica invito...' },
    { key: 'form', label: 'Completa registrazione' },
    { key: 'success', label: 'Registrazione completata!' },
  ] as const

  const activeIndex =
    step === 'loading' ? 0 : step === 'form' ? 1 : step === 'success' ? 2 : -1

  if (step === 'invalid') return null

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, idx) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                idx < activeIndex
                  ? 'bg-primary-500'
                  : idx === activeIndex
                    ? 'bg-primary-600 ring-2 ring-primary-200 dark:ring-primary-800'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                idx === activeIndex
                  ? 'text-primary-600 dark:text-primary-400'
                  : idx < activeIndex
                    ? 'text-gray-500 dark:text-gray-400'
                    : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {s.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`h-px w-8 transition-colors duration-300 ${
                idx < activeIndex
                  ? 'bg-primary-400'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function ProjectRoleBadge({ role }: { role: string }) {
  const label = PROJECT_ROLE_LABELS[role] ?? role
  return (
    <span className="inline-flex items-center rounded-full bg-primary-50 dark:bg-primary-900/30 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-300">
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [step, setStep] = useState<PageStep>('loading')
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [invalidMessage, setInvalidMessage] = useState<string>('Invito non valido o scaduto.')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  })

  // ---------------------------------------------------------------------------
  // Validate token on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!token) {
      setInvalidMessage('Token di invito mancante.')
      setStep('invalid')
      return
    }

    const validateToken = async () => {
      try {
        const response = await api.get(`/invitations/${token}`)
        const data = response.data?.data ?? response.data
        setInvitation({
          projectName: data.projectName ?? 'Progetto',
          projectRole: data.projectRole ?? 'guest',
          inviterName: data.inviterName ?? 'Un amministratore',
          email: data.email ?? '',
          isExistingUser: Boolean(data.isExistingUser),
        })
        setStep('form')
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string; message?: string } } }
        setInvalidMessage(
          error.response?.data?.error ||
            error.response?.data?.message ||
            'Invito non valido o scaduto.'
        )
        setStep('invalid')
      }
    }

    validateToken()
  }, [token])

  // ---------------------------------------------------------------------------
  // Form submission
  // ---------------------------------------------------------------------------

  const onSubmit = async (data: RegistrationFormData) => {
    setSubmitError(null)
    try {
      await api.post(`/invitations/${token}/accept`, {
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      })
      setStep('success')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; message?: string } } }
      setSubmitError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          'Errore durante la registrazione. Riprova.'
      )
    }
  }

  // ---------------------------------------------------------------------------
  // Redirect after success
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (step !== 'success') return
    const timer = setTimeout(() => {
      navigate('/login', { state: { message: 'Registrazione completata! Accedi con le tue credenziali.' } })
    }, 4000)
    return () => clearTimeout(timer)
  }, [step, navigate])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            ProjectPulse
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Sistema di gestione progetti ISO 13485
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator step={step} />

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {/* ----------------------------------------------------------------
              LOADING
          ---------------------------------------------------------------- */}
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  Verifica invito in corso...
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Stiamo controllando la validita del tuo link di invito.
                </p>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------
              INVALID
          ---------------------------------------------------------------- */}
          {step === 'invalid' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Invito non valido
                </h2>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  {invalidMessage}
                </p>
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Se pensi che si tratti di un errore, contatta chi ti ha inviato l&apos;invito per
                ricevere un nuovo link.
              </p>
              <Link
                to="/login"
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                <LogIn className="h-4 w-4" />
                Vai alla pagina di login
              </Link>
            </div>
          )}

          {/* ----------------------------------------------------------------
              FORM - existing user
          ---------------------------------------------------------------- */}
          {step === 'form' && invitation?.isExistingUser && (
            <div className="flex flex-col items-center gap-5 py-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
                <FolderOpen className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Sei stato invitato!
                </h2>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <strong className="text-gray-700 dark:text-gray-300">
                    {invitation.inviterName}
                  </strong>{' '}
                  ti ha invitato a partecipare al progetto
                </p>
                <div className="mt-3 flex flex-col items-center gap-2">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {invitation.projectName}
                  </p>
                  <ProjectRoleBadge role={invitation.projectRole} />
                </div>
              </div>

              <div className="w-full rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-300 text-left">
                Il tuo account ({invitation.email}) esiste gia. Accedi con le tue credenziali per
                unirti al progetto.
              </div>

              <Link to="/login" className="w-full btn-primary flex items-center justify-center gap-2">
                <LogIn className="h-4 w-4" />
                Accedi al tuo account
              </Link>
            </div>
          )}

          {/* ----------------------------------------------------------------
              FORM - new user registration
          ---------------------------------------------------------------- */}
          {step === 'form' && invitation && !invitation.isExistingUser && (
            <div>
              {/* Invitation summary */}
              <div className="mb-6 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 px-4 py-3">
                <div className="flex items-start gap-3">
                  <FolderOpen className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
                      Invito al progetto
                    </p>
                    <p className="mt-0.5 text-sm text-primary-700 dark:text-primary-300 font-semibold truncate">
                      {invitation.projectName}
                    </p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-primary-600 dark:text-primary-400">
                        Invitato da {invitation.inviterName}
                      </span>
                      <span className="text-primary-400 dark:text-primary-600">·</span>
                      <ProjectRoleBadge role={invitation.projectRole} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0">
                  <UserPlus className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
                    Crea il tuo account
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Completa la registrazione per accedere al progetto
                  </p>
                </div>
              </div>

              {/* Error banner */}
              {submitError && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Nome
                    </label>
                    <input
                      {...register('firstName')}
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Mario"
                      className={`input ${errors.firstName ? 'input-error' : ''}`}
                      disabled={isSubmitting}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Cognome
                    </label>
                    <input
                      {...register('lastName')}
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Rossi"
                      className={`input ${errors.lastName ? 'input-error' : ''}`}
                      disabled={isSubmitting}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email - readonly, pre-filled */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={invitation.email}
                    readOnly
                    disabled
                    className="input opacity-70 cursor-not-allowed"
                    aria-describedby="email-note"
                  />
                  <p id="email-note" className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    L&apos;email e precompilata e non modificabile.
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Minimo 8 caratteri"
                      className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Conferma Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Ripeti la password"
                      className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label={
                        showConfirmPassword ? 'Nascondi password' : 'Mostra password'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 w-full btn-primary flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registrazione in corso...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Crea Account e Unisciti al Progetto
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ----------------------------------------------------------------
              SUCCESS
          ---------------------------------------------------------------- */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Registrazione completata!
                </h2>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Il tuo account e stato creato con successo. Sei stato aggiunto al progetto{' '}
                  <strong className="text-gray-700 dark:text-gray-300">
                    {invitation?.projectName}
                  </strong>
                  .
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Reindirizzamento al login tra pochi secondi...</span>
              </div>
              <Link
                to="/login"
                className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                <LogIn className="h-4 w-4" />
                Vai subito al login
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600">
          &copy; {new Date().getFullYear()} MIKAI SPA. Tutti i diritti riservati.
        </p>
      </div>
    </div>
  )
}
