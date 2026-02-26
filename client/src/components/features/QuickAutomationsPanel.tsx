/**
 * QuickAutomationsPanel - One-click activation of predefined automation templates
 * Shown in ProjectDetailPage as a tab
 */

import { useEffect, useState } from 'react'
import { toast } from '@stores/toastStore'
import { useAutomationStore, type AutomationTemplate } from '@stores/automationStore'
import { useAuthStore } from '@stores/authStore'
import {
  Zap,
  Bell,
  CheckCircle2,
  UserPlus,
  Loader2,
  Settings,
  MessageSquare,
  AlertTriangle,
  Clock,
} from 'lucide-react'

interface QuickAutomationsPanelProps {
  projectId: string
}

const CATEGORY_LABELS: Record<string, string> = {
  produttivita: 'Produttivita\'',
  notifiche: 'Notifiche',
  gestione: 'Gestione',
}

const CATEGORY_ORDER = ['gestione', 'notifiche', 'produttivita']

const TEMPLATE_ICONS: Record<string, typeof Zap> = {
  auto_complete_parent: CheckCircle2,
  notify_overdue: AlertTriangle,
  notify_deadline_1day: Clock,
  notify_blocked_owner: Bell,
  comment_on_done: MessageSquare,
  auto_assign_new_task: UserPlus,
}

export default function QuickAutomationsPanel({ projectId }: QuickAutomationsPanelProps) {
  const { templates, rules, fetchTemplates, fetchRules, createFromTemplate, toggleRule, isLoading } = useAutomationStore()
  const { user } = useAuthStore()
  const [activatingKey, setActivatingKey] = useState<string | null>(null)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [userSelectKey, setUserSelectKey] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([])

  useEffect(() => {
    fetchTemplates()
    fetchRules(projectId)
  }, [fetchTemplates, fetchRules, projectId])

  // Fetch users for assign template
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { default: api } = await import('@services/api')
        const response = await api.get<{ success: boolean; data: Array<{ id: string; firstName: string; lastName: string }> }>(
          '/users?limit=100'
        )
        if (response.data.success) {
          setUsers(response.data.data)
        }
      } catch {
        // Silent fail
      }
    }
    loadUsers()
  }, [])

  const isAdmin = user?.role === 'admin' || user?.role === 'direzione'

  // Check which templates are already active for this project and map to rule IDs
  const activeTemplateKeys = new Set<string>()
  const templateToRuleId = new Map<string, string>()
  for (const rule of rules) {
    if (rule.projectId === projectId && rule.isActive) {
      for (const template of templates) {
        if (rule.name.includes(template.name) || rule.trigger.type === template.trigger.type) {
          activeTemplateKeys.add(template.key)
          templateToRuleId.set(template.key, rule.id)
        }
      }
    }
  }

  const handleActivate = async (template: AutomationTemplate) => {
    // If template needs user input (assign), show user selector
    if (template.key === 'auto_assign_new_task') {
      setUserSelectKey(template.key)
      return
    }

    setActivatingKey(template.key)
    try {
      await createFromTemplate(template.key, projectId)
      toast.success(`Automazione "${template.name}" attivata`)
    } catch {
      toast.error('Errore nell\'attivazione dell\'automazione')
    } finally {
      setActivatingKey(null)
    }
  }

  const handleDeactivate = async (template: AutomationTemplate) => {
    const ruleId = templateToRuleId.get(template.key)
    if (!ruleId) return

    setTogglingKey(template.key)
    try {
      await toggleRule(ruleId, false)
      toast.success(`Automazione "${template.name}" disattivata`)
    } catch {
      toast.error('Errore nella disattivazione dell\'automazione')
    } finally {
      setTogglingKey(null)
    }
  }

  const handleActivateWithUser = async () => {
    if (!selectedUserId || !userSelectKey) return
    setActivatingKey(userSelectKey)
    try {
      await createFromTemplate(userSelectKey, projectId, { userId: selectedUserId })
      toast.success('Automazione attivata')
      setUserSelectKey(null)
      setSelectedUserId('')
    } catch {
      toast.error('Errore nell\'attivazione dell\'automazione')
    } finally {
      setActivatingKey(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
        Solo admin e direzione possono gestire le automazioni
      </div>
    )
  }

  if (templates.length === 0 && !isLoading) {
    return (
      <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
        Nessun modello di automazione disponibile
      </div>
    )
  }

  // Group by category
  const grouped = templates.reduce<Record<string, AutomationTemplate[]>>((acc, t) => {
    const cat = t.category || 'gestione'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {})

  const activeRulesCount = rules.filter((r) => r.projectId === projectId && r.isActive).length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Settings className="w-4 h-4" />
          <span>
            {activeRulesCount > 0
              ? `${activeRulesCount} automazione${activeRulesCount > 1 ? 'i' : ''} attiva${activeRulesCount > 1 ? 'e' : ''}`
              : 'Nessuna automazione attiva'}
          </span>
        </div>
      </div>

      {/* Template categories */}
      {CATEGORY_ORDER.map((category) => {
        const items = grouped[category]
        if (!items || items.length === 0) return null

        return (
          <div key={category}>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[category] ?? category}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((template) => {
                const Icon = TEMPLATE_ICONS[template.key] ?? Zap
                const isActivating = activatingKey === template.key
                const isAlreadyActive = activeTemplateKeys.has(template.key)

                return (
                  <div
                    key={template.key}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-cyan-300 dark:hover:border-cyan-600 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {template.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {template.description}
                      </p>

                      {/* User selector for assign template */}
                      {userSelectKey === template.key && (
                        <div className="mt-2 flex items-center gap-2">
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="flex-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-2 py-1"
                          >
                            <option value="">Seleziona utente...</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleActivateWithUser}
                            disabled={!selectedUserId || isActivating}
                            className="px-2 py-1 text-xs bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:opacity-50"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => { setUserSelectKey(null); setSelectedUserId('') }}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                          >
                            Annulla
                          </button>
                        </div>
                      )}
                    </div>
                    {isAlreadyActive ? (
                      <button
                        onClick={() => handleDeactivate(template)}
                        disabled={togglingKey === template.key}
                        className="flex-shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        {togglingKey === template.key ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Disattiva'
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(template)}
                        disabled={isActivating}
                        className="flex-shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/50"
                      >
                        {isActivating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Attiva'
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
