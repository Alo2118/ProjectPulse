// --- Status / Priority Labels (Italian) ---

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "Attivo",
  on_hold: "In Pausa",
  cancelled: "Annullato",
  completed: "Completato",
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "Da fare",
  in_progress: "In corso",
  review: "In revisione",
  blocked: "Bloccato",
  done: "Completato",
  cancelled: "Annullato",
}

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
  critical: "Critica",
}

export const RISK_STATUS_LABELS: Record<string, string> = {
  open: "Aperto",
  mitigated: "Mitigato",
  accepted: "Accettato",
  closed: "Chiuso",
}

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  review: "In Revisione",
  approved: "Approvato",
  obsolete: "Obsoleto",
}

export const INPUT_STATUS_LABELS: Record<string, string> = {
  pending: "In Attesa",
  processing: "In Lavorazione",
  resolved: "Risolto",
}

export const PHASE_COLORS: Record<string, string> = {
  gray: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  yellow: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

// --- Task Type ---

export const TASK_TYPE_LABELS: Record<string, string> = {
  milestone: "Milestone",
  task: "Task",
  subtask: "Sottotask",
}

export const TASK_TYPE_COLORS: Record<string, string> = {
  milestone: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  task: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  subtask: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
}

// --- Risk ---

export const RISK_CATEGORY_LABELS: Record<string, string> = {
  technical: "Tecnico",
  regulatory: "Normativo",
  resource: "Risorse",
  schedule: "Tempistica",
}

export const RISK_SCALE_LABELS: Record<number, string> = {
  1: 'Molto bassa',
  2: 'Bassa',
  3: 'Media',
  4: 'Alta',
  5: 'Molto alta',
}

export const RISK_SCALE_MIN = 1
export const RISK_SCALE_MAX = 5
export const RISK_CRITICAL_THRESHOLD = 15
export const RISK_HIGH_THRESHOLD = 10
export const RISK_MEDIUM_THRESHOLD = 5

export const RISK_LEVEL_LABELS: Record<string, string> = {
  critical: 'Critico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Basso',
}

export const RISK_LEVEL_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

export function getRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= RISK_CRITICAL_THRESHOLD) return 'critical'
  if (score >= RISK_HIGH_THRESHOLD) return 'high'
  if (score >= RISK_MEDIUM_THRESHOLD) return 'medium'
  return 'low'
}

// --- Document ---

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  design_input: "Design Input",
  design_output: "Design Output",
  verification_report: "Rapporto Verifica",
  validation_report: "Rapporto Validazione",
  change_control: "Change Control",
}

export const DOCUMENT_STATUS_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  draft: [{ value: "review", label: "Invia in revisione" }],
  review: [
    { value: "approved", label: "Approva" },
    { value: "draft", label: "Torna in bozza" },
  ],
  approved: [{ value: "obsolete", label: "Segna come obsoleto" }],
  obsolete: [],
}

// --- User Input ---

export const INPUT_CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  feature_request: "Funzionalità",
  improvement: "Miglioramento",
  question: "Domanda",
  other: "Altro",
}

// --- Roles ---

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  direzione: "Direzione",
  dipendente: "Dipendente",
  guest: "Ospite",
}

export const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  direzione: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  dipendente: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  guest: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
}

export const PROJECT_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  member: "Membro",
  viewer: "Viewer",
  guest: "Ospite",
}

// --- Automation ---

export const DOMAIN_LABELS: Record<string, string> = {
  task: "Task",
  risk: "Rischio",
  document: "Documento",
  project: "Progetto",
}

export const DOMAIN_COLORS: Record<string, string> = {
  task: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  risk: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  document: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  project: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

// --- Audit ---

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: "Creazione",
  update: "Modifica",
  delete: "Eliminazione",
  status_change: "Cambio stato",
}

export const AUDIT_ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  status_change: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
}

// --- Custom Fields ---

export const CUSTOM_FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Testo",
  number: "Numero",
  date: "Data",
  select: "Selezione",
}

// --- Time Tracking ---

export const TIME_ENTRY_STATUS_LABELS: Record<string, string> = {
  pending: "In attesa",
  approved: "Approvato",
  rejected: "Rifiutato",
}

// --- Gantt / Calendar Colors ---

export const GANTT_BAR_COLORS: Record<string, string> = {
  todo: "bg-slate-400 dark:bg-slate-500",
  in_progress: "bg-blue-500 dark:bg-blue-400",
  review: "bg-amber-500 dark:bg-amber-400",
  blocked: "bg-red-500 dark:bg-red-400",
  done: "bg-green-500 dark:bg-green-400",
  cancelled: "bg-gray-400 dark:bg-gray-500",
}

export const CALENDAR_DOT_COLORS: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  blocked: "bg-red-500",
  done: "bg-green-500",
  cancelled: "bg-gray-400",
}

// --- Status Colors (Tailwind classes) ---

export const STATUS_COLORS: Record<string, string> = {
  // Project statuses
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",

  // Task statuses
  todo: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  review: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",

  // Task priorities
  low: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",

  // Risk statuses
  open: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  mitigated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",

  // Document statuses
  draft: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  obsolete: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",

  // Input statuses
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",

  // Time entry approval
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

// --- Status Colors (HSL values for use in SVG/canvas/inline styles) ---

export const STATUS_COLORS_HSL: Record<string, string> = {
  // Task statuses
  todo: 'hsl(215, 20%, 65%)',
  in_progress: 'hsl(217, 91%, 60%)',
  review: 'hsl(38, 92%, 50%)',
  blocked: 'hsl(0, 84%, 60%)',
  done: 'hsl(142, 71%, 45%)',
  cancelled: 'hsl(0, 0%, 60%)',
  // Project statuses
  active: 'hsl(217, 91%, 60%)',
  completed: 'hsl(142, 71%, 45%)',
  on_hold: 'hsl(48, 96%, 53%)',
  // Risk statuses
  open: 'hsl(0, 84%, 60%)',
  mitigated: 'hsl(217, 91%, 60%)',
  accepted: 'hsl(38, 92%, 50%)',
  closed: 'hsl(0, 0%, 60%)',
  // Document statuses
  draft: 'hsl(215, 20%, 65%)',
  approved: 'hsl(142, 71%, 45%)',
  obsolete: 'hsl(0, 0%, 60%)',
  // Input statuses
  pending: 'hsl(48, 96%, 53%)',
  processing: 'hsl(217, 91%, 60%)',
  resolved: 'hsl(142, 71%, 45%)',
  // Time entry
  rejected: 'hsl(0, 84%, 60%)',
}

// --- Role helpers ---

export const PRIVILEGED_ROLES = ["admin", "direzione"] as const

export function isPrivileged(role: string): boolean {
  return PRIVILEGED_ROLES.includes(role as (typeof PRIVILEGED_ROLES)[number])
}

// --- Status Visual (dot color + label for compact rendering) ---

export const STATUS_VISUAL: Record<string, { dot: string; label: string }> = {
  blocked: { dot: "bg-red-500", label: "Bloccato" },
  in_progress: { dot: "bg-blue-500", label: "In corso" },
  review: { dot: "bg-amber-500", label: "In revisione" },
  todo: { dot: "bg-slate-400", label: "Non iniziato" },
  done: { dot: "bg-green-500", label: "Completato" },
  cancelled: { dot: "bg-slate-300", label: "Annullato" },
  active: { dot: "bg-blue-500", label: "Attivo" },
  completed: { dot: "bg-green-500", label: "Completato" },
  on_hold: { dot: "bg-amber-500", label: "In pausa" },
  open: { dot: "bg-red-500", label: "Aperto" },
  mitigated: { dot: "bg-green-500", label: "Mitigato" },
  accepted: { dot: "bg-amber-500", label: "Accettato" },
  closed: { dot: "bg-slate-400", label: "Chiuso" },
  draft: { dot: "bg-slate-400", label: "Bozza" },
  approved: { dot: "bg-green-500", label: "Approvato" },
  obsolete: { dot: "bg-slate-300", label: "Obsoleto" },
  pending: { dot: "bg-amber-500", label: "In attesa" },
  processing: { dot: "bg-blue-500", label: "In elaborazione" },
  resolved: { dot: "bg-green-500", label: "Risolto" },
}

export const TASK_STATUS_GROUP_ORDER = [
  "blocked",
  "in_progress",
  "review",
  "todo",
  "recurring",
  "done",
  "cancelled",
]

export const PROJECT_STATUS_GROUP_ORDER = [
  "on_hold",
  "active",
  "completed",
  "cancelled",
]

export const COLLAPSED_BY_DEFAULT = [
  "done",
  "cancelled",
  "completed",
  "mitigated",
  "closed",
  "todo",
]

/** Gradient backgrounds per context domain — used by ProgressGradient */
export const CONTEXT_GRADIENTS = {
  project: 'bg-gradient-to-r from-blue-700 to-blue-500',
  milestone: 'bg-gradient-to-r from-purple-700 to-purple-500',
  task: 'bg-gradient-to-r from-cyan-700 to-cyan-400',
  success: 'bg-gradient-to-r from-green-700 to-green-500',
  warning: 'bg-gradient-to-r from-orange-700 to-orange-500',
  danger: 'bg-gradient-to-r from-red-700 to-red-500',
  indigo: 'bg-gradient-to-r from-indigo-700 to-indigo-500',
} as const

export type ContextGradient = keyof typeof CONTEXT_GRADIENTS

/** Colors for NextActionChip */
export const NEXT_ACTION_CONFIG = {
  advance: { label: 'Avanza', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: 'ArrowRight' },
  unblock: { label: 'Sblocca', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: 'Unlock' },
  approve: { label: 'Approva', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: 'Check' },
  report: { label: 'Report', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: 'BarChart3' },
  review: { label: 'Revisione', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: 'Eye' },
} as const

export type NextAction = keyof typeof NEXT_ACTION_CONFIG

/** Alert severity styling */
export const ALERT_SEVERITY = {
  critical: { label: 'Critico', dot: 'bg-red-500', border: 'border-l-red-500', bg: 'bg-red-500/5' },
  warning: { label: 'Attenzione', dot: 'bg-orange-500', border: 'border-l-orange-500', bg: 'bg-orange-500/5' },
  info: { label: 'Info', dot: 'bg-blue-500', border: 'border-l-blue-500', bg: 'bg-blue-500/5' },
} as const

export type AlertSeverity = keyof typeof ALERT_SEVERITY
