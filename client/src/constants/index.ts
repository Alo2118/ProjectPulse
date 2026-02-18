/**
 * Centralized constants for ProjectPulse
 * @module constants
 */

import { ProjectStatus, ProjectPriority, TaskStatus, TaskPriority, TaskType, RiskStatus, RiskCategory, RiskProbability, RiskImpact, InputCategory, InputStatus, ResolutionType, DocumentType, DocumentStatus, UserRole } from '@/types'

// ============================================================
// PROJECT STATUS
// ============================================================

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Pianificazione',
  design: 'Design',
  verification: 'Verifica',
  validation: 'Validazione',
  transfer: 'Trasferimento',
  maintenance: 'Manutenzione',
  on_hold: 'In Pausa',
  completed: 'Completato',
  cancelled: 'Annullato',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  design: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  verification: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  validation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  transfer: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  maintenance: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Pianificazione' },
  { value: 'design', label: 'Design' },
  { value: 'verification', label: 'Verifica' },
  { value: 'validation', label: 'Validazione' },
  { value: 'transfer', label: 'Trasferimento' },
  { value: 'maintenance', label: 'Manutenzione' },
  { value: 'on_hold', label: 'In Pausa' },
  { value: 'completed', label: 'Completato' },
  { value: 'cancelled', label: 'Annullato' },
]

// ============================================================
// PROJECT PRIORITY
// ============================================================

export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
  critical: 'Critica',
}

export const PROJECT_PRIORITY_COLORS: Record<ProjectPriority, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

export const PROJECT_PRIORITY_BORDER_COLORS: Record<ProjectPriority, string> = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
}

export const PROJECT_PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' },
]

// ============================================================
// TASK STATUS
// ============================================================

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Da fare',
  in_progress: 'In corso',
  review: 'In revisione',
  blocked: 'Bloccato',
  done: 'Completato',
  cancelled: 'Annullato',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500',
}

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Da fare' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'review', label: 'In revisione' },
  { value: 'blocked', label: 'Bloccato' },
  { value: 'done', label: 'Completato' },
  { value: 'cancelled', label: 'Annullato' },
]

export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['todo', 'review', 'blocked', 'done'],
  review: ['in_progress', 'done', 'blocked'],
  blocked: ['todo', 'in_progress'],
  done: ['in_progress'],
  cancelled: ['todo'],
}

// ============================================================
// TASK PRIORITY
// ============================================================

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
  critical: 'Critica',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

export const TASK_PRIORITY_BORDER_COLORS: Record<TaskPriority, string> = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
}

export const TASK_PRIORITY_TEXT_COLORS: Record<TaskPriority, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
}

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' },
]

// ============================================================
// TASK TYPE
// ============================================================

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  milestone: 'Milestone',
  task: 'Task',
  subtask: 'Subtask',
}

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  milestone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  task: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  subtask: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export const TASK_TYPE_OPTIONS: { value: TaskType; label: string; description: string }[] = [
  { value: 'milestone', label: 'Milestone', description: 'Fase/obiettivo di progetto. Non può avere time entries diretti.' },
  { value: 'task', label: 'Task', description: 'Attività principale con time tracking.' },
  { value: 'subtask', label: 'Subtask', description: 'Sotto-attività di un task.' },
]

// ============================================================
// RISK STATUS
// ============================================================

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  open: 'Aperto',
  mitigated: 'Mitigato',
  accepted: 'Accettato',
  closed: 'Chiuso',
}

export const RISK_STATUS_COLORS: Record<RiskStatus, string> = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  mitigated: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  accepted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  closed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export const RISK_STATUS_OPTIONS: { value: RiskStatus; label: string }[] = [
  { value: 'open', label: 'Aperto' },
  { value: 'mitigated', label: 'Mitigato' },
  { value: 'accepted', label: 'Accettato' },
  { value: 'closed', label: 'Chiuso' },
]

// ============================================================
// RISK CATEGORY
// ============================================================

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  technical: 'Tecnico',
  regulatory: 'Normativo',
  resource: 'Risorse',
  schedule: 'Tempistiche',
}

export const RISK_CATEGORY_COLORS: Record<RiskCategory, string> = {
  technical: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  regulatory: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resource: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  schedule: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

export const RISK_CATEGORY_OPTIONS: { value: RiskCategory; label: string }[] = [
  { value: 'technical', label: 'Tecnico' },
  { value: 'regulatory', label: 'Normativo' },
  { value: 'resource', label: 'Risorse' },
  { value: 'schedule', label: 'Tempistiche' },
]

// ============================================================
// RISK PROBABILITY / IMPACT
// ============================================================

export const RISK_PROBABILITY_LABELS: Record<RiskProbability, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
}

export const RISK_IMPACT_LABELS: Record<RiskImpact, string> = {
  low: 'Basso',
  medium: 'Medio',
  high: 'Alto',
}

export const RISK_LEVEL_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const RISK_PROBABILITY_OPTIONS: { value: RiskProbability; label: string }[] = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
]

export const RISK_IMPACT_OPTIONS: { value: RiskImpact; label: string }[] = [
  { value: 'low', label: 'Basso' },
  { value: 'medium', label: 'Medio' },
  { value: 'high', label: 'Alto' },
]

// ============================================================
// USER INPUT CATEGORY
// ============================================================

export const INPUT_CATEGORY_LABELS: Record<InputCategory, string> = {
  bug: 'Bug',
  feature_request: 'Nuova funzionalità',
  improvement: 'Miglioramento',
  question: 'Domanda',
  other: 'Altro',
}

export const INPUT_CATEGORY_COLORS: Record<InputCategory, string> = {
  bug: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  feature_request: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  improvement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  question: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export const INPUT_CATEGORY_OPTIONS: { value: InputCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Nuova funzionalità' },
  { value: 'improvement', label: 'Miglioramento' },
  { value: 'question', label: 'Domanda' },
  { value: 'other', label: 'Altro' },
]

// ============================================================
// USER INPUT STATUS
// ============================================================

export const INPUT_STATUS_LABELS: Record<InputStatus, string> = {
  pending: 'In attesa',
  processing: 'In elaborazione',
  resolved: 'Risolto',
}

export const INPUT_STATUS_COLORS: Record<InputStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export const INPUT_STATUS_OPTIONS: { value: InputStatus; label: string }[] = [
  { value: 'pending', label: 'In attesa' },
  { value: 'processing', label: 'In elaborazione' },
  { value: 'resolved', label: 'Risolto' },
]

// ============================================================
// USER INPUT RESOLUTION TYPE
// ============================================================

export const RESOLUTION_TYPE_LABELS: Record<ResolutionType, string> = {
  converted_to_task: 'Convertito in Task',
  converted_to_project: 'Convertito in Progetto',
  acknowledged: 'Preso visione',
  rejected: 'Rifiutato',
  duplicate: 'Duplicato',
}

export const RESOLUTION_TYPE_COLORS: Record<ResolutionType, string> = {
  converted_to_task: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  converted_to_project: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  acknowledged: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  duplicate: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

// ============================================================
// DOCUMENT TYPE
// ============================================================

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  design_input: 'Design Input',
  design_output: 'Design Output',
  verification_report: 'Report Verifica',
  validation_report: 'Report Validazione',
  change_control: 'Change Control',
}

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  design_input: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  design_output: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  verification_report: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  validation_report: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  change_control: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'design_input', label: 'Design Input' },
  { value: 'design_output', label: 'Design Output' },
  { value: 'verification_report', label: 'Report Verifica' },
  { value: 'validation_report', label: 'Report Validazione' },
  { value: 'change_control', label: 'Change Control' },
]

// ============================================================
// DOCUMENT STATUS
// ============================================================

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Bozza',
  review: 'In Revisione',
  approved: 'Approvato',
  obsolete: 'Obsoleto',
}

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  obsolete: 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}

export const DOCUMENT_STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: 'draft', label: 'Bozza' },
  { value: 'review', label: 'In Revisione' },
  { value: 'approved', label: 'Approvato' },
  { value: 'obsolete', label: 'Obsoleto' },
]

export const DOCUMENT_STATUS_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  draft: ['review'],
  review: ['draft', 'approved'],
  approved: ['obsolete', 'review'],
  obsolete: [],
}

// ============================================================
// USER ROLE
// ============================================================

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Amministratore',
  direzione: 'Direzione',
  dipendente: 'Dipendente',
}

export const USER_ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  direzione: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  dipendente: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Amministratore' },
  { value: 'direzione', label: 'Direzione' },
  { value: 'dipendente', label: 'Dipendente' },
]

// ============================================================
// TAG COLORS
// ============================================================

export const TAG_COLORS: { value: string; label: string }[] = [
  { value: '#EF4444', label: 'Rosso' },
  { value: '#F97316', label: 'Arancione' },
  { value: '#EAB308', label: 'Giallo' },
  { value: '#22C55E', label: 'Verde' },
  { value: '#14B8A6', label: 'Teal' },
  { value: '#3B82F6', label: 'Blu' },
  { value: '#8B5CF6', label: 'Viola' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#6B7280', label: 'Grigio' },
  { value: '#78716C', label: 'Marrone' },
]
