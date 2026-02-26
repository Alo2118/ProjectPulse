/**
 * MyDayHeader - Greeting, date, and daily stats for the My Day view
 * @module components/my-day/MyDayHeader
 */

import { Sun, Moon, Sunset, CheckCircle2, Clock } from 'lucide-react'
import { formatDuration } from '@utils/dateFormatters'

interface MyDayHeaderProps {
  userName: string
  completedToday: number
  totalToday: number
  minutesLoggedToday: number
}

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return { text: 'Buongiorno', icon: Sun }
  if (hour >= 12 && hour < 18) return { text: 'Buon pomeriggio', icon: Sunset }
  return { text: 'Buonasera', icon: Moon }
}

export function MyDayHeader({
  userName,
  completedToday,
  totalToday,
  minutesLoggedToday,
}: MyDayHeaderProps) {
  const { text: greeting, icon: GreetingIcon } = getGreeting()

  const formattedDate = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  // Capitalize first letter
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GreetingIcon className="w-6 h-6 text-amber-500" />
            {greeting}, {userName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {displayDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>{completedToday}/{totalToday}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(minutesLoggedToday)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
