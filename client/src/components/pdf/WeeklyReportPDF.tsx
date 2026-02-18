/**
 * Weekly Report PDF Document Component - PROFESSIONAL REDESIGN
 * @module components/pdf/WeeklyReportPDF
 * 
 * Enterprise-grade PDF report with @react-pdf/renderer
 * Features: Executive summary, visual KPIs, data-driven insights, responsive layout
 * Performance: Memoized calculations, optimized rendering
 */

import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer'
import type { WeeklyReportData } from '@/types'
import { PDFCircularProgress } from './PDFCircularProgress'
import { PDFPieChart } from './PDFPieChart'

// Professional Color System - Extended Palette
const colors = {
  // Primary Brand
  primary50: '#eff6ff',
  primary100: '#dbeafe',
  primary500: '#2563eb',
  primary700: '#1d4ed8',
  primary900: '#1e3a8a',
  
  // Success States
  success50: '#f0fdf4',
  success500: '#10b981',
  success700: '#15803d',
  
  // Warning States
  warning50: '#fffbeb',
  warning500: '#f59e0b',
  warning700: '#b45309',
  
  // Danger States
  danger50: '#fef2f2',
  danger500: '#ef4444',
  danger700: '#b91c1c',
  
  // Info States
  info50: '#f0f9ff',
  info500: '#06b6d4',
  info700: '#0e7490',
  
  // Neutrals
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray900: '#111827',
  
  // Base
  white: '#ffffff',
  black: '#1f2937',
}

// Professional Typography & Layout System
const styles = StyleSheet.create({
  // Base Page
  page: {
    padding: 30,
    backgroundColor: colors.white,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.black,
  },

  // === COVER PAGE ===
  coverContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  coverHeader: {
    backgroundColor: colors.primary500,
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  coverTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  coverSubtitle: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.95,
    marginBottom: 4,
  },
  coverMeta: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.85,
  },
  
  // Performance Hero Section
  performanceHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  performanceLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray700,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  performanceBadge: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 0.5,
  },
  
  // Table of Contents
  tocContainer: {
    padding: 14,
    backgroundColor: colors.gray50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  tocTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 8,
  },
  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tocItemLast: {
    borderBottomWidth: 0,
  },
  tocLabel: {
    fontSize: 10,
    color: colors.gray700,
  },
  tocPage: {
    fontSize: 10,
    color: colors.primary500,
    fontWeight: 'bold',
  },

  // === EXECUTIVE SUMMARY ===
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 10,
    color: colors.gray500,
    marginBottom: 15,
  },
  
  // KPI Grid - 2x2 Layout
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  kpiCard: {
    width: '48%',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  kpiTrend: {
    fontSize: 9,
    color: colors.success500,
    fontWeight: 'bold',
  },
  kpiLabel: {
    fontSize: 9,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 3,
  },
  kpiSubtext: {
    fontSize: 9,
    color: colors.gray400,
  },

  // Insights Section
  insightsContainer: {
    marginBottom: 18,
  },
  
  // === UNIFIED SECTION STYLES ===
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary500,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.gray900,
  },
  insightBox: {
    backgroundColor: colors.primary50,
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary500,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary700,
    marginBottom: 3,
  },
  insightText: {
    fontSize: 9,
    color: colors.gray700,
    lineHeight: 1.4,
  },

  // Highlights Grid
  highlightsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  highlightCard: {
    flex: 1,
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  highlightLabel: {
    fontSize: 8,
    color: colors.gray500,
    textTransform: 'uppercase',
  },

  // === TIME ANALYSIS PAGE ===
  chartContainer: {
    padding: 14,
    backgroundColor: colors.gray50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: 12,
  },
  chartInnerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 10,
  },
  
  // Daily Breakdown
  dailyBarsContainer: {
    marginTop: 8,
  },
  dailyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayLabel: {
    width: 60,
    fontSize: 9,
    color: colors.gray600,
    fontWeight: 'bold',
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.gray100,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  hoursText: {
    fontSize: 9,
    color: colors.gray900,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },

  // Project Ranking
  projectRanking: {
    marginTop: 8,
  },
  projectRankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 10,
    backgroundColor: colors.white,
    borderRadius: 5,
    borderLeftWidth: 3,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary500,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
  },
  projectNameRank: {
    flex: 1,
    fontSize: 10,
    color: colors.gray900,
    fontWeight: 'bold',
  },
  projectHoursRank: {
    fontSize: 11,
    color: colors.primary500,
    fontWeight: 'bold',
    marginRight: 8,
  },
  projectPercentage: {
    fontSize: 8,
    color: colors.gray500,
  },

  // === TASK DETAILS PAGE ===
  taskCount: {
    fontSize: 10,
    color: colors.gray500,
    marginLeft: 'auto',
  },
  
  taskCard: {
    padding: 10,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  taskCode: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.gray500,
    backgroundColor: colors.gray100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  taskTitle: {
    fontSize: 10,
    color: colors.gray900,
    flex: 1,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  taskMeta: {
    fontSize: 8,
    color: colors.gray500,
    marginTop: 4,
  },
  taskNote: {
    fontSize: 8,
    color: colors.gray400,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Blockers
  blockerCard: {
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.danger50,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger500,
  },
  blockerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.danger700,
    marginBottom: 4,
  },
  blockerReason: {
    fontSize: 9,
    color: colors.gray700,
    lineHeight: 1.3,
    marginTop: 3,
  },

  // === REUSABLE COMPONENTS ===
  // Section Divider
  sectionDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 12,
  },
  
  // Stat Card (inline mini stats)
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  miniStatCard: {
    flex: 1,
    padding: 8,
    backgroundColor: colors.gray50,
    borderRadius: 5,
    borderLeftWidth: 2,
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.gray900,
    marginBottom: 1,
  },
  miniStatLabel: {
    fontSize: 7,
    color: colors.gray500,
    textTransform: 'uppercase',
  },

  // Footer Component (reusable)
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBrand: {
    fontSize: 8,
    color: colors.gray400,
    fontWeight: 'bold',
  },
  footerPage: {
    fontSize: 8,
    color: colors.gray500,
  },
  footerDate: {
    fontSize: 7,
    color: colors.gray400,
  },

  // Disclaimer
  disclaimer: {
    fontSize: 7,
    color: colors.gray400,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 12,
  },

  // === PROJECT HEALTH PAGE ===
  projectHealthCard: {
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  projectHealthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectHealthName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.gray900,
    flex: 1,
  },
  projectHealthCode: {
    fontSize: 8,
    color: colors.gray500,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.white,
  },
  projectHealthStats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  healthStatChip: {
    fontSize: 8,
    color: colors.gray600,
  },
  milestoneRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneLabel: {
    fontSize: 8,
    color: colors.gray500,
    fontStyle: 'italic',
    flex: 1,
  },
  milestoneDaysLeft: {
    fontSize: 8,
    fontWeight: 'bold',
  },

  // === BLOCKER SUMMARY ROW ===
  blockerSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    padding: 10,
    backgroundColor: colors.danger50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.danger500,
  },
  blockerSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  blockerSummaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.danger700,
    marginBottom: 2,
  },
  blockerSummaryLabel: {
    fontSize: 7,
    color: colors.gray600,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: colors.gray200,
    marginLeft: 6,
  },
  categoryBadgeText: {
    fontSize: 7,
    color: colors.gray700,
  },
  daysBlockedText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.danger700,
    marginTop: 3,
  },
  riskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  riskBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.white,
  },

  // === PRODUCTIVITY BOX ===
  productivityBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.info50,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.info500,
  },
  productivityTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.info700,
    marginBottom: 8,
  },
  productivityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  productivityStat: {
    flex: 1,
    alignItems: 'center',
    padding: 6,
    backgroundColor: colors.white,
    borderRadius: 4,
  },
  productivityStatValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.info700,
    marginBottom: 2,
  },
  productivityStatLabel: {
    fontSize: 7,
    color: colors.gray500,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // KPI trend line
  kpiTrendLine: {
    fontSize: 7,
    marginTop: 2,
  },
})


interface WeeklyReportPDFProps {
  data: WeeklyReportData
  selectedUserId?: string | null
}

// Reusable Footer Component
const PageFooter: React.FC<{ pageNumber: number; totalPages: number; weekNumber: number; year: number }> = ({
  pageNumber,
  totalPages,
  weekNumber,
  year,
}) => (
  <View style={styles.footer}>
    <Text style={styles.footerBrand}>ProjectPulse • Weekly Report</Text>
    <Text style={styles.footerPage}>
      Pagina {pageNumber} di {totalPages}
    </Text>
    <Text style={styles.footerDate}>
      Settimana {weekNumber}/{year}
    </Text>
  </View>
)

export function WeeklyReportPDF({ data, selectedUserId }: WeeklyReportPDFProps) {
  // ==================== CALCULATIONS (PERFORMANCE OPTIMIZED) ====================
  
  const totalHours = data.timeTracking.totalMinutes / 60
  const completedTasks = data.tasks.completed.length
  const inProgressTasks = data.tasks.inProgress.length
  const createdTasks = data.tasks.created.length
  const totalTasks = completedTasks + inProgressTasks + createdTasks
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const efficiency = totalHours > 0 ? Math.min(100, (completedTasks / totalHours) * 10) : 0
  
  const expectedWeeklyHours = 40
  const timeUtilization = Math.min(100, (totalHours / expectedWeeklyHours) * 100)
  const productivity = completionRate * 0.6 + timeUtilization * 0.4
  
  // MEMOIZED: Consistency calculation (avoid recalculation)
  const consistency = React.useMemo(() => {
    const dailyHours = data.timeTracking.byDay.map(d => d.totalMinutes / 60)
    const avgDailyHours = dailyHours.reduce((sum, h) => sum + h, 0) / Math.max(dailyHours.length, 1)
    const calculatedVariance = dailyHours.reduce((sum, h) => sum + Math.pow(h - avgDailyHours, 2), 0) / Math.max(dailyHours.length, 1)
    return Math.max(0, 100 - calculatedVariance * 10)
  }, [data.timeTracking.byDay])
  
  const overallScore = efficiency * 0.25 + completionRate * 0.30 + productivity * 0.25 + consistency * 0.20
  
  // Badge determination
  let badgeColor: string
  let badgeText: string
  
  if (overallScore >= 85) {
    badgeColor = colors.success500
    badgeText = 'ECCELLENTE'
  } else if (overallScore >= 70) {
    badgeColor = colors.info500
    badgeText = 'OTTIMO'
  } else if (overallScore >= 55) {
    badgeColor = colors.warning500
    badgeText = 'BUONO'
  } else {
    badgeColor = colors.danger500
    badgeText = 'DA MIGLIORARE'
  }
  
  // Formatting
  const startDate = new Date(data.weekStartDate).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
  })
  const endDate = new Date(data.weekEndDate).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  
  const userName = selectedUserId 
    ? data.timeTracking.byUser?.find(u => u.userId === selectedUserId)?.userName || data.userName
    : data.userName
  
  // Chart data
  const taskDistributionData = [
    { label: 'Completati', value: completedTasks, color: colors.success500 },
    { label: 'In Corso', value: inProgressTasks, color: colors.info500 },
    { label: 'Creati', value: createdTasks, color: colors.warning500 },
  ].filter(item => item.value > 0)
  
  // Top 5 projects
  const topProjects = [...data.timeTracking.byProject]
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 5)
  
  // Task selection (most recent first, top N only)
  const topCompletedTasks = data.tasks.completed.slice(0, 5)
  const topInProgressTasks = data.tasks.inProgress.slice(0, 3)
  const topCreatedTasks = data.tasks.created.slice(0, 3)
  
  // Daily breakdown for bar chart
  const dailyData = data.timeTracking.byDay.map(day => ({
    day: new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' }),
    hours: day.totalMinutes / 60,
    percentage: (day.totalMinutes / Math.max(data.timeTracking.totalMinutes, 1)) * 100,
  }))
  
  // Key insights generation
  const generateInsights = () => {
    const insights: Array<{ title: string; text: string }> = []
    
    if (completionRate >= 80) {
      insights.push({
        title: 'Eccellente Tasso di Completamento',
        text: `Hai completato ${completionRate.toFixed(0)}% dei task, superando le aspettative. Mantieni questo ritmo!`,
      })
    } else if (completionRate < 50) {
      insights.push({
        title: 'Attenzione al Completamento',
        text: `Il tasso di completamento è al ${completionRate.toFixed(0)}%. Considera di rivedere le priorità.`,
      })
    }
    
    if (totalHours > expectedWeeklyHours * 1.2) {
      insights.push({
        title: 'Carico di Lavoro Elevato',
        text: `Hai lavorato ${totalHours.toFixed(1)}h questa settimana, sopra la media. Attenzione al work-life balance.`,
      })
    }
    
    if (topProjects.length > 0) {
      const topProject = topProjects[0]
      const projectPercentage = (topProject.totalMinutes / data.timeTracking.totalMinutes) * 100
      insights.push({
        title: 'Focus Principale',
        text: `${topProject.projectName} ha richiesto ${projectPercentage.toFixed(0)}% del tuo tempo (${(topProject.totalMinutes / 60).toFixed(1)}h).`,
      })
    }
    
    if (data.blockedTasks.length > 0) {
      insights.push({
        title: 'Task Bloccati',
        text: `Ci sono ${data.blockedTasks.length} task bloccati che richiedono attenzione immediata per sbloccare il flusso.`,
      })
    }
    
    return insights
  }
  
  const insights = generateInsights()
  
  // Determine total pages dynamically
  const hasBlockers = (data.blockerAnalysis?.items.length ?? data.blockedTasks.length) > 0
  const hasProjectHealth = (data.projectHealth?.length ?? 0) > 0
  const totalPages = 4 + (hasProjectHealth ? 1 : 0) + (hasBlockers ? 1 : 0)

  return (
    <Document>
      {/* ==================== PAGE 1: COVER + TOC ==================== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverContainer}>
          {/* Header */}
          <View>
            <View style={styles.coverHeader}>
              <Text style={styles.coverTitle}>Report Settimanale</Text>
              <Text style={styles.coverSubtitle}>
                Settimana {data.weekNumber} del {data.year}
              </Text>
              <Text style={styles.coverMeta}>{startDate} - {endDate}</Text>
              {userName && <Text style={styles.coverMeta}>Utente: {userName}</Text>}
            </View>

            {/* Performance Hero */}
            <View style={styles.performanceHero}>
              <Text style={styles.performanceLabel}>Performance Score</Text>
              <PDFCircularProgress
                percentage={overallScore}
                size={120}
                strokeWidth={12}
                color={badgeColor}
              />
              <View style={[styles.performanceBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.badgeText}>{badgeText}</Text>
              </View>
            </View>

            {/* Table of Contents */}
            {(() => {
              // Dynamic TOC page numbers
              let nextPage = 3
              const projectStatusPage = hasProjectHealth ? nextPage++ : null
              const timeAnalysisPage = nextPage++
              const taskDetailsPage = nextPage++
              const blockersPage = hasBlockers ? nextPage : null

              return (
                <View style={styles.tocContainer}>
                  <Text style={styles.tocTitle}>Indice</Text>
                  <View style={styles.tocItem}>
                    <Text style={styles.tocLabel}>Executive Summary</Text>
                    <Text style={styles.tocPage}>Pag. 2</Text>
                  </View>
                  {hasProjectHealth && projectStatusPage !== null && (
                    <View style={styles.tocItem}>
                      <Text style={styles.tocLabel}>Status Progetti</Text>
                      <Text style={styles.tocPage}>Pag. {projectStatusPage}</Text>
                    </View>
                  )}
                  <View style={styles.tocItem}>
                    <Text style={styles.tocLabel}>Analisi Temporale</Text>
                    <Text style={styles.tocPage}>Pag. {timeAnalysisPage}</Text>
                  </View>
                  <View style={[styles.tocItem, !hasBlockers ? styles.tocItemLast : {}]}>
                    <Text style={styles.tocLabel}>Dettaglio Task</Text>
                    <Text style={styles.tocPage}>Pag. {taskDetailsPage}</Text>
                  </View>
                  {hasBlockers && blockersPage !== null && (
                    <View style={[styles.tocItem, styles.tocItemLast]}>
                      <Text style={styles.tocLabel}>Task Bloccati</Text>
                      <Text style={styles.tocPage}>Pag. {blockersPage}</Text>
                    </View>
                  )}
                </View>
              )
            })()}
          </View>

          {/* Footer */}
          <PageFooter pageNumber={1} totalPages={totalPages} weekNumber={data.weekNumber} year={data.year} />
        </View>
      </Page>

      {/* ==================== PAGE 2: EXECUTIVE SUMMARY ==================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Executive Summary</Text>
        <Text style={styles.pageSubtitle}>
          Panoramica settimanale delle performance e KPI principali
        </Text>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {/* KPI: Ore Totali */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ORE TOTALI</Text>
            <Text style={styles.kpiValue}>{totalHours.toFixed(1)}h</Text>
            <Text style={styles.kpiSubtext}>
              {(totalHours / 5).toFixed(1)}h al giorno (media)
            </Text>
            {data.previousWeek && (() => {
              const delta = ((totalHours - data.previousWeek.totalHours) / Math.max(data.previousWeek.totalHours, 1)) * 100
              return (
                <Text style={[styles.kpiTrendLine, { color: delta >= 0 ? colors.success500 : colors.danger500 }]}>
                  {delta >= 0 ? '\u2191' : '\u2193'} {Math.abs(delta).toFixed(1)}% vs sett. prec.
                </Text>
              )
            })()}
          </View>

          {/* KPI: Tasso Completamento */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TASSO COMPLETAMENTO</Text>
            <Text style={styles.kpiValue}>{completionRate.toFixed(0)}%</Text>
            <Text style={styles.kpiSubtext}>
              {completedTasks} di {totalTasks} task
            </Text>
            {data.previousWeek && (() => {
              const prevRate = data.previousWeek.completedTasksCount > 0
                ? (data.previousWeek.completedTasksCount / Math.max(data.previousWeek.completedTasksCount + inProgressTasks + createdTasks, 1)) * 100
                : 0
              const delta = completionRate - prevRate
              return (
                <Text style={[styles.kpiTrendLine, { color: delta >= 0 ? colors.success500 : colors.danger500 }]}>
                  {delta >= 0 ? '\u2191' : '\u2193'} {Math.abs(delta).toFixed(1)}% vs sett. prec.
                </Text>
              )
            })()}
          </View>

          {/* KPI: Efficienza */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>EFFICIENZA</Text>
            <Text style={styles.kpiValue}>{efficiency.toFixed(0)}%</Text>
            <Text style={styles.kpiSubtext}>
              {totalHours > 0 ? (completedTasks / totalHours).toFixed(1) : '0'} task/ora
            </Text>
          </View>

          {/* KPI: Produttivita */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>PRODUTTIVITA</Text>
            <Text style={styles.kpiValue}>{productivity.toFixed(0)}%</Text>
            <Text style={styles.kpiSubtext}>
              Utilizzo: {timeUtilization.toFixed(0)}%
            </Text>
            {data.previousWeek && (() => {
              const prevBlocked = data.previousWeek.blockedTasksCount
              const currBlocked = data.blockedTasks.length
              const improved = currBlocked <= prevBlocked
              return (
                <Text style={[styles.kpiTrendLine, { color: improved ? colors.success500 : colors.danger500 }]}>
                  {improved ? '\u2191' : '\u2193'} Bloccati: {currBlocked} (prec. {prevBlocked})
                </Text>
              )
            })()}
          </View>
        </View>

        {/* Task Distribution Chart */}
        {taskDistributionData.length > 0 && (
          <View style={styles.chartContainer}>
            <PDFPieChart
              title="Distribuzione Task per Stato"
              data={taskDistributionData}
              size={150}
              innerRadius={55}
              showLegend={true}
            />
          </View>
        )}

        {/* Key Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>Insights Chiave</Text>
            {insights.map((insight, idx) => (
              <View key={idx} style={styles.insightBox}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightText}>{insight.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Productivity Box */}
        {data.productivity && (
          <View style={styles.productivityBox}>
            <Text style={styles.productivityTitle}>Produttivita</Text>
            <View style={styles.productivityRow}>
              <View style={styles.productivityStat}>
                <Text style={styles.productivityStatValue}>{data.productivity.tasksPerDay.toFixed(1)}</Text>
                <Text style={styles.productivityStatLabel}>Task/giorno</Text>
              </View>
              <View style={styles.productivityStat}>
                <Text style={styles.productivityStatValue}>{data.productivity.daysWorked}</Text>
                <Text style={styles.productivityStatLabel}>Giorni lavorati</Text>
              </View>
              <View style={styles.productivityStat}>
                <Text style={styles.productivityStatValue}>{data.productivity.avgHoursPerDay.toFixed(1)}h</Text>
                <Text style={styles.productivityStatLabel}>Media ore/giorno</Text>
              </View>
              <View style={styles.productivityStat}>
                <Text style={styles.productivityStatValue}>{data.productivity.onTimeDeliveryRate.toFixed(0)}%</Text>
                <Text style={styles.productivityStatLabel}>Consegne puntuali</Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <PageFooter pageNumber={2} totalPages={totalPages} weekNumber={data.weekNumber} year={data.year} />
      </Page>

      {/* ==================== PAGE 3 (OPTIONAL): PROJECT STATUS DASHBOARD ==================== */}
      {hasProjectHealth && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.pageTitle}>Status Progetti</Text>
          <Text style={styles.pageSubtitle}>
            Salute dei progetti per la settimana corrente
          </Text>

          {data.projectHealth!.map((project) => {
            const statusColor =
              project.status === 'on-track'
                ? colors.success500
                : project.status === 'at-risk'
                ? colors.warning500
                : colors.danger500
            const statusLabel =
              project.status === 'on-track'
                ? 'IN LINEA'
                : project.status === 'at-risk'
                ? 'A RISCHIO'
                : 'IN RITARDO'
            const hoursBarWidth = project.derivedWeeklyTargetHours > 0
              ? Math.min(100, (project.actualHours / project.derivedWeeklyTargetHours) * 100)
              : 0

            return (
              <View key={project.projectId} style={styles.projectHealthCard}>
                {/* Header row */}
                <View style={styles.projectHealthHeader}>
                  <Text style={styles.projectHealthCode}>{project.projectCode}</Text>
                  <Text style={styles.projectHealthName}>{project.projectName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusBadgeText}>{statusLabel}</Text>
                  </View>
                </View>

                {/* Hours progress bar */}
                <View style={styles.dailyBar}>
                  <Text style={[styles.dayLabel, { width: 70, fontSize: 8 }]}>Ore settim.</Text>
                  <View style={styles.barContainer}>
                    <View style={[styles.barFill, { width: `${hoursBarWidth}%`, backgroundColor: statusColor }]} />
                  </View>
                  <Text style={styles.hoursText}>{project.actualHours.toFixed(1)}h</Text>
                </View>

                {/* Task counts */}
                <View style={styles.projectHealthStats}>
                  <Text style={[styles.healthStatChip, { color: colors.success500 }]}>
                    Completati: {project.tasksCompleted}
                  </Text>
                  <Text style={[styles.healthStatChip, { color: colors.info500 }]}>
                    In corso: {project.tasksInProgress}
                  </Text>
                  <Text style={[styles.healthStatChip, { color: colors.danger500 }]}>
                    Bloccati: {project.tasksBlocked}
                  </Text>
                  <Text style={[styles.healthStatChip, { color: colors.gray500 }]}>
                    Totale: {project.tasksTotal}
                  </Text>
                  <Text style={[styles.healthStatChip, { color: colors.primary500, fontWeight: 'bold' }]}>
                    {project.completionPercent.toFixed(0)}% completato
                  </Text>
                </View>

                {/* Nearest milestone */}
                {project.nearestMilestone && (
                  <View style={styles.milestoneRow}>
                    <Text style={styles.milestoneLabel}>
                      Prossimo milestone: {project.nearestMilestone.title}
                    </Text>
                    {project.nearestMilestone.daysLeft !== null && (
                      <Text style={[
                        styles.milestoneDaysLeft,
                        { color: project.nearestMilestone.daysLeft <= 7 ? colors.danger500 : colors.warning500 }
                      ]}>
                        {project.nearestMilestone.daysLeft > 0
                          ? `${project.nearestMilestone.daysLeft}gg`
                          : 'Scaduto'}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )
          })}

          <PageFooter
            pageNumber={3}
            totalPages={totalPages}
            weekNumber={data.weekNumber}
            year={data.year}
          />
        </Page>
      )}


      {/* ==================== TIME ANALYSIS PAGE ==================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Analisi Temporale</Text>
        <Text style={styles.pageSubtitle}>
          Distribuzione ore lavorate per giorno e progetto
        </Text>

        {/* Daily Breakdown Bar Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Ore per Giorno</Text>
          <View style={styles.chartContainer}>
            <View style={styles.dailyBarsContainer}>
              {dailyData.map((day, idx) => {
                // Color by workload
                let barColor = colors.success500
                if (day.hours > 10) barColor = colors.danger500
                else if (day.hours > 8) barColor = colors.warning500
                else if (day.hours > 6) barColor = colors.info500

                return (
                  <View key={idx} style={styles.dailyBar}>
                    <Text style={styles.dayLabel}>{day.day}</Text>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${day.percentage}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.hoursText}>{day.hours.toFixed(1)}h</Text>
                  </View>
                )
              })}
            </View>
          </View>
        </View>

        {/* Top Projects Ranking */}
        {topProjects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Top 5 Progetti</Text>
            <View style={styles.projectRanking}>
              {topProjects.map((project, index) => {
                const projectHours = project.totalMinutes / 60
                const projectPercentage = (project.totalMinutes / data.timeTracking.totalMinutes) * 100

                return (
                  <View
                    key={project.projectId}
                    style={[
                      styles.projectRankItem,
                      { borderLeftColor: index === 0 ? colors.primary500 : colors.gray300 },
                    ]}
                  >
                    <View style={[styles.rankBadge, { backgroundColor: index === 0 ? colors.primary500 : colors.gray400 }]}>
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.projectNameRank}>{project.projectName}</Text>
                    <Text style={styles.projectHoursRank}>{projectHours.toFixed(1)}h</Text>
                    <Text style={styles.projectPercentage}>({projectPercentage.toFixed(0)}%)</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Performance Metrics Mini Cards */}
        <View style={styles.statRow}>
          <View style={[styles.miniStatCard, { borderLeftColor: colors.success500 }]}>
            <Text style={[styles.miniStatValue, { color: colors.success500 }]}>{completionRate.toFixed(0)}%</Text>
            <Text style={styles.miniStatLabel}>COMPLETAMENTO</Text>
          </View>
          <View style={[styles.miniStatCard, { borderLeftColor: colors.info500 }]}>
            <Text style={[styles.miniStatValue, { color: colors.info500 }]}>{efficiency.toFixed(0)}%</Text>
            <Text style={styles.miniStatLabel}>EFFICIENZA</Text>
          </View>
          <View style={[styles.miniStatCard, { borderLeftColor: colors.warning500 }]}>
            <Text style={[styles.miniStatValue, { color: colors.warning500 }]}>{consistency.toFixed(0)}%</Text>
            <Text style={styles.miniStatLabel}>CONSISTENZA</Text>
          </View>
        </View>

        {/* Footer */}
        <PageFooter pageNumber={hasProjectHealth ? 4 : 3} totalPages={totalPages} weekNumber={data.weekNumber} year={data.year} />
      </Page>

      {/* ==================== TASK DETAILS PAGE ==================== */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Dettaglio Task</Text>
        <Text style={styles.pageSubtitle}>
          Task prioritari e stati di avanzamento (top performers)
        </Text>

        {/* Completed Tasks - Top 5 */}
        {topCompletedTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderTitle}>Task Completati</Text>
              <Text style={styles.taskCount}>({completedTasks} totali, top {topCompletedTasks.length})</Text>
            </View>
            {topCompletedTasks.map((task) => (
              <View key={task.id} style={[styles.taskCard, { borderLeftColor: colors.success500 }]}>
                <View style={styles.taskCardHeader}>
                  <Text style={styles.taskCode}>{task.code}</Text>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                </View>
                {task.projectName && (
                  <Text style={styles.taskMeta}>Progetto: {task.projectName}</Text>
                )}
                {task.assigneeName && (
                  <Text style={styles.taskMeta}>Assegnato: {task.assigneeName}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* In Progress Tasks - Top 3 */}
        {topInProgressTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderTitle}>Task in Corso</Text>
              <Text style={styles.taskCount}>({inProgressTasks} totali, top {topInProgressTasks.length})</Text>
            </View>
            {topInProgressTasks.map((task) => (
              <View key={task.id} style={[styles.taskCard, { borderLeftColor: colors.info500 }]}>
                <View style={styles.taskCardHeader}>
                  <Text style={styles.taskCode}>{task.code}</Text>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                </View>
                {task.projectName && (
                  <Text style={styles.taskMeta}>Progetto: {task.projectName}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Created Tasks - Top 3 */}
        {topCreatedTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderTitle}>Task Creati</Text>
              <Text style={styles.taskCount}>({createdTasks} totali, top {topCreatedTasks.length})</Text>
            </View>
            {topCreatedTasks.map((task) => (
              <View key={task.id} style={[styles.taskCard, { borderLeftColor: colors.warning500 }]}>
                <View style={styles.taskCardHeader}>
                  <Text style={styles.taskCode}>{task.code}</Text>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                </View>
                {task.projectName && (
                  <Text style={styles.taskMeta}>Progetto: {task.projectName}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Report Note */}
        <Text style={styles.disclaimer}>
          Report completo con tutti i task disponibile su ProjectPulse Web
        </Text>

        {/* Footer */}
        <PageFooter pageNumber={hasProjectHealth ? 5 : 4} totalPages={totalPages} weekNumber={data.weekNumber} year={data.year} />
      </Page>

      {/* ==================== BLOCKERS PAGE (if blockers exist) ==================== */}
      {hasBlockers && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.pageTitle}>Appendice: Task Bloccati</Text>
          <Text style={styles.pageSubtitle}>
            Task critici che richiedono attenzione immediata [
            {data.blockerAnalysis ? data.blockerAnalysis.activeCount : data.blockedTasks.length}]
          </Text>

          {/* Enriched summary row (when blockerAnalysis available) */}
          {data.blockerAnalysis && (() => {
            const riskColor =
              data.blockerAnalysis!.riskScore === 'high'
                ? colors.danger500
                : data.blockerAnalysis!.riskScore === 'medium'
                ? colors.warning500
                : colors.success500
            const riskLabel =
              data.blockerAnalysis!.riskScore === 'high'
                ? 'ALTO'
                : data.blockerAnalysis!.riskScore === 'medium'
                ? 'MEDIO'
                : 'BASSO'
            return (
              <View style={styles.blockerSummaryRow}>
                <View style={styles.blockerSummaryItem}>
                  <Text style={styles.blockerSummaryValue}>{data.blockerAnalysis!.activeCount}</Text>
                  <Text style={styles.blockerSummaryLabel}>Attivi</Text>
                </View>
                <View style={styles.blockerSummaryItem}>
                  <Text style={[styles.blockerSummaryValue, { color: colors.success500 }]}>
                    {data.blockerAnalysis!.resolvedThisWeek}
                  </Text>
                  <Text style={styles.blockerSummaryLabel}>Risolti sett.</Text>
                </View>
                <View style={styles.blockerSummaryItem}>
                  <Text style={[styles.blockerSummaryValue, { color: colors.warning500 }]}>
                    {data.blockerAnalysis!.overdueCount}
                  </Text>
                  <Text style={styles.blockerSummaryLabel}>Scaduti</Text>
                </View>
                <View style={[styles.blockerSummaryItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.blockerSummaryLabel}>Risk: </Text>
                  <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                    <Text style={styles.riskBadgeText}>{riskLabel}</Text>
                  </View>
                </View>
              </View>
            )
          })()}

          {/* Enriched blocker items */}
          {data.blockerAnalysis ? (
            <View>
              {data.blockerAnalysis.items.map((task) => (
                <View key={task.id} style={styles.blockerCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                    <Text style={[styles.blockerTitle, { flex: 1 }]}>
                      {task.code} - {task.title}
                    </Text>
                    <View style={[styles.categoryBadge]}>
                      <Text style={styles.categoryBadgeText}>{task.category}</Text>
                    </View>
                  </View>
                  {task.projectName && (
                    <Text style={styles.taskMeta}>Progetto: {task.projectName}</Text>
                  )}
                  {task.assigneeName && (
                    <Text style={styles.taskMeta}>Assegnato: {task.assigneeName}</Text>
                  )}
                  <Text style={styles.daysBlockedText}>
                    Bloccato da {task.daysBlocked} {task.daysBlocked === 1 ? 'giorno' : 'giorni'}
                  </Text>
                  {task.blockedReason && (
                    <Text style={styles.blockerReason}>Motivo: {task.blockedReason}</Text>
                  )}
                  {task.lastComment && !task.blockedReason && (
                    <Text style={styles.blockerReason}>Commento: {task.lastComment}</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View>
              {data.blockedTasks.map((task) => (
                <View key={task.id} style={styles.blockerCard}>
                  <Text style={styles.blockerTitle}>
                    {task.code} - {task.title}
                  </Text>
                  {task.projectName && (
                    <Text style={styles.taskMeta}>Progetto: {task.projectName}</Text>
                  )}
                  {task.assigneeName && (
                    <Text style={styles.taskMeta}>Assegnato: {task.assigneeName}</Text>
                  )}
                  {task.lastComment && (
                    <Text style={styles.blockerReason}>Commento: {task.lastComment}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.sectionDivider} />

          {/* Action Points */}
          <View style={styles.insightBox}>
            <Text style={styles.insightTitle}>Action Points</Text>
            <Text style={styles.insightText}>
              {'\u2022'} Prioritizzare la risoluzione dei blocchi per sbloccare il flusso di lavoro{'\n'}
              {'\u2022'} Identificare dipendenze esterne e risolvere tempestivamente{'\n'}
              {'\u2022'} Comunicare con gli stakeholder per chiarimenti e approvazioni
            </Text>
          </View>

          {/* Footer */}
          <PageFooter
            pageNumber={totalPages}
            totalPages={totalPages}
            weekNumber={data.weekNumber}
            year={data.year}
          />
        </Page>
      )}
    </Document>
  )
}
