/**
 * TimesheetView - Weekly timesheet grid
 * Rows = tasks grouped by project, Columns = Mon–Fri, Cells = hours logged
 * @module pages/time-tracking/TimesheetView
 */

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react'
import api from '@services/api'
import { useAuthStore } from '@stores/authStore'
import { TimeEntry } from '@/types'
import { formatDuration } from '@utils/dateFormatters'

// ─── helpers ────────────────────────────────────────────────────────────────

const ITALIAN_MONTHS = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
]

/** Return the Monday of the week that contains `date` (local time). */
function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Add `days` days to a date and return a new Date. */
function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Format a Date as "YYYY-MM-DD" (local time). */
function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Format minutes as "Xh Ym" or "—" if zero. */
function fmtHours(minutes: number): string {
  if (minutes <= 0) return '—'
  return formatDuration(minutes)
}

/** Format minutes as "Xh Ym" for totals. */
function fmtHoursDecimal(minutes: number): string {
  if (minutes <= 0) return '0h'
  return formatDuration(minutes)
}

/** Build the header label "DD Mon – DD Mon YYYY" in Italian. */
function formatWeekRange(monday: Date): string {
  const friday = addDays(monday, 4)
  const monDay = monday.getDate()
  const monMon = ITALIAN_MONTHS[monday.getMonth()]
  const friDay = friday.getDate()
  const friMon = ITALIAN_MONTHS[friday.getMonth()]
  const year = friday.getFullYear()
  if (monday.getMonth() === friday.getMonth()) {
    return `${monDay} – ${friDay} ${friMon} ${year}`
  }
  return `${monDay} ${monMon} – ${friDay} ${friMon} ${year}`
}

/** Format a column-header label: "Lun\n17 Feb". */
function formatColHeader(date: Date): { day: string; dateStr: string } {
  const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  return {
    day: DAYS[date.getDay()],
    dateStr: `${date.getDate()} ${ITALIAN_MONTHS[date.getMonth()]}`,
  }
}

// ─── types ───────────────────────────────────────────────────────────────────

interface TaskRow {
  taskId: string
  taskTitle: string
  taskCode: string
  projectId: string
  projectName: string
  /** minutes per weekday index 0–4 (Mon–Fri) */
  byDay: [number, number, number, number, number]
}

interface TimesheetGrid {
  rows: TaskRow[]
  /** column totals in minutes, index 0–4 */
  colTotals: [number, number, number, number, number]
  grandTotal: number
}

interface TimeEntriesApiResponse {
  success: boolean
  data: TimeEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// ─── build grid from raw entries ────────────────────────────────────────────

function buildGrid(entries: TimeEntry[], monday: Date): TimesheetGrid {
  const weekDates = Array.from({ length: 5 }, (_, i) => toISODate(addDays(monday, i)))

  const taskMap = new Map<string, TaskRow>()

  for (const entry of entries) {
    if (!entry.task) continue
    const duration = entry.duration ?? 0
    if (duration <= 0 && !entry.isRunning) continue

    const entryDate = entry.startTime.slice(0, 10)
    const dayIdx = weekDates.indexOf(entryDate)
    if (dayIdx === -1) continue

    const { id: taskId, title: taskTitle, code: taskCode } = entry.task
    const project = entry.task.project
    const projectId = project?.id ?? 'no-project'
    const projectName = project?.name ?? '(Senza progetto)'

    let row = taskMap.get(taskId)
    if (!row) {
      row = {
        taskId,
        taskTitle,
        taskCode,
        projectId,
        projectName,
        byDay: [0, 0, 0, 0, 0],
      }
      taskMap.set(taskId, row)
    }

    row.byDay[dayIdx] += duration
  }

  const rows = Array.from(taskMap.values()).sort((a, b) => {
    const pCmp = a.projectName.localeCompare(b.projectName, 'it')
    if (pCmp !== 0) return pCmp
    return a.taskTitle.localeCompare(b.taskTitle, 'it')
  })

  const colTotals: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  let grandTotal = 0

  for (const row of rows) {
    for (let i = 0; i < 5; i++) {
      colTotals[i] += row.byDay[i]
      grandTotal += row.byDay[i]
    }
  }

  return { rows, colTotals, grandTotal }
}

// ─── component ───────────────────────────────────────────────────────────────

export function TimesheetView() {
  const { user } = useAuthStore()

  const weeklyTarget = user?.weeklyHoursTarget ?? 40
  const dailyTargetMinutes = (weeklyTarget / 5) * 60

  const [monday, setMonday] = useState<Date>(() => getMondayOf(new Date()))
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const friday = useMemo(() => addDays(monday, 4), [monday])
  const fromDate = useMemo(() => toISODate(monday), [monday])
  const toDate = useMemo(() => toISODate(friday), [friday])

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        limit: '500',
        page: '1',
      })
      const response = await api.get<TimeEntriesApiResponse>(
        `/time-entries?${params.toString()}`
      )
      if (response.data.success) {
        setEntries(response.data.data)
      }
    } catch {
      // silently ignore — grid will show empty state
    } finally {
      setIsLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const grid = useMemo(() => buildGrid(entries, monday), [entries, monday])

  const colHeaders = useMemo(
    () => Array.from({ length: 5 }, (_, i) => formatColHeader(addDays(monday, i))),
    [monday]
  )

  const handlePrevWeek = () => setMonday((prev) => addDays(prev, -7))
  const handleNextWeek = () => setMonday((prev) => addDays(prev, 7))
  const handleToday = () => setMonday(getMondayOf(new Date()))

  /** Return Tailwind text-color class for a column total. */
  function colTotalClass(minutes: number): string {
    if (minutes === 0) return 'text-slate-400 dark:text-slate-500'
    if (minutes >= dailyTargetMinutes) return 'text-emerald-600 dark:text-emerald-400'
    return 'text-amber-600 dark:text-amber-400'
  }

  // Today's ISO date for highlighting the current column header
  const todayIso = toISODate(new Date())
  const todayColIdx = Array.from({ length: 5 }, (_, i) =>
    toISODate(addDays(monday, i))
  ).indexOf(todayIso)

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Navigation bar */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400 shrink-0" aria-hidden="true" />
          <span className="text-base font-semibold text-slate-800 dark:text-white">
            {formatWeekRange(monday)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevWeek}
            className="btn-icon"
            aria-label="Settimana precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="btn-secondary text-sm px-3 py-1.5"
            aria-label="Torna alla settimana corrente"
          >
            Oggi
          </button>

          <button
            onClick={handleNextWeek}
            className="btn-icon"
            aria-label="Settimana successiva"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="card overflow-hidden">
        {isLoading ? (
          // Skeleton / loading state
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2
              className="w-8 h-8 animate-spin text-cyan-400"
              aria-label="Caricamento in corso"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Caricamento ore...
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[640px] text-sm"
              aria-label="Timesheet settimanale"
            >
              {/* Column group for proportional sizing */}
              <colgroup>
                {/* Task column — wider */}
                <col className="w-[40%]" />
                {/* Day columns */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <col key={i} className="w-[10%]" />
                ))}
                {/* Total column */}
                <col className="w-[10%]" />
              </colgroup>

              <thead>
                <tr className="border-b border-cyan-500/15 bg-slate-100/60 dark:bg-slate-800/60">
                  <th
                    scope="col"
                    className="table-header px-4 py-3 text-left"
                  >
                    Progetto / Task
                  </th>
                  {colHeaders.map((col, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={[
                        'px-2 py-2 text-center',
                        todayColIdx === i
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : 'text-slate-500 dark:text-slate-400',
                      ].join(' ')}
                    >
                      <span className="block text-xs font-semibold uppercase tracking-widest">
                        {col.day}
                      </span>
                      <span
                        className={[
                          'block text-[11px] font-normal mt-0.5',
                          todayColIdx === i ? 'font-medium' : '',
                        ].join(' ')}
                      >
                        {col.dateStr}
                      </span>
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="table-header px-2 py-3 text-center"
                  >
                    Totale
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-cyan-500/5">
                {grid.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-400 dark:text-slate-500"
                    >
                      <Calendar
                        className="w-10 h-10 mx-auto mb-3 opacity-40"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-medium">
                        Nessuna ora registrata questa settimana
                      </p>
                      <p className="text-xs mt-1 opacity-70">
                        Le ore appariranno qui non appena verranno registrate
                      </p>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const rows: ReactNode[] = []
                    let lastProjectId: string | null = null

                    for (const row of grid.rows) {
                      // Project group header row
                      if (row.projectId !== lastProjectId) {
                        lastProjectId = row.projectId
                        rows.push(
                          <tr
                            key={`proj-${row.projectId}`}
                            className="bg-slate-100/40 dark:bg-slate-800/30"
                          >
                            <td
                              colSpan={7}
                              className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest"
                            >
                              {row.projectName}
                            </td>
                          </tr>
                        )
                      }

                      const rowTotal = row.byDay.reduce((s, v) => s + v, 0)

                      rows.push(
                        <tr
                          key={row.taskId}
                          className="table-row-hover"
                        >
                          {/* Task label */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-600/50">
                                {row.taskCode}
                              </span>
                              <span
                                className="truncate text-slate-700 dark:text-slate-200 text-sm"
                                title={row.taskTitle}
                              >
                                {row.taskTitle}
                              </span>
                            </div>
                          </td>

                          {/* Day cells */}
                          {row.byDay.map((minutes, dayIdx) => (
                            <td
                              key={dayIdx}
                              className={[
                                'px-2 py-2.5 text-center tabular-nums',
                                todayColIdx === dayIdx
                                  ? 'bg-cyan-500/5 dark:bg-cyan-900/10'
                                  : '',
                              ].join(' ')}
                            >
                              {minutes > 0 ? (
                                <span className="font-medium font-mono text-amber-600 dark:text-amber-400">
                                  {fmtHours(minutes)}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>
                          ))}

                          {/* Row total */}
                          <td className="px-2 py-2.5 text-center tabular-nums">
                            <span className="font-semibold font-mono text-amber-600 dark:text-amber-400">
                              {fmtHoursDecimal(rowTotal)}
                            </span>
                          </td>
                        </tr>
                      )
                    }

                    return rows
                  })()
                )}
              </tbody>

              {/* Footer totals */}
              {grid.rows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-cyan-500/20 bg-slate-100/60 dark:bg-slate-800/60">
                    <th
                      scope="row"
                      className="table-header px-4 py-3 text-left"
                    >
                      Totale giornaliero
                    </th>
                    {grid.colTotals.map((minutes, i) => (
                      <td
                        key={i}
                        className={[
                          'px-2 py-3 text-center tabular-nums font-semibold font-mono text-sm',
                          todayColIdx === i
                            ? 'bg-cyan-500/5 dark:bg-cyan-900/10'
                            : '',
                          colTotalClass(minutes),
                        ].join(' ')}
                      >
                        {fmtHoursDecimal(minutes)}
                      </td>
                    ))}
                    <td className="px-2 py-3 text-center tabular-nums font-bold font-mono text-sm text-amber-600 dark:text-amber-400">
                      {fmtHoursDecimal(grid.grandTotal)}
                    </td>
                  </tr>

                  {/* Target hint row */}
                  <tr className="bg-slate-50/40 dark:bg-slate-800/30">
                    <td
                      colSpan={7}
                      className="px-4 py-1.5 text-right text-[11px] text-slate-400 dark:text-slate-500"
                    >
                      Obiettivo giornaliero:&nbsp;
                      <span className="font-medium font-mono text-slate-500 dark:text-slate-400">
                        {fmtHoursDecimal(dailyTargetMinutes)}
                      </span>
                      &nbsp;·&nbsp; Obiettivo settimanale:&nbsp;
                      <span className="font-medium font-mono text-slate-500 dark:text-slate-400">
                        {weeklyTarget}h
                      </span>
                      &nbsp;·&nbsp; Registrato:&nbsp;
                      <span
                        className={[
                          'font-medium font-mono',
                          grid.grandTotal >= weeklyTarget * 60
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : grid.grandTotal > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400 dark:text-slate-500',
                        ].join(' ')}
                      >
                        {fmtHoursDecimal(grid.grandTotal)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
