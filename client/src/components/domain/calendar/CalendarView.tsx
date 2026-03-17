import { useCallback, useMemo, useState } from "react"
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
} from "date-fns"
import { it } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCalendarTasksQuery } from "@/hooks/api/useTasks"
import { CalendarGrid } from "./CalendarGrid"

interface CalendarViewProps {
  projectId?: string
}

export function CalendarView({ projectId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const { startDate, endDate } = useMemo(() => {
    const s = startOfMonth(currentDate)
    const e = endOfMonth(currentDate)
    return {
      startDate: s.toISOString(),
      endDate: e.toISOString(),
    }
  }, [currentDate])

  const filters: Record<string, unknown> = { startDate, endDate }
  if (projectId) filters.projectId = projectId

  const { data: tasks, isLoading } = useCalendarTasksQuery(filters)

  const goToPrev = useCallback(() => {
    setCurrentDate((d) => subMonths(d, 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentDate((d) => addMonths(d, 1))
  }, [])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: it })
  // Capitalize first letter
  const displayLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  return (
    <div className="space-y-4">
      {/* Header navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold">
            {displayLabel}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={goToToday}>
          Oggi
        </Button>
      </div>

      {/* Calendar */}
      {isLoading ? (
        <Skeleton className="h-[500px] w-full rounded-lg" />
      ) : (
        <CalendarGrid
          year={year}
          month={month}
          tasks={tasks ?? []}
        />
      )}
    </div>
  )
}
