import { CheckCircle2, Play, Circle, AlertCircle } from 'lucide-react';
import { designTokens } from '../config/designTokens';

/**
 * Centralized status configuration for consistent styling across the app
 */
export const STATUS_CONFIGS = {
  completed: {
    color: 'emerald',
    icon: CheckCircle2,
    label: 'Completato',
    gradient: 'from-emerald-500 to-green-600',
    glow: 'shadow-emerald-500/50',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-500',
  },
  in_progress: {
    color: 'blue',
    icon: Play,
    label: 'In Corso',
    gradient: 'from-blue-500 to-cyan-600',
    glow: 'shadow-blue-500/50',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-300',
    borderClass: 'border-blue-500',
  },
  todo: {
    color: 'slate',
    icon: Circle,
    label: 'Da Fare',
    gradient: 'from-slate-500 to-gray-600',
    glow: 'shadow-slate-500/50',
    bgClass: designTokens.colors.bg.tertiary,
    textClass: designTokens.colors.text.secondary,
    borderClass: designTokens.colors.border,
  },
  blocked: {
    color: 'red',
    icon: AlertCircle,
    label: 'Bloccato',
    gradient: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/50',
    bgClass: 'bg-red-500',
    textClass: 'text-red-300',
    borderClass: 'border-red-500',
  },
  waiting_clarification: {
    color: 'yellow',
    icon: AlertCircle,
    label: 'In Attesa',
    gradient: 'from-yellow-500 to-orange-600',
    glow: 'shadow-yellow-500/50',
    bgClass: 'bg-yellow-500',
    textClass: 'text-yellow-300',
    borderClass: 'border-yellow-500',
  },
};

/**
 * Get status configuration by status key
 */
export function getStatusConfig(status) {
  return STATUS_CONFIGS[status] || STATUS_CONFIGS.todo;
}

/**
 * Get project health color based on metrics
 */
export function getProjectHealthColor(progress, hoursWorked, hoursEstimated) {
  if (progress === 100) return 'emerald';
  if (hoursEstimated > 0 && hoursWorked > hoursEstimated * 1.2) return 'red';
  if (progress > 75) return 'blue';
  if (progress > 50) return 'yellow';
  return 'slate';
}

/**
 * Calculate project progress percentage
 */
export function calculateProjectProgress(project) {
  const total = project.tasks?.length || 0;
  if (total === 0) return 0;
  const completed = project.tasks.filter((t) => t.status === 'completed').length;
  return Math.round((completed / total) * 100);
}
