/**
 * TabSection - Tabbed content container
 * @module components/common/TabSection
 */

import { useState, ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

export interface Tab {
  id: string
  label: string
  icon?: LucideIcon
  count?: number
  content: ReactNode
}

interface TabSectionProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
  onTabChange?: (tabId: string) => void
}

export function TabSection({
  tabs,
  defaultTab,
  className = '',
  onTabChange,
}: TabSectionProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onTabChange?.(tabId)
  }

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content

  return (
    <div className={`card ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-100 dark:border-gray-700">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">{activeContent}</div>
    </div>
  )
}
