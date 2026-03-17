import { useMemo } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  startOfDay,
} from "date-fns"
import { cn } from "@/lib/utils"
import { CALENDAR_DOT_COLORS } from "@/lib/constants"

interface CalendarTask {
  id: string
  title: string
  dueDate: string
  status: string
}

interface CalendarGridProps {
  year: number
  month: number
  tasks: CalendarTask[]
  onDayClick?: (date: Date) => void
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

const MAX_CHIPS = 3

export function CalendarGrid({
  year,
  month,
  tasks,
  onDayClick,
}: CalendarGridProps) {
  const today = startOfDay(new Date())
  const currentMonth = new Date(year, month)

  // Build grid: 6 weeks starting from Monday
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const result: Date[][] = []
    let cursor = calStart
    while (cursor <= calEnd) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(cursor)
        cursor = addDays(cursor, 1)
      }
      result.push(week)
    }
    return result
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  // Index tasks by date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>()
    for (const task of tasks) {
      if (!task.dueDate) continue
      const key = task.dueDate.slice(0, 10)
      const existing = map.get(key)
      if (existing) {
        existing.push(task)
      } else {
        map.set(key, [task])
      }
    }
    return map
  }, [tasks])

  function getDateKey(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day) => {
            const inMonth = isSameMonth(day, currentMonth)
            const isToday = isSameDay(day, today)
            const key = getDateKey(day)
            const dayTasks = tasksByDate.get(key) ?? []
            const extra = dayTasks.length - MAX_CHIPS

            return (
              <button
                key={key}
                type="button"
                onClick={() => onDayClick?.(day)}
                className={cn(
                  "min-h-[80px] border-b border-r p-1.5 text-left transition-colors hover:bg-accent/50 sm:min-h-[100px]",
                  !inMonth && "bg-muted/20 text-muted-foreground/50"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday &&
                      "bg-primary font-semibold text-primary-foreground",
                    !isToday && inMonth && "text-foreground",
                    !isToday && !inMonth && "text-muted-foreground/50"
                  )}
                >
                  {day.getDate()}
                </span>

                {/* Task chips */}
                <div className="mt-1 space-y-0.5">
                  {dayTasks.slice(0, MAX_CHIPS).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-1 rounded px-1 py-0.5"
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                          CALENDAR_DOT_COLORS[task.status] ?? "bg-gray-400"
                        )}
                      />
                      <span className="truncate text-[10px] leading-tight">
                        {task.title}
                      </span>
                    </div>
                  ))}
                  {extra > 0 && (
                    <p className="px-1 text-[10px] text-muted-foreground">
                      +{extra} altr{extra === 1 ? "o" : "i"}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
