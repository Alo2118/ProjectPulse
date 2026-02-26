/**
 * Weekly Report PDF Document Component (v4)
 * Struttura pagine PDF:
 *  P1 - Cover + Sintesi Esecutiva + KPI grid
 *  P2 - Grafici (Ore per Giorno, Distribuzione per Progetto, Top 5, Note)
 *  P3 - Statistiche Dipendenti      (solo team mode)
 *  P4 - Dashboard Progetti          (tree per progetto: avanzamento + task)
 *  P5 - Attività & Registrazioni    (fatto + task create + pianificato)
 *  P6 - Ore Registrate              (timesheet, condizionale)
 *  P7 - Rischi e Blocchi            (bloccanti + rischi, condizionale)
 */

import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type {
  WeeklyReportData, TaskSummary,
  EnrichedBlockedTask, BlockedTask, RiskSummary,
  PlannedTask, MilestoneRow,
  DetailedTimeEntry, ProjectHealthData,
} from '@/types'
import { PDFProgressBar } from './PDFProgressBar'

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  blue:     '#2563eb',
  blueDk:   '#1d4ed8',
  blueLt:   '#dbeafe',
  green:    '#16a34a',
  greenDk:  '#15803d',
  greenLt:  '#dcfce7',
  amber:    '#d97706',
  amberLt:  '#fef3c7',
  red:      '#dc2626',
  redLt:    '#fee2e2',
  purple:   '#7c3aed',
  purpleLt: '#ede9fe',
  cyan:     '#0891b2',
  gray900:  '#111827',
  gray700:  '#374151',
  gray600:  '#4b5563',
  gray500:  '#6b7280',
  gray400:  '#9ca3af',
  gray300:  '#d1d5db',
  gray200:  '#e5e7eb',
  gray100:  '#f3f4f6',
  gray50:   '#f9fafb',
  white:    '#ffffff',
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    padding: 26,
    paddingBottom: 44,
    backgroundColor: C.white,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.gray700,
  },

  // Cover
  coverBand:  { backgroundColor: C.blue, borderRadius: 6, padding: 14, marginBottom: 10 },
  coverTitle: { fontSize: 22, fontWeight: 'bold', color: C.white, marginBottom: 6 },
  coverSub:   { fontSize: 11, color: C.blueLt, marginBottom: 2 },
  coverMeta:  { fontSize: 9, color: C.blueLt },

  // RAG banner
  ragBanner:     { borderRadius: 5, padding: 9, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start' },
  ragBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 10, alignSelf: 'flex-start' },
  ragBadgeText:  { fontSize: 8, fontWeight: 'bold', color: C.white, letterSpacing: 0.8 },
  ragTitle:      { fontSize: 9, fontWeight: 'bold', marginBottom: 3 },
  ragBullet:     { fontSize: 8, marginBottom: 1.5, marginLeft: 2 },

  // KPI row
  kpiRow:      { flexDirection: 'row', marginBottom: 10 },
  kpiBox:      { flex: 1, borderRadius: 6, padding: 8, alignItems: 'center', marginRight: 8 },
  kpiBoxLast:  { flex: 1, borderRadius: 6, padding: 8, alignItems: 'center' },
  kpiNum:      { fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  kpiLabel:    { fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  // TOC (kept for TS compatibility, not rendered)
  tocBox:     { backgroundColor: C.gray50, borderRadius: 5, borderWidth: 1, borderColor: C.gray200, padding: 12 },
  tocTitle:   { fontSize: 10, fontWeight: 'bold', color: C.gray900, marginBottom: 6 },
  tocRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: C.gray200 },
  tocRowLast: { borderBottomWidth: 0 },
  tocLabel:   { fontSize: 9, color: C.gray600 },
  tocPage:    { fontSize: 9, color: C.blue, fontWeight: 'bold' },

  // Page headings
  pageH1:    { fontSize: 16, fontWeight: 'bold', color: C.gray900, marginBottom: 2 },
  pageH1Sub: { fontSize: 8, color: C.gray500, marginBottom: 8 },
  secTitle:  { fontSize: 10, fontWeight: 'bold', color: C.gray900, borderBottomWidth: 2, borderBottomColor: C.blue, paddingBottom: 4, marginBottom: 8, marginTop: 10 },
  secTitleFirst: { fontSize: 10, fontWeight: 'bold', color: C.gray900, borderBottomWidth: 2, borderBottomColor: C.blue, paddingBottom: 4, marginBottom: 8 },
  countNote: { fontSize: 7, color: C.gray400, marginBottom: 4, fontStyle: 'italic' },

  // Project card
  projectCard:       { marginBottom: 10, borderRadius: 5, borderWidth: 1, borderColor: C.gray200, overflow: 'hidden' },
  projectCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: C.gray50 },
  projectCode:       { fontSize: 7, fontWeight: 'bold', color: C.gray500, backgroundColor: C.gray200, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3, marginRight: 6 },
  projectName:       { flex: 1, fontSize: 9, fontWeight: 'bold', color: C.gray900 },
  projectBody:       { padding: 6, paddingTop: 4 },

  // Task sub-rows inside project card
  subSection: { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: C.gray100 },
  subTitle:   { fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  subRow:     { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 2, paddingLeft: 6, borderLeftWidth: 2, borderLeftColor: 'transparent', marginBottom: 2 },
  subText:    { flex: 1, fontSize: 7.5, color: C.gray700 },
  subMeta:    { fontSize: 7, color: C.gray400, marginLeft: 5 },

  // Table
  tblHeader:     { flexDirection: 'row', backgroundColor: C.gray100, padding: 6, borderRadius: 3, marginBottom: 2 },
  tblHeaderCell: { fontSize: 7, fontWeight: 'bold', color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.3 },
  tblRow:        { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.gray100, alignItems: 'flex-start' },
  tblCell:       { fontSize: 8, color: C.gray700 },

  // Milestone table columns
  msName:    { flex: 3 },
  msProject: { flex: 2 },
  msDate:    { width: 48, textAlign: 'center' as const },
  msStatus:  { width: 58, textAlign: 'center' as const },
  msDelta:   { width: 38, textAlign: 'center' as const },
  msAvanz:   { width: 50, textAlign: 'center' as const },

  // Pill badge
  pill:     { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' as const },
  pillText: { fontSize: 7, fontWeight: 'bold' },

  // Status pill (white text)
  statusPill:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { fontSize: 7, fontWeight: 'bold', color: C.white },

  // Blocker card
  blockerCard:   { marginBottom: 7, borderRadius: 4, borderLeftWidth: 4, borderLeftColor: C.red, borderWidth: 1, borderColor: C.gray200, padding: 8, backgroundColor: C.redLt },
  blockerHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  blockerTitle:  { flex: 1, fontSize: 9, fontWeight: 'bold', color: C.red },
  blockerDays:   { fontSize: 8, fontWeight: 'bold', color: C.red },
  blockerMeta:   { fontSize: 7.5, color: C.gray600, marginBottom: 1 },
  blockerReason: { fontSize: 7.5, color: C.gray700, fontStyle: 'italic', marginTop: 2 },

  // KPI grid
  kpiGrid:      { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  kpiGridBox:   { width: '25%', padding: 4 },
  kpiGridInner: { backgroundColor: C.gray50, borderRadius: 4, borderWidth: 1, borderColor: C.gray200, padding: 8, alignItems: 'center' },
  kpiGridVal:   { fontSize: 15, fontWeight: 'bold', color: C.gray900, marginBottom: 2 },
  kpiGridLabel: { fontSize: 6.5, textTransform: 'uppercase', color: C.gray500, textAlign: 'center', letterSpacing: 0.3 },

  // Horizontal bar (per project/user)
  hBarRow:   { marginBottom: 5 },
  hBarLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  hBarName:  { fontSize: 7.5, color: C.gray700 },
  hBarVal:   { fontSize: 7.5, color: C.gray500 },
  hBarTrack: { height: 7, backgroundColor: C.gray200, borderRadius: 3, overflow: 'hidden' },
  hBarFill:  { height: '100%', borderRadius: 3 },

  // Compare cards
  compareGrid:     { flexDirection: 'row', marginBottom: 12 },
  compareCard:     { flex: 1, backgroundColor: C.gray50, borderRadius: 5, padding: 8, borderWidth: 1, borderColor: C.gray200, marginRight: 8 },
  compareCardLast: { flex: 1, backgroundColor: C.gray50, borderRadius: 5, padding: 8, borderWidth: 1, borderColor: C.gray200 },
  compareLabel:    { fontSize: 7, textTransform: 'uppercase', color: C.gray500, marginBottom: 3, letterSpacing: 0.3 },
  compareValue:    { fontSize: 16, fontWeight: 'bold', color: C.gray900, marginBottom: 1 },
  compareDelta:    { fontSize: 7.5, fontWeight: 'bold' },

  // Insight box
  insightBox:   { backgroundColor: C.blueLt, borderLeftWidth: 3, borderLeftColor: C.blue, borderRadius: 4, padding: 8, marginTop: 8 },
  insightTitle: { fontSize: 8.5, fontWeight: 'bold', color: C.blueDk, marginBottom: 3 },
  insightText:  { fontSize: 7.5, color: C.gray700, lineHeight: 1.5 },

  // User chip
  userRow:       { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  userChip:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.blueLt, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, marginRight: 5, marginBottom: 4 },
  userChipName:  { fontSize: 7, fontWeight: 'bold', color: C.blueDk, marginRight: 4 },
  userChipHours: { fontSize: 7, color: C.blue },

  // Footer
  footer: {
    position: 'absolute', bottom: 18, left: 32, right: 32,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 6, borderTopWidth: 1, borderTopColor: C.gray200,
  },
  footerText: { fontSize: 7, color: C.gray400 },

  // ── Timesheet styles ──────────────────────────────────────────────────────
  tsUserBand:     { backgroundColor: C.blue, borderRadius: 4, padding: 7, marginBottom: 6 },
  tsUserName:     { fontSize: 9, fontWeight: 'bold', color: C.white },
  tsUserHours:    { fontSize: 8, color: C.blueLt, marginTop: 1 },
  tsDayBand:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.gray100, padding: '5 8', borderRadius: 3, marginTop: 6, marginBottom: 2 },
  tsDayLabel:     { fontSize: 8, fontWeight: 'bold', color: C.gray700 },
  tsDayTotal:     { fontSize: 8, fontWeight: 'bold', color: C.blue },
  tsEntry:        { flexDirection: 'row', paddingVertical: 2.5, borderBottomWidth: 1, borderBottomColor: C.gray100, alignItems: 'flex-start' },
  tsEntryProject: { width: 100, fontSize: 7.5, color: C.gray700, paddingRight: 4 },
  tsEntryTask:    { flex: 1, fontSize: 7.5, color: C.gray900, paddingRight: 4 },
  tsEntryDesc:    { flex: 1, fontSize: 7, color: C.gray500, fontStyle: 'italic', paddingRight: 4 },
  tsEntryHours:   { width: 32, fontSize: 7.5, color: C.blue, fontWeight: 'bold', textAlign: 'right' },
  tsGrandTotal:   { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: C.gray700, paddingTop: 5, marginTop: 6 },
  tsGrandLabel:   { fontSize: 9, fontWeight: 'bold', color: C.gray900 },
  tsGrandVal:     { fontSize: 9, fontWeight: 'bold', color: C.blue },

  // ── User stat card styles ─────────────────────────────────────────────────
  uCard:        { width: '48%', borderRadius: 5, borderWidth: 1, borderColor: C.gray200, padding: 8, marginBottom: 6 },
  uCardHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  uCardName:    { flex: 1, fontSize: 9, fontWeight: 'bold', color: C.gray900 },
  uCardBadge:   { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  uCardBadgeText: { fontSize: 7, fontWeight: 'bold' },
  uTaskRow:     { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 5 },
  uTaskStat:    { alignItems: 'center' },
  uTaskVal:     { fontSize: 11, fontWeight: 'bold', marginBottom: 1 },
  uTaskLabel:   { fontSize: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  uMeta:        { fontSize: 7, color: C.gray500, marginBottom: 4 },
  uMiniBar:     { height: 4, backgroundColor: C.gray200, borderRadius: 2, overflow: 'hidden', marginBottom: 3 },
  uProjDot:     { width: 6, height: 6, borderRadius: 3, marginRight: 4, flexShrink: 0, marginTop: 1 },
  uProjRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  uProjName:    { fontSize: 7, color: C.gray600, flex: 1 },

  // ── Team summary bar styles ───────────────────────────────────────────────
  teamSummaryRow:   { flexDirection: 'row', backgroundColor: C.gray50, borderRadius: 5, padding: 10, marginBottom: 12 },
  teamSummaryCell:  { flex: 1, alignItems: 'center' },
  teamSummaryVal:   { fontSize: 14, fontWeight: 'bold', color: C.blue, marginBottom: 2 },
  teamSummaryLabel: { fontSize: 6.5, textTransform: 'uppercase', color: C.gray500, textAlign: 'center' },
})

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmtH(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

function statusColor(st: string) {
  return st === 'on-track' ? C.green : st === 'at-risk' ? C.amber : C.red
}
function statusLabel(st: string) {
  return st === 'on-track' ? 'IN LINEA' : st === 'at-risk' ? 'A RISCHIO' : 'IN RITARDO'
}


function categoryLabel(cat: string) {
  const labels: Record<string, string> = {
    dependency: 'Dipendenza', resource: 'Risorsa', bug: 'Bug',
    approval: 'Approvazione', technical: 'Tecnico',
    financial: 'Finanziario', operational: 'Operativo',
    external: 'Esterno', other: 'Altro',
  }
  return labels[cat] ?? cat
}

const ITALIAN_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
const ITALIAN_MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

function italianDayLabel(isoDate: string): string {
  const d = new Date(isoDate)
  // getDay() returns 0=Sun, 1=Mon, ..., 6=Sat → map to Mon-Sun index
  const dayIdx = (d.getDay() + 6) % 7
  return `${ITALIAN_DAYS[dayIdx]} ${d.getDate()} ${ITALIAN_MONTHS[d.getMonth()]}`
}

// Short day label: "Lun 17"
function shortDayLabel(isoDate: string): string {
  const d = new Date(isoDate)
  const dayIdx = (d.getDay() + 6) % 7
  return `${ITALIAN_DAYS[dayIdx].substring(0, 3)} ${d.getDate()}`
}

// Generate an array of 7 ISO date strings (Mon → Sun) from the week start date
function weekDates(weekStartDate: string): string[] {
  const dates: string[] = []
  const base = new Date(weekStartDate)
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

// ─── Helper interfaces ────────────────────────────────────────────────────────

interface UserStat {
  userId: string
  userName: string
  totalMinutes: number
  daysWorked: number
  avgHoursPerDay: number
  tasksCompleted: number
  tasksInProgress: number
  tasksBlocked: number
  dailyMinutes: Record<string, number>
  projects: Array<{ projectId: string; projectName: string; status: string }>
}

interface TimesheetEntryRow {
  projectName: string
  taskTitle: string
  description: string | null
  durationMinutes: number
}

interface TimesheetDay {
  dateLabel: string
  isoDate: string
  totalMinutes: number
  entries: TimesheetEntryRow[]
}

interface TimesheetUser {
  userId: string
  userName: string
  totalMinutes: number
  days: TimesheetDay[]
}

// ─── Helper: computeUserStats ─────────────────────────────────────────────────
function computeUserStats(
  entries: DetailedTimeEntry[],
  byUser: Array<{ userId: string; userName: string; totalMinutes: number }>,
  completed: TaskSummary[],
  inProgress: TaskSummary[],
  blocked: BlockedTask[],
  projectHealth: ProjectHealthData[],
): UserStat[] {
  // Build per-user daily minutes map from entries
  const dailyMap = new Map<string, Map<string, number>>()
  const projectsMap = new Map<string, Map<string, string>>() // userId → projectId → projectName

  for (const entry of entries) {
    if (entry.duration === null) continue
    const dateKey = entry.startTime.split('T')[0]

    if (!dailyMap.has(entry.userId)) dailyMap.set(entry.userId, new Map())
    const userDaily = dailyMap.get(entry.userId)!
    userDaily.set(dateKey, (userDaily.get(dateKey) ?? 0) + entry.duration)

    if (!projectsMap.has(entry.userId)) projectsMap.set(entry.userId, new Map())
    const userProjects = projectsMap.get(entry.userId)!
    if (!userProjects.has(entry.projectId)) {
      userProjects.set(entry.projectId, entry.projectName)
    }
  }

  const result: UserStat[] = byUser.map(u => {
    const userDaily = dailyMap.get(u.userId) ?? new Map<string, number>()
    const dailyMinutes: Record<string, number> = {}
    userDaily.forEach((mins, date) => { dailyMinutes[date] = mins })

    const daysWorked = userDaily.size
    const avgHoursPerDay = daysWorked > 0 ? (u.totalMinutes / 60) / daysWorked : 0

    const tasksCompleted  = completed.filter(t => t.assigneeId === u.userId).length
    const tasksInProgress = inProgress.filter(t => t.assigneeId === u.userId).length
    const tasksBlocked    = blocked.filter(t => t.assigneeId === u.userId).length

    const userProjMap = projectsMap.get(u.userId) ?? new Map<string, string>()
    const userProjects: Array<{ projectId: string; projectName: string; status: string }> = []
    userProjMap.forEach((projectName, projectId) => {
      const ph = projectHealth.find(p => p.projectId === projectId)
      userProjects.push({
        projectId,
        projectName,
        status: ph?.status ?? 'on-track',
      })
    })

    return {
      userId: u.userId,
      userName: u.userName,
      totalMinutes: u.totalMinutes,
      daysWorked,
      avgHoursPerDay,
      tasksCompleted,
      tasksInProgress,
      tasksBlocked,
      dailyMinutes,
      projects: userProjects,
    }
  })

  return result.sort((a, b) => b.totalMinutes - a.totalMinutes)
}

// ─── Helper: buildTimesheetData ───────────────────────────────────────────────
function buildTimesheetData(
  entries: DetailedTimeEntry[],
  weekStartDate: string,
  userId?: string | null,
): TimesheetUser[] {
  const filteredEntries = userId ? entries.filter(e => e.userId === userId) : entries

  // Group by userId → isoDate → entries
  const userMap = new Map<string, { userName: string; dayMap: Map<string, TimesheetEntryRow[]> }>()

  for (const entry of filteredEntries) {
    if (entry.duration === null || entry.duration === 0) continue
    const dateKey = entry.startTime.split('T')[0]

    if (!userMap.has(entry.userId)) {
      userMap.set(entry.userId, { userName: entry.userName, dayMap: new Map() })
    }
    const userRecord = userMap.get(entry.userId)!
    if (!userRecord.dayMap.has(dateKey)) {
      userRecord.dayMap.set(dateKey, [])
    }
    userRecord.dayMap.get(dateKey)!.push({
      projectName: entry.projectName,
      taskTitle: entry.taskTitle,
      description: entry.description,
      durationMinutes: entry.duration,
    })
  }

  const wDates = weekDates(weekStartDate)

  const result: TimesheetUser[] = []
  userMap.forEach((record, uid) => {
    // Build days array sorted chronologically (Mon–Sun)
    const days: TimesheetDay[] = []
    for (const isoDate of wDates) {
      const dayEntries = record.dayMap.get(isoDate)
      if (!dayEntries || dayEntries.length === 0) continue

      // Sort entries within day by project name then task title
      const sorted = [...dayEntries].sort((a, b) => {
        const pc = a.projectName.localeCompare(b.projectName)
        return pc !== 0 ? pc : a.taskTitle.localeCompare(b.taskTitle)
      })

      const totalMinutes = sorted.reduce((sum, e) => sum + e.durationMinutes, 0)
      days.push({
        dateLabel: italianDayLabel(isoDate),
        isoDate,
        totalMinutes,
        entries: sorted,
      })
    }

    const totalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0)

    result.push({
      userId: uid,
      userName: record.userName,
      totalMinutes,
      days,
    })
  })

  return result.sort((a, b) => a.userName.localeCompare(b.userName))
}

// ─── Footer component ─────────────────────────────────────────────────────────
const Footer: React.FC<{ pn: number; total: number; weekNum: number; year: number }> = ({ pn, total, weekNum, year }) => (
  <View style={s.footer}>
    <Text style={s.footerText}>ProjectPulse</Text>
    <Text style={s.footerText}>Settimana {weekNum}/{year}</Text>
    <Text style={s.footerText}>Pagina {pn} di {total}</Text>
  </View>
)

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  data: WeeklyReportData
  selectedUserId?: string | null
}

export function WeeklyReportPDF({ data, selectedUserId }: Props) {
  const isTeamMode = data.userId === 'team'

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredCompleted: TaskSummary[] = selectedUserId
    ? data.tasks.completed.filter(t => t.assigneeId === selectedUserId)
    : data.tasks.completed

  const filteredInProgress: TaskSummary[] = selectedUserId
    ? data.tasks.inProgress.filter(t => t.assigneeId === selectedUserId)
    : data.tasks.inProgress

  const blockerItems: Array<EnrichedBlockedTask | BlockedTask> =
    data.blockerAnalysis?.items ?? data.blockedTasks

  const filteredBlockers = selectedUserId
    ? blockerItems.filter(t => t.assigneeId === selectedUserId)
    : blockerItems

  const filteredDailyData = React.useMemo(() => {
    if (!selectedUserId || !data.timeTracking.entries) return data.timeTracking.byDay
    const map = new Map<string, number>()
    data.timeTracking.entries
      .filter(e => e.userId === selectedUserId)
      .forEach(e => {
        const key = e.startTime.split('T')[0]
        map.set(key, (map.get(key) ?? 0) + (e.duration ?? 0))
      })
    return data.timeTracking.byDay.map(d => ({
      date: d.date,
      totalMinutes: map.get(d.date.split('T')[0]) ?? 0,
    }))
  }, [selectedUserId, data.timeTracking.entries, data.timeTracking.byDay])

  const totalMinutes = selectedUserId
    ? filteredDailyData.reduce((sum, d) => sum + d.totalMinutes, 0)
    : data.timeTracking.totalMinutes

  // ── Core numbers ───────────────────────────────────────────────────────────
  const completed  = filteredCompleted.length
  const inProgress = filteredInProgress.length
  const blocked    = filteredBlockers.length

  // ── New data ───────────────────────────────────────────────────────────────
  const milestones: MilestoneRow[] = data.milestonesTable ?? []
  const risks: RiskSummary[] = data.risks ?? []

  const plannedFiltered: PlannedTask[] = React.useMemo(() => {
    const all = data.plannedNextWeek ?? []
    return selectedUserId ? all.filter(t => t.assigneeId === selectedUserId) : all
  }, [data.plannedNextWeek, selectedUserId])

  // ── RAG status ─────────────────────────────────────────────────────────────
  const hasOffTrack        = data.projectHealth?.some(p => p.status === 'off-track') ?? false
  const hasAtRisk          = data.projectHealth?.some(p => p.status === 'at-risk') ?? false
  const hasBlockers        = blocked > 0
  const hasOverdueMilestone = milestones.some(m => m.isOverdue)
  const globalRag: 'green' | 'amber' | 'red' =
    hasOffTrack || hasOverdueMilestone ? 'red'
    : hasAtRisk || hasBlockers        ? 'amber'
    : 'green'

  const ragCfg = {
    green: { bg: C.greenLt, border: C.green,   text: C.greenDk, badgeBg: C.green,  badge: 'ON TRACK'  },
    amber: { bg: C.amberLt, border: C.amber,   text: C.amber,   badgeBg: C.amber,  badge: 'A RISCHIO' },
    red:   { bg: C.redLt,   border: C.red,     text: C.red,     badgeBg: C.red,    badge: 'CRITICO'   },
  }[globalRag]

  // ── Executive bullets ──────────────────────────────────────────────────────
  const execBullets: string[] = []
  execBullets.push(`${completed} task completati questa settimana`)
  execBullets.push(`${fmtH(totalMinutes)} registrate`)
  if (blocked > 0) execBullets.push(`${blocked} task blocat${blocked === 1 ? 'o richiede' : 'i richiedono'} attenzione`)
  const imminentMs = milestones.find(m =>
    m.status !== 'done' && m.status !== 'cancelled' &&
    m.daysLeft !== null && m.daysLeft >= 0 && m.daysLeft <= 7
  )
  if (imminentMs) execBullets.push(`Milestone "${imminentMs.title}" scade tra ${imminentMs.daysLeft}gg`)
  if (hasOffTrack) {
    const n = data.projectHealth!.filter(p => p.status === 'off-track').length
    execBullets.push(`${n} progett${n === 1 ? 'o in ritardo' : 'i in ritardo'}`)
  }

  // ── Display info ───────────────────────────────────────────────────────────
  const userName = selectedUserId
    ? (data.timeTracking.byUser?.find(u => u.userId === selectedUserId)?.userName ?? data.userName)
    : data.userName
  const startDate = new Date(data.weekStartDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })
  const endDate   = new Date(data.weekEndDate).toLocaleDateString('it-IT',   { day: '2-digit', month: 'long', year: 'numeric' })

  // ── Accomplished grouped by project ───────────────────────────────────────
  const accomplishedByProject = React.useMemo(() => {
    const result: Array<{ projectName: string; tasks: Array<{ id: string; title: string; assigneeName: string | null }> }> = []
    if (data.projectHealth) {
      for (const ph of data.projectHealth) {
        const tasks = ph.completedThisWeek ?? []
        const filtered = selectedUserId
          ? tasks.filter(t => filteredCompleted.some(c => c.id === t.id))
          : tasks
        if (filtered.length > 0) result.push({ projectName: ph.projectName, tasks: filtered })
      }
    }
    if (result.length === 0 && filteredCompleted.length > 0) {
      const map = new Map<string, typeof result[0]>()
      for (const t of filteredCompleted) {
        const key = t.projectName ?? 'Nessun progetto'
        const entry = map.get(key) ?? { projectName: key, tasks: [] }
        entry.tasks.push({ id: t.id, title: t.title, assigneeName: t.assigneeName ?? null })
        map.set(key, entry)
      }
      result.push(...Array.from(map.values()))
    }
    return result
  }, [data.projectHealth, filteredCompleted, selectedUserId])

  // ── Planned grouped by project ─────────────────────────────────────────────
  const plannedByProject = React.useMemo(() => {
    const map = new Map<string, { projectName: string; tasks: PlannedTask[] }>()
    for (const t of plannedFiltered) {
      const key = t.projectId || t.projectName || 'Altro'
      const entry = map.get(key) ?? { projectName: t.projectName ?? 'Nessun progetto', tasks: [] }
      entry.tasks.push(t)
      map.set(key, entry)
    }
    return Array.from(map.values())
  }, [plannedFiltered])

  // ── Top projects ───────────────────────────────────────────────────────────
  const topProjects = [...data.timeTracking.byProject]
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 6)

  // ── High risks ─────────────────────────────────────────────────────────────
  const highRisks = risks.filter(r => r.riskLevel >= 7)

  // ── Page presence ──────────────────────────────────────────────────────────
  const hasProjectsPage   = (data.projectHealth?.length ?? 0) > 0
  const hasRisksBlockPage = filteredBlockers.length > 0 || risks.length > 0

  const hasUserStatsPage = isTeamMode && !selectedUserId &&
    (data.timeTracking.byUser?.length ?? 0) > 0 &&
    (data.timeTracking.entries?.length ?? 0) > 0

  const hasTimesheetPage = (data.timeTracking.entries?.length ?? 0) > 0

  // ── Page count ─────────────────────────────────────────────────────────────
  // P1: Cover + Sintesi Esecutiva + KPI grid  (always)
  // P2: Grafici (Ore per Giorno, Distribuzione, Top 5, Note)  (always)
  // P3: Statistiche Dipendenti  (conditional: team mode)
  // P4: Dashboard Progetti  (conditional)
  // P5: Attività & Registrazioni (fatto + task create + pianificato)  (always)
  // P6: Ore Registrate  (conditional: hasTimesheetPage)
  // P7: Rischi e Blocchi  (conditional)
  let pCount = 2                       // P1 cover+KPI + P2 grafici (always present)
  if (hasUserStatsPage) pCount++       // P3 statistiche dipendenti
  if (hasProjectsPage)  pCount++       // P4 dashboard
  pCount++                             // P5 attività & registrazioni (always)
  if (hasTimesheetPage) pCount++       // P6 ore registrate
  if (hasRisksBlockPage) pCount++      // P7 rischi
  const totalPages = pCount

  let pageIdx = 0
  const nextPage = () => ++pageIdx

  // ── Computed data for new pages ────────────────────────────────────────────
  const userStats: UserStat[] = React.useMemo(() => {
    if (!hasUserStatsPage) return []
    return computeUserStats(
      data.timeTracking.entries!,
      data.timeTracking.byUser!,
      data.tasks.completed,
      data.tasks.inProgress,
      data.blockedTasks,
      data.projectHealth ?? [],
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUserStatsPage, data])

  const timesheetData: TimesheetUser[] = React.useMemo(() => {
    if (!hasTimesheetPage || !data.timeTracking.entries) return []
    return buildTimesheetData(
      data.timeTracking.entries,
      data.weekStartDate,
      isTeamMode && !selectedUserId ? null : (selectedUserId ?? null),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTimesheetPage, data.timeTracking.entries, data.weekStartDate, isTeamMode, selectedUserId])

  // Team avg hours/day for the user stats page
  const teamTotalMinutes = data.timeTracking.byUser?.reduce((sum, u) => sum + u.totalMinutes, 0) ?? 0
  const teamActiveCount  = data.timeTracking.byUser?.length ?? 0
  const teamAvgHoursDay: number = React.useMemo(() => {
    if (!userStats.length) return 0
    const totalDays = userStats.reduce((sum, u) => sum + u.daysWorked, 0)
    return totalDays > 0 ? (teamTotalMinutes / 60) / totalDays : 0
  }, [userStats, teamTotalMinutes])

  const maxUserMinutes = userStats.reduce((m, u) => Math.max(m, u.totalMinutes), 1)

  const wDatesArr = React.useMemo(() => weekDates(data.weekStartDate), [data.weekStartDate])

  // max daily minutes across all users (for mini bar chart scaling)
  const maxDayMinutes: number = React.useMemo(() => {
    let max = 1
    for (const u of userStats) {
      for (const mins of Object.values(u.dailyMinutes)) {
        if (mins > max) max = mins
      }
    }
    return max
  }, [userStats])

  // ── Note di Analisi lines (shared between P1 and P2 render) ───────────────
  const analysisLines: string[] = React.useMemo(() => {
    const compRate = (completed + inProgress) > 0 ? (completed / (completed + inProgress)) * 100 : 0
    const totalHoursVal = totalMinutes / 60
    const lines: string[] = []
    if (compRate >= 80) lines.push(`\u2022 Ottimo tasso di completamento (${compRate.toFixed(0)}%).`)
    else if (compRate < 40 && (completed + inProgress) > 0) lines.push(`\u2022 Tasso completamento basso (${compRate.toFixed(0)}%). Valuta le priorit\u00e0.`)
    if (totalHoursVal > 48) lines.push(`\u2022 Carico elevato (${fmtH(totalMinutes)}). Attenzione al work-life balance.`)
    if (blocked > 0) lines.push(`\u2022 ${blocked} situazion${blocked === 1 ? 'e bloccante' : 'i bloccanti'} attiv${blocked === 1 ? 'a' : 'e'} \u2014 richiede intervento.`)
    if (data.productivity?.onTimeDeliveryRate != null && data.productivity.onTimeDeliveryRate < 70)
      lines.push(`\u2022 Consegne puntuali al ${data.productivity.onTimeDeliveryRate.toFixed(0)}%. Controlla le scadenze.`)
    return lines
  }, [completed, inProgress, totalMinutes, blocked, data.productivity])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Document>

      {/* ================================================================
          P1 — COVER + SINTESI ESECUTIVA + KPI GRID
      ================================================================ */}
      <Page size="A4" style={s.page}>
        {/* Cover band */}
        <View style={s.coverBand}>
          <Text style={s.coverTitle}>Report Settimanale</Text>
          <Text style={s.coverSub}>
            {`Settimana ${data.weekNumber} del ${data.year}  \u00B7  ${startDate} \u2013 ${endDate}`}
          </Text>
          {isTeamMode && !selectedUserId
            ? <Text style={s.coverMeta}>{'Modalit\u00e0: Vista Team \u2014 tutti i dipendenti'}</Text>
            : <Text style={s.coverMeta}>Collaboratore: {userName}</Text>
          }
        </View>

        {/* RAG status banner */}
        <View style={[s.ragBanner, {
          backgroundColor: ragCfg.bg,
          borderWidth: 1, borderColor: ragCfg.border,
          borderLeftWidth: 4, borderLeftColor: ragCfg.border,
        }]}>
          <View style={[s.ragBadge, { backgroundColor: ragCfg.badgeBg }]}>
            <Text style={s.ragBadgeText}>{ragCfg.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.ragTitle, { color: ragCfg.text }]}>Stato generale della settimana</Text>
            {execBullets.map((b, i) => (
              <Text key={i} style={[s.ragBullet, { color: ragCfg.text }]}>{'\u2022'} {b}</Text>
            ))}
          </View>
        </View>

        {/* Risk alert in cover */}
        {risks.length > 0 && (
          <View style={[s.insightBox, {
            marginBottom: 12,
            backgroundColor: highRisks.length > 0 ? C.redLt : C.amberLt,
            borderLeftColor: highRisks.length > 0 ? C.red : C.amber,
          }]}>
            <Text style={[s.insightTitle, { color: highRisks.length > 0 ? C.red : C.amber }]}>
              {'[!] '}{risks.length}{' rischi attivi'}
              {highRisks.length > 0 ? ` \u2014 ${highRisks.length} ad alto impatto` : ''}
            </Text>
            <Text style={[s.insightText, { color: C.gray700 }]}>
              Vedi la sezione Rischi e Blocchi per il dettaglio completo
            </Text>
          </View>
        )}

        {/* ── KPI grid */}
        <Text style={s.secTitleFirst}>Metriche Operative</Text>
        <View style={s.kpiGrid}>
          {[
            { label: 'Ore totali',        val: fmtH(totalMinutes) },
            { label: 'Giorni lavorati',   val: String(data.productivity?.daysWorked ?? '\u2014') },
            { label: 'Media ore/giorno',  val: data.productivity ? fmtH(Math.round(data.productivity.avgHoursPerDay * 60)) : '\u2014' },
            { label: 'Task completati',   val: String(completed) },
            { label: 'Task in corso',     val: String(inProgress) },
            { label: 'Bloccati',          val: String(blocked) },
            { label: 'Commenti',          val: String(data.comments.total) },
            { label: 'Consegne puntuali', val: data.productivity ? `${data.productivity.onTimeDeliveryRate}%` : '\u2014' },
          ].map((m, i) => (
            <View key={i} style={s.kpiGridBox}>
              <View style={s.kpiGridInner}>
                <Text style={s.kpiGridVal}>{m.val}</Text>
                <Text style={s.kpiGridLabel}>{m.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <Footer pn={nextPage()} total={totalPages} weekNum={data.weekNumber} year={data.year} />
      </Page>


      {/* ================================================================
          P2 — GRAFICI (Ore per Giorno, Distribuzione, Top 5, Note)
      ================================================================ */}
      <Page size="A4" style={s.page}>
        <Text style={s.pageH1}>Analisi Operativa</Text>
        <Text style={s.pageH1Sub}>
          {isTeamMode && !selectedUserId
            ? `Distribuzione ore e attività del team \u2014 settimana ${data.weekNumber}/${data.year}`
            : `Distribuzione ore e attività di ${userName} \u2014 settimana ${data.weekNumber}/${data.year}`}
        </Text>

        {/* ── Ore per Giorno bar chart */}
        {filteredDailyData.length > 0 && (() => {
          const maxMin  = Math.max(...filteredDailyData.map(d => d.totalMinutes), 1)
          const maxBarH = 48
          return (
            <>
              <Text style={s.secTitleFirst}>Ore per Giorno</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: maxBarH + 28 }}>
                {filteredDailyData.map(day => {
                  const barH      = day.totalMinutes > 0 ? Math.max((day.totalMinutes / maxMin) * maxBarH, 3) : 0
                  const isWeekend = [0, 6].includes(new Date(day.date).getDay())
                  const dayName   = new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' }).substring(0, 3)
                  return (
                    <View key={day.date} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 7, color: C.gray600, marginBottom: 3 }}>
                        {day.totalMinutes > 0 ? fmtH(day.totalMinutes) : ''}
                      </Text>
                      <View style={{ width: '65%', height: maxBarH, justifyContent: 'flex-end' }}>
                        {barH > 0 && (
                          <View style={{ width: '100%', height: barH, backgroundColor: isWeekend ? C.amber : C.blue, borderRadius: 2 }} />
                        )}
                        {barH === 0 && (
                          <View style={{ width: '100%', height: 2, backgroundColor: C.gray200, borderRadius: 1 }} />
                        )}
                      </View>
                      <Text style={{ fontSize: 7, color: C.gray500, marginTop: 4 }}>{dayName}</Text>
                    </View>
                  )
                })}
              </View>
            </>
          )
        })()}

        {/* ── Distribuzione per Progetto */}
        {topProjects.length > 0 && (
          <>
            <Text style={s.secTitle}>Distribuzione per Progetto</Text>
            {topProjects.map((p, i) => {
              const barColors = [C.blue, C.green, C.purple, C.amber, '#ec4899', C.cyan]
              const total = data.timeTracking.byProject.reduce((sum, x) => sum + x.totalMinutes, 0)
              const pct   = total > 0 ? (p.totalMinutes / total) * 100 : 0
              return (
                <View key={p.projectId} style={s.hBarRow}>
                  <View style={s.hBarLabel}>
                    <Text style={s.hBarName}>{p.projectName}</Text>
                    <Text style={s.hBarVal}>{fmtH(p.totalMinutes)}  ({pct.toFixed(0)}%)</Text>
                  </View>
                  <View style={s.hBarTrack}>
                    <View style={[s.hBarFill, { width: `${pct}%`, backgroundColor: barColors[i % barColors.length] }]} />
                  </View>
                </View>
              )
            })}
          </>
        )}

        {/* ── Top 5 Attività */}
        {data.timeTracking.byTask.length > 0 && (() => {
          const top5Tasks = [...data.timeTracking.byTask]
            .sort((a, b) => b.totalMinutes - a.totalMinutes)
            .slice(0, 5)
          const maxTaskMin = top5Tasks[0]?.totalMinutes ?? 1
          const taskBarColors = [C.blue, C.green, C.purple, C.amber, C.cyan]
          return (
            <>
              <Text style={s.secTitle}>Top 5 Attività per Ore</Text>
              {top5Tasks.map((t, i) => {
                const pct = (t.totalMinutes / maxTaskMin) * 100
                return (
                  <View key={t.taskId} style={s.hBarRow}>
                    <View style={s.hBarLabel}>
                      <Text style={s.hBarName}>{t.taskTitle}</Text>
                      <Text style={[s.hBarVal, { color: C.gray400 }]}>{t.projectName} · {fmtH(t.totalMinutes)}</Text>
                    </View>
                    <View style={s.hBarTrack}>
                      <View style={[s.hBarFill, { width: `${pct}%`, backgroundColor: taskBarColors[i] }]} />
                    </View>
                  </View>
                )
              })}
            </>
          )
        })()}

        {/* ── Note di Analisi */}
        {analysisLines.length > 0 && (
          <View style={[s.insightBox, { marginTop: 8 }]}>
            <Text style={s.insightTitle}>Note di Analisi</Text>
            <Text style={s.insightText}>{analysisLines.join('\n')}</Text>
          </View>
        )}

        <Footer pn={nextPage()} total={totalPages} weekNum={data.weekNumber} year={data.year} />
      </Page>


      {/* ================================================================
          P3 — STATISTICHE DIPENDENTI (team mode only)
      ================================================================ */}
      {hasUserStatsPage && (
        <Page size="A4" style={s.page}>
          <Text style={s.pageH1}>Statistiche Dipendenti</Text>
          <Text style={s.pageH1Sub}>
            Riepilogo operativo e ore registrate per ogni membro del team questa settimana
          </Text>

          {/* Team Summary Bar */}
          <View style={s.teamSummaryRow}>
            <View style={s.teamSummaryCell}>
              <Text style={s.teamSummaryVal}>{fmtH(teamTotalMinutes)}</Text>
              <Text style={s.teamSummaryLabel}>Ore totali team</Text>
            </View>
            <View style={[s.teamSummaryCell, { borderLeftWidth: 1, borderLeftColor: C.gray200 }]}>
              <Text style={s.teamSummaryVal}>{teamActiveCount}</Text>
              <Text style={s.teamSummaryLabel}>Dipendenti attivi</Text>
            </View>
            <View style={[s.teamSummaryCell, { borderLeftWidth: 1, borderLeftColor: C.gray200 }]}>
              <Text style={s.teamSummaryVal}>{fmtH(Math.round(teamAvgHoursDay * 60))}</Text>
              <Text style={s.teamSummaryLabel}>Media ore/giorno team</Text>
            </View>
          </View>

          {/* User Cards grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {userStats.map(u => {
              const orePercent = maxUserMinutes > 0 ? (u.totalMinutes / maxUserMinutes) * 100 : 0
              const hoursTotal = u.totalMinutes / 60
              // Badge color based on hours range
              const badgeColor = hoursTotal >= 20 && hoursTotal <= 40 ? C.green
                : hoursTotal < 20 ? C.amber : C.red
              const badgeBg = hoursTotal >= 20 && hoursTotal <= 40 ? C.greenLt
                : hoursTotal < 20 ? C.amberLt : C.redLt

              return (
                <View key={u.userId} style={s.uCard} wrap={false}>
                  {/* Card header: name + hours badge */}
                  <View style={s.uCardHead}>
                    <Text style={s.uCardName}>{u.userName}</Text>
                    <View style={[s.uCardBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[s.uCardBadgeText, { color: badgeColor }]}>
                        {fmtH(u.totalMinutes)}
                      </Text>
                    </View>
                  </View>

                  {/* Ore bar */}
                  <View style={s.uMiniBar}>
                    <View style={{ width: `${orePercent}%`, height: '100%', backgroundColor: C.blue, borderRadius: 2 }} />
                  </View>
                  <Text style={[s.uMeta, { marginBottom: 5 }]}>
                    {fmtH(u.totalMinutes)} ({orePercent.toFixed(0)}%)
                  </Text>

                  {/* Task row: 3 mini stats */}
                  <View style={s.uTaskRow}>
                    <View style={s.uTaskStat}>
                      <Text style={[s.uTaskVal, { color: C.green }]}>{u.tasksCompleted}</Text>
                      <Text style={[s.uTaskLabel, { color: C.green }]}>Completati</Text>
                    </View>
                    <View style={s.uTaskStat}>
                      <Text style={[s.uTaskVal, { color: C.blue }]}>{u.tasksInProgress}</Text>
                      <Text style={[s.uTaskLabel, { color: C.blue }]}>In Corso</Text>
                    </View>
                    <View style={s.uTaskStat}>
                      <Text style={[s.uTaskVal, { color: u.tasksBlocked > 0 ? C.red : C.gray400 }]}>
                        {u.tasksBlocked}
                      </Text>
                      <Text style={[s.uTaskLabel, { color: u.tasksBlocked > 0 ? C.red : C.gray400 }]}>Bloccati</Text>
                    </View>
                  </View>

                  {/* Meta row */}
                  <Text style={s.uMeta}>
                    {u.daysWorked} {u.daysWorked === 1 ? 'giorno lavorato' : 'giorni lavorati'} {'\u00B7'} media {fmtH(Math.round(u.avgHoursPerDay * 60))}/giorno
                  </Text>

                  {/* Mini daily bar chart (7 bars Mon–Sun) */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 18, marginBottom: 5 }}>
                    {wDatesArr.map((isoDate, idx) => {
                      const mins = u.dailyMinutes[isoDate] ?? 0
                      const barH = mins > 0 ? Math.max((mins / maxDayMinutes) * 14, 2) : 0
                      const isWeekend = idx >= 5
                      return (
                        <View key={isoDate} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 18 }}>
                          {barH > 0 && (
                            <View style={{
                              width: '70%',
                              height: barH,
                              backgroundColor: isWeekend ? C.amber : C.blue,
                              borderRadius: 1,
                            }} />
                          )}
                          {barH === 0 && (
                            <View style={{ width: '70%', height: 2, backgroundColor: C.gray200, borderRadius: 1 }} />
                          )}
                        </View>
                      )
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', marginBottom: 5 }}>
                    {wDatesArr.map((_, idx) => (
                      <Text key={idx} style={{ flex: 1, fontSize: 5.5, color: C.gray400, textAlign: 'center' }}>
                        {ITALIAN_DAYS[idx].substring(0, 2)}
                      </Text>
                    ))}
                  </View>

                  {/* Project list (max 3) */}
                  {u.projects.slice(0, 3).map(p => (
                    <View key={p.projectId} style={s.uProjRow}>
                      <View style={[s.uProjDot, { backgroundColor: statusColor(p.status) }]} />
                      <Text style={s.uProjName}>{p.projectName}</Text>
                    </View>
                  ))}
                  {u.projects.length > 3 && (
                    <Text style={[s.uMeta, { marginTop: 1 }]}>+{u.projects.length - 3} altri progetti</Text>
                  )}
                </View>
              )
            })}
          </View>

          <Footer pn={nextPage()} total={totalPages} weekNum={data.weekNumber} year={data.year} />
        </Page>
      )}


      {/* ================================================================
          P4 — DASHBOARD PROGETTI
      ================================================================ */}
      {hasProjectsPage && (
        <Page size="A4" style={s.page}>
          <Text style={s.pageH1}>Dashboard Progetti</Text>
          <Text style={s.pageH1Sub}>Avanzamento e attività per progetto — settimana {data.weekNumber}/{data.year}</Text>

          {data.projectHealth!.map(p => {
            const doneTasks = p.completedThisWeek ?? []
            const ipTasks   = p.inProgressTasks ?? []
            const blTasks   = p.blockedTasksList ?? []

            // Collect all tasks to show: blocked first, then in-progress, then completed. Max 5.
            const allTasks: Array<{ title: string; assigneeName?: string | null; dotColor: string; dueDate?: string | null; isOverdue?: boolean }> = []
            blTasks.slice(0, 2).forEach(t => allTasks.push({ title: t.title, assigneeName: t.assigneeName, dotColor: C.red }))
            ipTasks.slice(0, Math.max(0, 4 - allTasks.length)).forEach(t => allTasks.push({ title: t.title, assigneeName: t.assigneeName, dotColor: C.blue, dueDate: t.dueDate, isOverdue: t.isOverdue }))
            doneTasks.slice(0, Math.max(0, 5 - allTasks.length)).forEach(t => allTasks.push({ title: t.title, assigneeName: t.assigneeName, dotColor: C.green }))
            const extraCount = (blTasks.length + ipTasks.length + doneTasks.length) - allTasks.length

            return (
              <View key={p.projectId} style={{ marginBottom: 8 }} wrap={false}>
                {/* Project header bar */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: C.gray50,
                  borderLeftWidth: 3, borderLeftColor: statusColor(p.status),
                  borderRadius: 3,
                  paddingVertical: 5, paddingHorizontal: 7,
                  marginBottom: 2,
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: C.gray900 }}>{p.projectName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[s.statusPill, { backgroundColor: statusColor(p.status), marginBottom: 2 }]}>
                      <Text style={s.statusPillText}>{statusLabel(p.status)}</Text>
                    </View>
                    <Text style={{ fontSize: 7, color: C.gray400 }}>{fmtH(Math.round(p.actualHours * 60))}</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{ paddingHorizontal: 10, marginBottom: 4 }}>
                  <PDFProgressBar value={p.completionPercent} max={100} color={statusColor(p.status)} label={`${p.completionPercent}%`} />
                </View>

                {/* Milestone row */}
                {p.nearestMilestone && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    marginLeft: 10, marginRight: 0, marginBottom: 3,
                    backgroundColor: C.blueLt, borderRadius: 2,
                    paddingVertical: 3, paddingHorizontal: 6,
                  }}>
                    <Text style={{ flex: 1, fontSize: 7, color: C.blueDk }}>{'\u2691'} {p.nearestMilestone.title}</Text>
                    {p.nearestMilestone.daysLeft !== null && (
                      <Text style={{
                        fontSize: 7, fontWeight: 'bold',
                        color: p.nearestMilestone.daysLeft <= 0 ? C.red
                          : p.nearestMilestone.daysLeft <= 7 ? C.amber : C.gray600,
                      }}>
                        {p.nearestMilestone.daysLeft <= 0 ? 'SCADUTA' : `tra ${p.nearestMilestone.daysLeft}gg`}
                      </Text>
                    )}
                  </View>
                )}

                {/* Stats chips row */}
                <View style={{ flexDirection: 'row', marginLeft: 10, marginBottom: 3 }}>
                  {doneTasks.length > 0 && (
                    <Text style={{ fontSize: 7, color: C.green, marginRight: 8 }}>{'\u2713'} {doneTasks.length} completati</Text>
                  )}
                  {ipTasks.length > 0 && (
                    <Text style={{ fontSize: 7, color: C.blue, marginRight: 8 }}>{'\u25B7'} {ipTasks.length} in corso</Text>
                  )}
                  {blTasks.length > 0 && (
                    <Text style={{ fontSize: 7, color: C.red, fontWeight: 'bold' }}>{'!'} {blTasks.length} bloccati</Text>
                  )}
                  {doneTasks.length === 0 && ipTasks.length === 0 && blTasks.length === 0 && (
                    <Text style={{ fontSize: 7, color: C.gray400 }}>Nessuna attività questa settimana</Text>
                  )}
                </View>

                {/* Task tree */}
                {allTasks.length > 0 && (
                  <View style={{ marginLeft: 10, borderLeftWidth: 1, borderLeftColor: C.gray200, paddingLeft: 8 }}>
                    {allTasks.map((t, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 2.5, borderBottomWidth: i < allTasks.length - 1 ? 1 : 0, borderBottomColor: C.gray100 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.dotColor, marginTop: 2, marginRight: 6, flexShrink: 0 }} />
                        <Text style={{ flex: 1, fontSize: 7.5, color: C.gray700 }}>{t.title}</Text>
                        {t.assigneeName && <Text style={{ fontSize: 7, color: C.gray400, marginLeft: 4 }}>{t.assigneeName}</Text>}
                        {t.dueDate != null && (
                          <Text style={{ fontSize: 7, color: t.isOverdue ? C.red : C.gray400, marginLeft: 4 }}>
                            {t.isOverdue ? '[SCAD.]' : `scade ${fmtDate(t.dueDate)}`}
                          </Text>
                        )}
                      </View>
                    ))}
                    {extraCount > 0 && (
                      <Text style={{ fontSize: 6.5, color: C.gray400, paddingTop: 3, fontStyle: 'italic' }}>+{extraCount} altri</Text>
                    )}
                  </View>
                )}
              </View>
            )
          })}

          <Footer pn={nextPage()} total={totalPages} weekNum={data.weekNumber} year={data.year} />
        </Page>
      )}


      {/* ================================================================
          P5 — ATTIVITÀ & REGISTRAZIONI (FATTO + TASK CREATE + PIANIFICATO)
      ================================================================ */}
      <Page size="A4" style={s.page}>
        <Text style={s.pageH1}>{'Attivit\u00e0 & Registrazioni'}</Text>
        <Text style={s.pageH1Sub}>
          {isTeamMode && !selectedUserId
            ? 'Riepilogo attivit\u00e0 del team \u2014 completato e pianificato'
            : `Riepilogo attivit\u00e0 di ${userName} \u2014 completato e pianificato`}
        </Text>

        {/* ── Fatto questa settimana */}
        <Text style={s.secTitleFirst}>{'[OK] Fatto questa settimana'}</Text>
        {accomplishedByProject.length > 0 ? (
          accomplishedByProject.map(({ projectName, tasks }) => (
            <View key={projectName} style={{ marginBottom: 8 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: C.gray50,
                borderLeftWidth: 3, borderLeftColor: C.green,
                borderRadius: 3,
                paddingVertical: 4, paddingHorizontal: 7,
                marginBottom: 2,
              }}>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: 'bold', color: C.gray900 }}>{projectName}</Text>
                <Text style={{ fontSize: 7, color: C.gray400 }}>{tasks.length} task</Text>
              </View>
              <View style={{ marginLeft: 10, borderLeftWidth: 1, borderLeftColor: C.gray200, paddingLeft: 8 }}>
                {tasks.slice(0, 8).map(t => (
                  <View key={t.id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green, marginTop: 2, marginRight: 6, flexShrink: 0 }} />
                    <Text style={{ flex: 1, fontSize: 7.5, color: C.gray700 }}>{t.title}</Text>
                    {t.assigneeName && <Text style={{ fontSize: 7, color: C.gray400, marginLeft: 4 }}>{t.assigneeName}</Text>}
                  </View>
                ))}
                {tasks.length > 8 && (
                  <Text style={{ fontSize: 6.5, color: C.gray400, paddingTop: 3, fontStyle: 'italic' }}>+{tasks.length - 8} altri</Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={{ padding: 10, backgroundColor: C.gray50, borderRadius: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 8, color: C.gray400, textAlign: 'center' }}>Nessun task completato questa settimana</Text>
          </View>
        )}

        {/* ── Task create questa settimana */}
        {data.tasks.created.length > 0 && (() => {
          const createdByProject = new Map<string, typeof data.tasks.created>()
          data.tasks.created.forEach(t => {
            const key = t.projectName ?? 'Nessun progetto'
            createdByProject.set(key, [...(createdByProject.get(key) ?? []), t])
          })
          const taskStatusLabel = (st: string) => {
            if (st === 'done') return 'Completata'
            if (st === 'in_progress') return 'In corso'
            if (st === 'blocked') return 'Bloccata'
            if (st === 'todo') return 'Da fare'
            if (st === 'review') return 'In revisione'
            if (st === 'cancelled') return 'Annullata'
            return st
          }
          const taskDotColor = (st: string) =>
            st === 'done' ? C.green : st === 'blocked' ? C.red : st === 'in_progress' ? C.blue : C.purple

          return (
            <>
              <Text style={s.secTitle}>{'\u270F'} Task create questa settimana ({data.tasks.created.length})</Text>
              {Array.from(createdByProject.entries()).map(([projName, tasks]) => (
                <View key={projName} style={{ marginBottom: 8 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: C.purpleLt,
                    borderLeftWidth: 3, borderLeftColor: C.purple,
                    borderRadius: 3,
                    paddingVertical: 4, paddingHorizontal: 7,
                    marginBottom: 2,
                  }}>
                    <Text style={{ flex: 1, fontSize: 8.5, fontWeight: 'bold', color: C.gray900 }}>{projName}</Text>
                    <Text style={{ fontSize: 7, color: C.purple }}>{tasks.length} task</Text>
                  </View>
                  <View style={{ marginLeft: 10, borderLeftWidth: 1, borderLeftColor: C.purpleLt, paddingLeft: 8 }}>
                    {tasks.map(t => (
                      <View key={t.id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: taskDotColor(t.status), marginTop: 2, marginRight: 6, flexShrink: 0 }} />
                        <Text style={{ flex: 1, fontSize: 7.5, color: C.gray700 }}>{t.title}</Text>
                        <View style={{ backgroundColor: t.status === 'done' ? C.greenLt : t.status === 'blocked' ? C.redLt : t.status === 'in_progress' ? C.blueLt : C.gray100, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 4 }}>
                          <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: taskDotColor(t.status) }}>{taskStatusLabel(t.status)}</Text>
                        </View>
                        {t.assigneeName && <Text style={{ fontSize: 7, color: C.gray400, marginLeft: 4 }}>{'\u2192'} {t.assigneeName}</Text>}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )
        })()}

        {/* ── Da fare la prossima settimana */}
        <Text style={s.secTitle}>{'[>] Da fare la prossima settimana'}</Text>
        {plannedByProject.length > 0 ? (
          plannedByProject.map(({ projectName, tasks }) => (
            <View key={projectName} style={{ marginBottom: 8 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: C.blueLt,
                borderLeftWidth: 3, borderLeftColor: C.blue,
                borderRadius: 3,
                paddingVertical: 4, paddingHorizontal: 7,
                marginBottom: 2,
              }}>
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: 'bold', color: C.gray900 }}>{projectName}</Text>
                <Text style={{ fontSize: 7, color: C.blue }}>{tasks.length} task</Text>
              </View>
              <View style={{ marginLeft: 10, borderLeftWidth: 1, borderLeftColor: C.blueLt, paddingLeft: 8 }}>
                {tasks.slice(0, 7).map(t => (
                  <View key={t.id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.isOverdue ? C.red : C.blue, marginTop: 2, marginRight: 6, flexShrink: 0 }} />
                    <Text style={{ flex: 1, fontSize: 7.5, color: t.isOverdue ? C.red : C.gray700 }}>{t.title}</Text>
                    {t.assigneeName && <Text style={{ fontSize: 7, color: C.gray400, marginLeft: 4 }}>{t.assigneeName}</Text>}
                    {t.dueDate && (
                      <Text style={{ fontSize: 7, color: t.isOverdue ? C.red : C.gray400, marginLeft: 4 }}>
                        {t.isOverdue ? '[SCAD.]' : `scade ${fmtDate(t.dueDate)}`}
                      </Text>
                    )}
                  </View>
                ))}
                {tasks.length > 7 && (
                  <Text style={{ fontSize: 6.5, color: C.gray400, paddingTop: 3, fontStyle: 'italic' }}>+{tasks.length - 7} altri</Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={{ padding: 10, backgroundColor: C.gray50, borderRadius: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 8, color: C.gray400, textAlign: 'center' }}>Nessun task pianificato per la prossima settimana</Text>
          </View>
        )}

        <Footer pn={nextPage()} total={totalPages} weekNum={data.weekNumber} year={data.year} />
      </Page>


      {/* ================================================================
          P6 — ORE REGISTRATE (timesheet, own page to keep title+data together)
      ================================================================ */}
      {hasTimesheetPage && (
        <Page size="A4" style={s.page}>
          <Text style={s.pageH1}>Ore Registrate</Text>
          <Text style={s.pageH1Sub}>
            {isTeamMode && !selectedUserId
              ? `Dettaglio ore per dipendente \u2014 settimana ${data.weekNumber}/${data.year}`
              : `Dettaglio ore di ${userName} \u2014 settimana ${data.weekNumber}/${data.year}`}
          </Text>

          {timesheetData.map(tsUser => (
            <View key={tsUser.userId}>
              {/* User header — team mode only */}
              {isTeamMode && !selectedUserId && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: C.blue,
                  borderRadius: 3,
                  paddingVertical: 5, paddingHorizontal: 8,
                  marginBottom: 4, marginTop: 6,
                }}>
                  <Text style={{ flex: 1, fontSize: 9, fontWeight: 'bold', color: C.white }}>{tsUser.userName}</Text>
                  <Text style={{ fontSize: 8, color: C.blueLt }}>{fmtH(tsUser.totalMinutes)} questa settimana</Text>
                </View>
              )}

              {/* Day groups */}
              {tsUser.days.map(day => (
                <View key={day.isoDate} style={{ marginBottom: 5 }} wrap={false}>
                  {/* Day header band */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: C.gray100,
                    borderLeftWidth: 3, borderLeftColor: C.blue,
                    borderRadius: 3,
                    paddingVertical: 4, paddingHorizontal: 8,
                    marginBottom: 1,
                  }}>
                    <Text style={{ flex: 1, fontSize: 8, fontWeight: 'bold', color: C.gray700 }}>
                      {shortDayLabel(day.isoDate)}
                    </Text>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: C.blue }}>{fmtH(day.totalMinutes)}</Text>
                  </View>

                  {/* Entry rows */}
                  {day.entries.map((entry, eIdx) => (
                    <View key={eIdx} style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 3, paddingHorizontal: 10,
                      borderBottomWidth: eIdx < day.entries.length - 1 ? 1 : 0,
                      borderBottomColor: C.gray100,
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 6.5, color: C.gray400 }}>{entry.projectName}</Text>
                        <Text style={{ fontSize: 7.5, color: C.gray700 }}>{entry.taskTitle}</Text>
                      </View>
                      <View style={{
                        backgroundColor: C.blueLt, borderRadius: 4,
                        paddingHorizontal: 5, paddingVertical: 2,
                      }}>
                        <Text style={{ fontSize: 7.5, color: C.blue, fontWeight: 'bold' }}>
                          {fmtH(entry.durationMinutes)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}

              {/* Total row */}
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between',
                borderTopWidth: 1.5, borderTopColor: C.gray400,
                paddingTop: 4, marginTop: 2, marginBottom: 8,
                paddingHorizontal: 4,
              }}>
                <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: C.gray700 }}>Totale settimana</Text>
                <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: C.blue }}>{fmtH(tsUser.totalMinutes)}</Text>
              </View>
            </View>
          ))}

          <Footer pn={nextPage()} total={totalPages} weekNum={data.weekNumber} year={data.year} />
        </Page>
      )}


      {/* ================================================================
          P7 — RISCHI E BLOCCHI
      ================================================================ */}

      {hasRisksBlockPage && (
        <Page size="A4" style={s.page}>
          <Text style={s.pageH1}>Rischi e Blocchi</Text>
          <Text style={s.pageH1Sub}>Impedimenti attivi e rischi aperti che richiedono azione</Text>

          {/* ── BLOCCHI */}
          {filteredBlockers.length > 0 && (
            <>
              <Text style={s.secTitleFirst}>
                {'[!] Situazioni Bloccanti ('}{filteredBlockers.length}{')'}{data.blockerAnalysis ? ` \u2014 rischio ${data.blockerAnalysis.riskScore.toUpperCase()}` : ''}
              </Text>

              {data.blockerAnalysis && (
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  {[
                    { label: 'Attivi',        val: filteredBlockers.length,              bg: C.redLt,   color: C.red   },
                    { label: 'Risolti sett.', val: data.blockerAnalysis.resolvedThisWeek, bg: C.greenLt, color: C.green },
                    { label: 'Scaduti >5gg',  val: data.blockerAnalysis.overdueCount,    bg: C.amberLt, color: C.amber },
                  ].map((st, i) => (
                    <View key={i} style={[{ flex: 1, backgroundColor: st.bg, borderRadius: 4, padding: 7, alignItems: 'center', marginRight: i < 2 ? 8 : 0 }]}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: st.color, marginBottom: 1 }}>{st.val}</Text>
                      <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: st.color, textAlign: 'center' }}>{st.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              {filteredBlockers.map(task => {
                const daysBlocked = 'daysBlocked' in task ? (task as EnrichedBlockedTask).daysBlocked : null
                const reason      = 'blockedReason' in task
                  ? (task as EnrichedBlockedTask).blockedReason
                  : (task as BlockedTask).lastComment
                const category    = 'category' in task ? (task as EnrichedBlockedTask).category : null
                return (
                  <View key={task.id} style={s.blockerCard} wrap={false}>
                    <View style={s.blockerHeader}>
                      <Text style={s.blockerTitle}>{task.code} \u2013 {task.title}</Text>
                      {daysBlocked !== null && (
                        <Text style={s.blockerDays}>{daysBlocked === 0 ? 'oggi' : `da ${daysBlocked}gg`}</Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {task.projectName  && <Text style={s.blockerMeta}>Progetto: {task.projectName}</Text>}
                      {task.assigneeName && <Text style={[s.blockerMeta, { marginLeft: 10 }]}>Assegnato: {task.assigneeName}</Text>}
                      {category          && <Text style={[s.blockerMeta, { marginLeft: 10 }]}>Categoria: {categoryLabel(category)}</Text>}
                    </View>
                    {reason && (
                      <Text style={s.blockerReason}>
                        {'\u201C'}{reason.substring(0, 200)}{reason.length > 200 ? '\u2026' : ''}{'\u201D'}
                      </Text>
                    )}
                  </View>
                )
              })}

              <View style={[s.insightBox, { marginTop: 4 }]}>
                <Text style={s.insightTitle}>Azioni Richieste</Text>
                <Text style={s.insightText}>
                  {'\u2022'} Verifica e risolvi le dipendenze esterne prima della prossima riunione{'\n'}
                  {'\u2022'} Valuta se i blocchi richiedono escalation al project manager{'\n'}
                  {'\u2022'} I task bloccati da {'>'}5 giorni richiedono {'priorit\u00e0'} immediata
                </Text>
              </View>
            </>
          )}

          {/* ── RISCHI */}
          {risks.length > 0 && (
            <>
              <Text style={[s.secTitle, { marginTop: filteredBlockers.length > 0 ? 16 : 0 }]}>
                Rischi Aperti ({risks.length})
              </Text>

              {/* Severity summary */}
              <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                {[
                  { label: 'Alto',   val: risks.filter(r => r.riskLevel >= 7).length,                   bg: C.redLt,   color: C.red   },
                  { label: 'Medio',  val: risks.filter(r => r.riskLevel >= 4 && r.riskLevel < 7).length, bg: C.amberLt, color: C.amber },
                  { label: 'Basso',  val: risks.filter(r => r.riskLevel < 4).length,                    bg: C.greenLt, color: C.green },
                  { label: 'Totale', val: risks.length,                                                  bg: C.gray100, color: C.gray600 },
                ].filter(st => st.val > 0).map((st, i, arr) => (
                  <View key={i} style={[{ flex: 1, backgroundColor: st.bg, borderRadius: 4, padding: 7, alignItems: 'center', marginRight: i < arr.length - 1 ? 8 : 0 }]}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: st.color, marginBottom: 1 }}>{st.val}</Text>
                    <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: st.color }}>{st.label}</Text>
                  </View>
                ))}
              </View>

              {/* Risk table header */}
              <View style={s.tblHeader}>
                <Text style={[s.tblHeaderCell, { flex: 3 }]}>Rischio</Text>
                <Text style={[s.tblHeaderCell, { flex: 2 }]}>Progetto</Text>
                <Text style={[s.tblHeaderCell, { width: 45, textAlign: 'center' }]}>Prob.</Text>
                <Text style={[s.tblHeaderCell, { width: 45, textAlign: 'center' }]}>Impatto</Text>
                <Text style={[s.tblHeaderCell, { flex: 3 }]}>Mitigazione</Text>
              </View>

              {[...risks].sort((a, b) => b.riskLevel - a.riskLevel).map(r => {
                const lvlColor = r.riskLevel >= 7 ? C.red : r.riskLevel >= 4 ? C.amber : C.green
                const lvlBg    = r.riskLevel >= 7 ? C.redLt : r.riskLevel >= 4 ? C.amberLt : C.greenLt
                const lvlLabel = r.riskLevel >= 7 ? 'ALTO' : r.riskLevel >= 4 ? 'MEDIO' : 'BASSO'
                const probColor = r.probability === 'high' ? C.red : r.probability === 'medium' ? C.amber : C.green
                const probBg    = r.probability === 'high' ? C.redLt : r.probability === 'medium' ? C.amberLt : C.greenLt
                const impColor  = r.impact === 'high' ? C.red : r.impact === 'medium' ? C.amber : C.green
                const impBg     = r.impact === 'high' ? C.redLt : r.impact === 'medium' ? C.amberLt : C.greenLt
                return (
                  <View key={r.id} style={s.tblRow}>
                    <View style={{ flex: 3, paddingRight: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <View style={[s.pill, { backgroundColor: lvlBg, marginRight: 5 }]}>
                          <Text style={[s.pillText, { color: lvlColor }]}>{lvlLabel}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 8, fontWeight: 'bold', color: C.gray900 }}>{r.title}</Text>
                      </View>
                      <Text style={{ fontSize: 6.5, color: C.gray400 }}>{r.code}</Text>
                    </View>
                    <View style={{ flex: 2, paddingRight: 6 }}>
                      <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: C.gray600 }}>{r.projectName}</Text>
                      {r.ownerName && <Text style={{ fontSize: 7, color: C.gray400 }}>{r.ownerName}</Text>}
                    </View>
                    <View style={{ width: 45, alignItems: 'center' }}>
                      <View style={[s.pill, { backgroundColor: probBg }]}>
                        <Text style={[s.pillText, { color: probColor }]}>{r.probability}</Text>
                      </View>
                    </View>
                    <View style={{ width: 45, alignItems: 'center' }}>
                      <View style={[s.pill, { backgroundColor: impBg }]}>
                        <Text style={[s.pillText, { color: impColor }]}>{r.impact}</Text>
                      </View>
                    </View>
                    <Text style={{ flex: 3, fontSize: 7.5, color: C.gray500, fontStyle: 'italic' }}>
                      {r.mitigationPlan
                        ? r.mitigationPlan.substring(0, 120) + (r.mitigationPlan.length > 120 ? '\u2026' : '')
                        : '\u2014'}
                    </Text>
                  </View>
                )
              })}
            </>
          )}

          <Footer pn={nextPage()} total={totalPages} weekNum={data.weekNumber} year={data.year} />
        </Page>
      )}


    </Document>
  )
}
