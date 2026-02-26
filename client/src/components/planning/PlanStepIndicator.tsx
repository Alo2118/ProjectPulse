/**
 * PlanStepIndicator - Horizontal 3-step progress indicator for the Planning Wizard.
 * Completed steps show a checkmark in emerald, active step fills primary-500,
 * future steps show a gray outline only.
 * @module components/planning/PlanStepIndicator
 */

import { Check } from 'lucide-react'

interface Step {
  label: string
}

const STEPS: Step[] = [
  { label: 'Progetto' },
  { label: 'Piano' },
  { label: 'Conferma' },
]

interface PlanStepIndicatorProps {
  /** Current active step index: 0, 1, or 2 */
  currentStep: number
}

export function PlanStepIndicator({ currentStep }: PlanStepIndicatorProps) {
  return (
    <div className="w-full" aria-label="Avanzamento procedura guidata">
      {/* Desktop layout */}
      <div className="hidden sm:flex items-center justify-center">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep

          return (
            <div key={step.label} className="flex items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  aria-current={isActive ? 'step' : undefined}
                  className={[
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 font-semibold text-sm',
                    isCompleted
                      ? 'bg-emerald-500 dark:bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/40'
                      : isActive
                        ? 'bg-primary-500 dark:bg-primary-500 text-white shadow-md shadow-primary-200 dark:shadow-primary-900/40 ring-4 ring-primary-100 dark:ring-primary-900/30'
                        : 'bg-white dark:bg-surface-800 border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <Check size={16} strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={[
                    'text-xs font-medium whitespace-nowrap transition-colors duration-200',
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line between steps */}
              {index < STEPS.length - 1 && (
                <div className="w-16 sm:w-24 mx-2 mb-5 h-0.5 rounded-full transition-colors duration-300 flex-shrink-0">
                  <div
                    className={[
                      'h-full rounded-full transition-all duration-500',
                      index < currentStep
                        ? 'bg-emerald-400 dark:bg-emerald-500'
                        : 'bg-gray-200 dark:bg-gray-700',
                    ].join(' ')}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile compact layout */}
      <div className="flex sm:hidden items-center justify-between px-2">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep

          return (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-primary-500 text-white ring-2 ring-primary-200 dark:ring-primary-800'
                        : 'bg-white dark:bg-surface-800 border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={[
                    'text-[10px] font-medium whitespace-nowrap',
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div className="w-10 mx-1 mb-4 h-0.5 flex-shrink-0">
                  <div
                    className={[
                      'h-full rounded-full transition-colors duration-300',
                      index < currentStep
                        ? 'bg-emerald-400 dark:bg-emerald-500'
                        : 'bg-gray-200 dark:bg-gray-700',
                    ].join(' ')}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
