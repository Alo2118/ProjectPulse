/**
 * Automation Templates - Predefined automation rules for common workflows (Feature 4.4)
 * These templates can be activated by admins/managers to quickly configure automation
 * without building rules from scratch. Each template can have overrides applied
 * (e.g. filling in a specific userId for assign_to_user) before creation.
 * @module services/automationTemplates
 */

// ============================================================
// TYPES
// ============================================================

export interface AutomationTemplate {
  key: string
  name: string
  description: string
  category: 'produttivita' | 'notifiche' | 'gestione'
  domain: 'task' | 'risk' | 'document' | 'project'
  trigger: { type: string; params: Record<string, unknown> }
  conditions: Array<{ type: string; params: Record<string, unknown> }>
  actions: Array<{ type: string; params: Record<string, unknown> }>
  /** Optional cooldown in minutes to prevent repeated firings */
  cooldownMinutes?: number
}

// ============================================================
// PREDEFINED TEMPLATES
// ============================================================

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  /**
   * Automatically marks a parent task as "done" when all its subtasks are completed.
   * Useful for milestone tracking where completion is derived from child tasks.
   */
  {
    key: 'auto_complete_parent',
    name: 'Completa automaticamente il task genitore',
    description:
      'Quando tutti i subtask sono completati, imposta il task genitore come "done" automaticamente.',
    category: 'gestione',
    domain: 'task',
    trigger: {
      type: 'all_subtasks_completed',
      params: {},
    },
    conditions: [],
    actions: [
      {
        type: 'update_parent_status',
        params: { status: 'done' },
      },
    ],
  },

  /**
   * Notifies the task assignee when the task becomes overdue.
   * Only fires if the task has an assignee (guarded by task_has_assignee condition).
   */
  {
    key: 'notify_overdue',
    name: 'Notifica assegnatario per task scaduto',
    description:
      "Invia una notifica all'assegnatario quando un task supera la data di scadenza.",
    category: 'notifiche',
    domain: 'task',
    trigger: {
      type: 'task_overdue',
      params: {},
    },
    conditions: [
      {
        type: 'task_has_assignee',
        params: {},
      },
    ],
    actions: [
      {
        type: 'notify_assignee',
        params: { message: 'Il task {task.code} è scaduto!' },
      },
    ],
  },

  /**
   * Notifies the task assignee one day before the deadline.
   * Only fires if the task has an assignee (guarded by task_has_assignee condition).
   */
  {
    key: 'notify_deadline_1day',
    name: 'Notifica scadenza imminente (1 giorno)',
    description:
      "Avvisa l'assegnatario che il task scade domani.",
    category: 'notifiche',
    domain: 'task',
    trigger: {
      type: 'task_deadline_approaching',
      params: { daysBeforeDeadline: 1 },
    },
    conditions: [
      {
        type: 'task_has_assignee',
        params: {},
      },
    ],
    actions: [
      {
        type: 'notify_assignee',
        params: { message: 'Il task {task.code} scade domani!' },
      },
    ],
  },

  /**
   * Notifies the project owner when a task is marked as blocked.
   * Helps project owners stay aware of impediments without manually checking.
   */
  {
    key: 'notify_blocked_owner',
    name: 'Notifica owner quando task viene bloccato',
    description:
      "Invia una notifica al responsabile del progetto quando un task viene impostato come 'blocked'.",
    category: 'notifiche',
    domain: 'task',
    trigger: {
      type: 'task_status_changed',
      params: { toStatus: 'blocked' },
    },
    conditions: [],
    actions: [
      {
        type: 'notify_project_owner',
        params: { message: 'Il task {task.code} è stato bloccato' },
      },
    ],
  },

  /**
   * Automatically adds a comment when a task is marked as done.
   * Provides a visible audit trail of task completion events.
   */
  {
    key: 'comment_on_done',
    name: 'Commento automatico al completamento',
    description:
      "Aggiunge un commento automatico quando un task viene impostato come 'done'.",
    category: 'produttivita',
    domain: 'task',
    trigger: {
      type: 'task_status_changed',
      params: { toStatus: 'done' },
    },
    conditions: [],
    actions: [
      {
        type: 'create_comment',
        params: { message: 'Task completato.' },
      },
    ],
  },

  /**
   * Automatically assigns newly created tasks to a specific user.
   * The userId must be supplied via overrides when activating this template.
   * Useful for routing all new tasks to a team lead or project manager by default.
   */
  {
    key: 'auto_assign_new_task',
    name: 'Assegnazione automatica nuovi task',
    description:
      'Assegna automaticamente ogni nuovo task a un utente specifico. Specifica userId negli override.',
    category: 'gestione',
    domain: 'task',
    trigger: {
      type: 'task_created',
      params: {},
    },
    conditions: [],
    actions: [
      {
        type: 'assign_to_user',
        // userId must be filled in via overrides at activation time
        params: { userId: '' },
      },
    ],
  },

  // ============================================================
  // DOCUMENT TEMPLATES
  // ============================================================

  /**
   * Notifies the project owner when a document enters review status.
   */
  {
    key: 'notify_reviewers',
    name: 'Notifica revisori',
    description: 'Notifica quando un documento entra in revisione',
    category: 'notifiche',
    domain: 'document',
    trigger: { type: 'document_status_changed', params: { toStatus: 'review' } },
    conditions: [],
    actions: [
      {
        type: 'notify_project_owner',
        params: {
          message:
            'Il documento {document.title} \u00e8 in attesa di revisione.',
        },
      },
    ],
  },

  /**
   * Reminder 30 days before a document review is due.
   */
  {
    key: 'reminder_doc_expiring',
    name: 'Reminder scadenza documento',
    description:
      'Notifica quando un documento si avvicina alla scadenza di revisione (30 giorni)',
    category: 'notifiche',
    domain: 'document',
    trigger: { type: 'document_review_due', params: { daysBeforeExpiry: 30 } },
    conditions: [],
    actions: [
      {
        type: 'notify_assignee',
        params: {
          message:
            'Il documento {document.title} scade tra 30 giorni.',
        },
      },
    ],
    cooldownMinutes: 1440,
  },

  /**
   * Daily alert for documents whose review date has passed.
   */
  {
    key: 'alert_doc_expired',
    name: 'Alert documento scaduto',
    description: 'Alert giornaliero per documenti con revisione scaduta',
    category: 'notifiche',
    domain: 'document',
    trigger: { type: 'document_review_due', params: { daysBeforeExpiry: 0 } },
    conditions: [],
    actions: [
      {
        type: 'notify_assignee',
        params: {
          message:
            'URGENTE: Il documento {document.title} ha superato la scadenza di revisione!',
        },
      },
      {
        type: 'notify_project_owner',
        params: {
          message:
            'URGENTE: Il documento {document.title} ha superato la scadenza di revisione!',
        },
      },
    ],
    cooldownMinutes: 1440,
  },

  // ============================================================
  // RISK TEMPLATES
  // ============================================================

  /**
   * Notifies the project owner when a high-impact risk is created.
   */
  {
    key: 'notify_risk_high',
    name: 'Notifica rischio critico',
    description:
      'Notifica il project owner quando viene creato un rischio ad alta severit\u00e0',
    category: 'notifiche',
    domain: 'risk',
    trigger: { type: 'risk_created', params: {} },
    conditions: [{ type: 'risk_impact_is', params: { value: 'high' } }],
    actions: [
      {
        type: 'notify_project_owner',
        params: { message: 'Nuovo rischio critico: {risk.title}' },
      },
    ],
  },

  /**
   * Escalation when a high-impact risk changes status and is still unresolved.
   */
  {
    key: 'escalate_risk_overdue',
    name: 'Escalation rischio scaduto',
    description:
      'Escalation quando un rischio \u00e8 scaduto e non mitigato',
    category: 'gestione',
    domain: 'risk',
    trigger: { type: 'risk_status_changed', params: {} },
    conditions: [{ type: 'risk_impact_is', params: { value: 'high' } }],
    actions: [
      {
        type: 'escalate',
        params: {
          message:
            'Il rischio {risk.title} richiede attenzione immediata.',
        },
      },
    ],
  },

  // ============================================================
  // TASK ESCALATION / MANAGEMENT TEMPLATES
  // ============================================================

  /**
   * Escalation 48 hours before a task's deadline.
   */
  {
    key: 'escalate_48h',
    name: 'Escalation 48h prima della scadenza',
    description:
      'Escalation quando un task \u00e8 a 2 giorni dalla scadenza',
    category: 'gestione',
    domain: 'task',
    trigger: {
      type: 'task_deadline_approaching',
      params: { daysBeforeDeadline: 2 },
    },
    conditions: [{ type: 'task_has_assignee', params: {} }],
    actions: [
      {
        type: 'escalate',
        params: {
          message: 'Il task {task.code} scade tra 48 ore!',
        },
      },
    ],
  },

  /**
   * Notification when a task has not been updated in 7 days.
   */
  {
    key: 'alert_idle_task',
    name: 'Alert task inattivo',
    description:
      'Notifica quando un task non viene aggiornato da 7 giorni',
    category: 'gestione',
    domain: 'task',
    trigger: { type: 'task_idle', params: {} },
    conditions: [{ type: 'task_has_assignee', params: {} }],
    actions: [
      {
        type: 'notify_assignee',
        params: {
          message:
            'Il task {task.code} \u00e8 inattivo da oltre 7 giorni.',
        },
      },
    ],
    cooldownMinutes: 10080, // 7 days
  },
]
