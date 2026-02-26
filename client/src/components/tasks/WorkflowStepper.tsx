/**
 * WorkflowStepper - Dynamic status stepper that uses workflow template statuses
 * Replaces the hardcoded 4-step stepper in TaskDetailPage
 */

import { useMemo } from 'react'
import { Check, AlertTriangle, X } from 'lucide-react'
import { useWorkflowStore, type WorkflowStatus } from '@stores/workflowStore'

// Color mapping from workflow template color names to Tailwind classes
const COLOR_MAP: Record<string, {
  completed: string
  active: string
  activeRing: string
  label: string
  labelActive: string
  line: string
}> = {
  gray: {
    completed: 'bg-gray-500 dark:bg-gray-600 border-gray-500 dark:border-gray-600 text-white',
    active: 'bg-gray-500 dark:bg-gray-600 border-gray-500 dark:border-gray-600 text-white',
    activeRing: 'ring-gray-100 dark:ring-gray-900/40',
    label: 'text-gray-600 dark:text-gray-400 font-medium',
    labelActive: 'text-gray-700 dark:text-gray-300 font-semibold',
    line: 'bg-gray-400 dark:bg-gray-600',
  },
  blue: {
    completed: 'bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600 text-white',
    active: 'bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600 text-white',
    activeRing: 'ring-blue-100 dark:ring-blue-900/40',
    label: 'text-blue-600 dark:text-blue-400 font-medium',
    labelActive: 'text-blue-700 dark:text-blue-300 font-semibold',
    line: 'bg-blue-400 dark:bg-blue-600',
  },
  yellow: {
    completed: 'bg-yellow-500 dark:bg-yellow-600 border-yellow-500 dark:border-yellow-600 text-white',
    active: 'bg-yellow-500 dark:bg-yellow-600 border-yellow-500 dark:border-yellow-600 text-white',
    activeRing: 'ring-yellow-100 dark:ring-yellow-900/40',
    label: 'text-yellow-600 dark:text-yellow-400 font-medium',
    labelActive: 'text-yellow-700 dark:text-yellow-300 font-semibold',
    line: 'bg-yellow-400 dark:bg-yellow-600',
  },
  red: {
    completed: 'bg-red-500 dark:bg-red-600 border-red-500 dark:border-red-600 text-white',
    active: 'bg-red-500 dark:bg-red-600 border-red-500 dark:border-red-600 text-white',
    activeRing: 'ring-red-100 dark:ring-red-900/40',
    label: 'text-red-600 dark:text-red-400 font-medium',
    labelActive: 'text-red-700 dark:text-red-300 font-semibold',
    line: 'bg-red-400 dark:bg-red-600',
  },
  green: {
    completed: 'bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600 text-white',
    active: 'bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600 text-white',
    activeRing: 'ring-green-100 dark:ring-green-900/40',
    label: 'text-green-600 dark:text-green-400 font-medium',
    labelActive: 'text-green-700 dark:text-green-300 font-semibold',
    line: 'bg-green-400 dark:bg-green-600',
  },
  purple: {
    completed: 'bg-purple-500 dark:bg-purple-600 border-purple-500 dark:border-purple-600 text-white',
    active: 'bg-purple-500 dark:bg-purple-600 border-purple-500 dark:border-purple-600 text-white',
    activeRing: 'ring-purple-100 dark:ring-purple-900/40',
    label: 'text-purple-600 dark:text-purple-400 font-medium',
    labelActive: 'text-purple-700 dark:text-purple-300 font-semibold',
    line: 'bg-purple-400 dark:bg-purple-600',
  },
  orange: {
    completed: 'bg-orange-500 dark:bg-orange-600 border-orange-500 dark:border-orange-600 text-white',
    active: 'bg-orange-500 dark:bg-orange-600 border-orange-500 dark:border-orange-600 text-white',
    activeRing: 'ring-orange-100 dark:ring-orange-900/40',
    label: 'text-orange-600 dark:text-orange-400 font-medium',
    labelActive: 'text-orange-700 dark:text-orange-300 font-semibold',
    line: 'bg-orange-400 dark:bg-orange-600',
  },
}

const DEFAULT_COLORS = COLOR_MAP.blue

function getColorSet(color: string) {
  return COLOR_MAP[color] ?? DEFAULT_COLORS
}

interface WorkflowStepperProps {
  currentStatus: string
  projectId: string | null
}

export default function WorkflowStepper({ currentStatus, projectId }: WorkflowStepperProps) {
  const { getWorkflowStatuses } = useWorkflowStore()
  const allStatuses = getWorkflowStatuses(projectId)

  // Separate flow statuses (non-final, non-blocked) from special statuses
  const { flowSteps, blockedStatus, finalStatuses } = useMemo(() => {
    const flow: WorkflowStatus[] = []
    let blocked: WorkflowStatus | null = null
    const finals: WorkflowStatus[] = []

    for (const s of allStatuses) {
      if (s.key === 'blocked' || (s.requiresComment && !s.isFinal && !s.isInitial)) {
        blocked = s
      } else if (s.isFinal) {
        finals.push(s)
      } else {
        flow.push(s)
      }
    }

    return { flowSteps: flow, blockedStatus: blocked, finalStatuses: finals }
  }, [allStatuses])

  const isBlocked = currentStatus === 'blocked' || currentStatus === blockedStatus?.key
  const isFinal = finalStatuses.some((s) => s.key === currentStatus)

  // Find current position in flow
  const currentFlowIndex = flowSteps.findIndex((s) => s.key === currentStatus)
  // If blocked, show as paused at last non-initial flow step (typically in_progress position)
  const stepperIndex = isBlocked
    ? Math.max(flowSteps.findIndex((s) => !s.isInitial), 1)
    : isFinal
      ? flowSteps.length // past all flow steps
      : currentFlowIndex

  return (
    <div className="flex items-center gap-0 flex-wrap">
      {flowSteps.map((step, index) => {
        const colors = getColorSet(step.color)
        const isActive = !isFinal && !isBlocked && index === stepperIndex
        const isCompleted = isFinal || (!isBlocked && index < stepperIndex)
        const isLast = index === flowSteps.length - 1

        const circleClass = isFinal && currentStatus === 'cancelled'
          ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
          : isCompleted
            ? `${colors.completed}`
            : isActive
              ? `${colors.active} ring-4 ${colors.activeRing}`
              : isBlocked && index === stepperIndex
                ? `${getColorSet('red').active}`
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'

        const labelClass = isFinal && currentStatus === 'cancelled'
          ? 'text-gray-400 dark:text-gray-500'
          : isCompleted
            ? colors.label
            : isActive
              ? colors.labelActive
              : 'text-gray-400 dark:text-gray-500'

        const lineClass = isFinal && currentStatus === 'cancelled'
          ? 'bg-gray-200 dark:bg-gray-700'
          : isCompleted || (isBlocked && index < stepperIndex)
            ? colors.line
            : 'bg-gray-200 dark:bg-gray-700'

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${circleClass}`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isBlocked && index === stepperIndex ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={`mt-1 text-xs whitespace-nowrap ${labelClass}`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`h-0.5 w-8 sm:w-14 mb-4 mx-1 transition-all ${lineClass}`} />
            )}
          </div>
        )
      })}

      {/* Blocked badge */}
      {isBlocked && blockedStatus && (
        <div className="ml-3 mb-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium">
          <AlertTriangle className="w-3 h-3" />
          {blockedStatus.label}
        </div>
      )}

      {/* Final status badge */}
      {isFinal && (
        <div className={`ml-3 mb-4 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          currentStatus === 'cancelled' || finalStatuses.find((s) => s.key === currentStatus)?.color === 'gray'
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
        }`}>
          {currentStatus === 'cancelled' ? (
            <X className="w-3 h-3" />
          ) : (
            <Check className="w-3 h-3" />
          )}
          {finalStatuses.find((s) => s.key === currentStatus)?.label ?? currentStatus}
        </div>
      )}
    </div>
  )
}
