/**
 * PDF Export Utility - Generate PDF from weekly report data with modern design
 * @module utils/pdfExport
 * 
 * Features:
 * - Modern cover page with executive summary
 * - Advanced charts (pie chart, circular progress, performance score)
 * - Rich statistics with visual indicators
 * - Gradient boxes and colored sections
 * - Performance metrics (efficiency, productivity, completion rate)
 * 
 * Best Practices:
 * - html2canvas for rendering charts, emoji, and complex components
 * - Proper error handling and type safety
 * - Loading states for async operations
 * - High quality output (2x scale)
 */

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { WeeklyReportData } from '@/types'

// Type definitions for better type safety
interface ExportOptions {
  scale?: number
  quality?: 'low' | 'medium' | 'high'
  includeTimestamp?: boolean
  onProgress?: (progress: number) => void
}

interface PDFGeneratorResult {
  success: boolean
  filename?: string
  error?: string
}

// Font sizes
const FONT_SIZE = {
  MEGA: 24,
  TITLE: 18,
  SUBTITLE: 14,
  HEADING: 12,
  BODY: 10,
  SMALL: 8,
  TINY: 7,
}

// Modern color palette with gradients
const COLORS = {
  PRIMARY: '#2563eb',
  PRIMARY_DARK: '#1e40af',
  SECONDARY: '#7c3aed',
  SECONDARY_DARK: '#6b21a8',
  SUCCESS: '#16a34a',
  SUCCESS_DARK: '#15803d',
  WARNING: '#ea580c',
  WARNING_DARK: '#c2410c',
  DANGER: '#dc2626',
  DANGER_DARK: '#991b1b',
  INFO: '#0891b2',
  INFO_DARK: '#0e7490',
  TEXT: '#1f2937',
  TEXT_LIGHT: '#6b7280',
  TEXT_LIGHTER: '#9ca3af',
  BORDER: '#e5e7eb',
  BG_LIGHT: '#f9fafb',
  BG_LIGHTER: '#f3f4f6',
  PURPLE: '#8b5cf6',
  PURPLE_DARK: '#7c3aed',
  CYAN: '#06b6d4',
  CYAN_DARK: '#0891b2',
  PINK: '#ec4899',
  PINK_DARK: '#db2777',
}

/**
 * Logger utility with consistent formatting
 */
const logger = {
  info: (_message: string, _data?: unknown) => { /* no-op in production */ },
  warn: (_message: string, _data?: unknown) => { /* no-op in production */ },
  error: (_message: string, _error?: unknown) => { /* no-op in production */ },
  success: (_message: string) => { /* no-op in production */ },
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format time in hours
 */
function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

/**
 * Export a DOM element (with charts, emoji, etc) to PDF using html2canvas
 * Perfect for Recharts, emoji icons, and complex layouts
 * 
 * @param elementId - The ID of the DOM element to capture
 * @param filename - Output filename
 * @param options - Export options
 * @returns Result object with success status and filename/error
 */
export async function exportElementToPDF(
  elementId: string,
  filename: string,
  options: ExportOptions = {}
): Promise<PDFGeneratorResult> {
  try {
    const {
      scale = 2,
      includeTimestamp = true,
      onProgress,
    } = options

    logger.info(`Starting element export: ${elementId}`)
    onProgress?.(10)

    const element = document.getElementById(elementId)
    if (!element) {
      logger.error(`Element not found: ${elementId}`)
      return {
        success: false,
        error: `Document element "${elementId}" not found`,
      }
    }

    // Render element to canvas with high quality
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    })

    onProgress?.(50)

    // Convert canvas to PDF
    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 190 // A4 width minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    let yPos = margin

    // Add image(s) across multiple pages if needed
    let heightLeft = imgHeight

    while (heightLeft >= 0) {
      const pageCapacity = pageHeight - 2 * margin
      const heightToDraw = Math.min(heightLeft, pageCapacity)

      pdf.addImage(
        imgData,
        'PNG',
        margin,
        yPos,
        imgWidth,
        heightToDraw
      )

      heightLeft -= pageCapacity
      if (heightLeft > 0) {
        pdf.addPage()
        yPos = margin
      }
    }

    // Add timestamp if requested
    if (includeTimestamp) {
      const totalPages = (pdf as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(200)
        pdf.text(
          `Generato il ${new Date().toLocaleString('it-IT')}`,
          190,
          pdf.internal.pageSize.getHeight() - 5,
          { align: 'right' }
        )
      }
    }

    // Save PDF
    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
    pdf.save(finalFilename)

    onProgress?.(100)
    logger.success(`Exported to ${finalFilename}`)

    return {
      success: true,
      filename: finalFilename,
    }
  } catch (error) {
    logger.error('Element export failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Export multiple elements (e.g., dashboard widgets, charts) to a single PDF
 * Useful for exporting multiple charts or different report sections
 * 
 * @param elements - Array of { id, title } objects
 * @param filename - Output filename
 * @param options - Export options
 */
export async function exportMultipleElementsToPDF(
  elements: Array<{ id: string; title?: string }>,
  filename: string,
  options: ExportOptions = {}
): Promise<PDFGeneratorResult> {
  try {
    const { scale = 2, onProgress } = options

    logger.info(`Starting multi-element export: ${elements.length} elements`)
    onProgress?.(5)

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15

    let pageCount = 0
    let needsNewPage = false

    for (let i = 0; i < elements.length; i++) {
      const { id, title } = elements[i]
      const element = document.getElementById(id)

      if (!element) {
        logger.warn(`Skipping element: ${id}`)
        continue
      }

      // Add page if needed
      if (needsNewPage || i > 0) {
        pdf.addPage()
        pageCount++
      }

      // Add title if provided
      if (title) {
        pdf.setFontSize(16)
        pdf.setTextColor(COLORS.PRIMARY)
        pdf.setFont('helvetica', 'bold')
        pdf.text(title, margin, margin)
        pdf.setFont('helvetica', 'normal')
      }

      // Render element to canvas
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = pageWidth - 2 * margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const yStart = title ? margin + 15 : margin

      pdf.addImage(
        imgData,
        'PNG',
        margin,
        yStart,
        imgWidth,
        imgHeight
      )

      needsNewPage = yStart + imgHeight > pageHeight - margin

      onProgress?.(5 + (i / elements.length) * 90)
    }

    // Add page numbers
    const totalPages = (pdf as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setTextColor(150)
      pdf.text(
        `${i} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      )
    }

    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
    pdf.save(finalFilename)

    onProgress?.(100)
    logger.success(`Exported ${elements.length} elements to ${finalFilename}`)

    return {
      success: true,
      filename: finalFilename,
    }
  } catch (error) {
    logger.error('Multi-element export failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * ========================================
 * MODERN PDF HELPER FUNCTIONS
 * ========================================
 */

/**
 * Draw a circular progress indicator (donut chart style)
 * Perfect for percentage displays like completion rate
 */
function drawCircularProgress(
  pdf: jsPDF,
  x: number,
  y: number,
  radius: number,
  percentage: number,
  color: string,
  backgroundColor: string = '#e5e7eb'
): void {
  const centerX = x
  const centerY = y
  const lineWidth = 3
  
  // Background circle
  pdf.setDrawColor(backgroundColor)
  pdf.setLineWidth(lineWidth)
  pdf.circle(centerX, centerY, radius, 'S')
  
  // Progress arc (percentage of circle)
  if (percentage > 0) {
    const startAngle = -90 // Start from top
    const endAngle = startAngle + (percentage / 100) * 360
    
    // Draw arc manually with multiple line segments for smooth appearance
    pdf.setDrawColor(color)
    const segments = Math.max(20, Math.floor(percentage * 2)) // More segments for smoother arc
    const angleStep = ((endAngle - startAngle) * Math.PI) / (180 * segments)
    const startRad = (startAngle * Math.PI) / 180
    
    for (let i = 0; i < segments; i++) {
      const angle1 = startRad + angleStep * i
      const angle2 = startRad + angleStep * (i + 1)
      const x1 = centerX + radius * Math.cos(angle1)
      const y1 = centerY + radius * Math.sin(angle1)
      const x2 = centerX + radius * Math.cos(angle2)
      const y2 = centerY + radius * Math.sin(angle2)
      pdf.line(x1, y1, x2, y2)
    }
  }
  
  pdf.setLineWidth(0.5) // Reset line width
}

/**
 * Draw a pie chart for distribution visualization
 * Ideal for showing task status distribution, project allocation, etc.
 */
function drawPieChart(
  pdf: jsPDF,
  x: number,
  y: number,
  radius: number,
  data: Array<{ label: string; value: number; color: string }>,
  showLabels: boolean = true
): void {
  const centerX = x
  const centerY = y
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  if (total === 0) return
  
  let currentAngle = -90 // Start from top
  
  data.forEach((item) => {
    const percentage = item.value / total
    const sliceAngle = percentage * 360

    // Draw slice
    const startAngle = currentAngle
    
    // Fill slice with color
    pdf.setFillColor(item.color)
    
    // Draw slice as polygon
    const segments = Math.max(20, Math.floor(sliceAngle / 2))
    const points: Array<[number, number]> = [[centerX, centerY]]
    
    for (let i = 0; i <= segments; i++) {
      const angle = ((startAngle + (sliceAngle * i) / segments) * Math.PI) / 180
      const px = centerX + radius * Math.cos(angle)
      const py = centerY + radius * Math.sin(angle)
      points.push([px, py])
    }
    
    // Draw filled polygon
    pdf.setDrawColor(255, 255, 255)
    pdf.setLineWidth(0.5)
    
    // Triangle fan approach for filling
    for (let i = 1; i < points.length - 1; i++) {
      pdf.triangle(
        points[0][0], points[0][1],
        points[i][0], points[i][1],
        points[i + 1][0], points[i + 1][1],
        'FD'
      )
    }
    
    // Add label if enabled and slice is large enough
    if (showLabels && percentage > 0.05) {
      const labelAngle = ((startAngle + sliceAngle / 2) * Math.PI) / 180
      const labelRadius = radius * 0.7
      const labelX = centerX + labelRadius * Math.cos(labelAngle)
      const labelY = centerY + labelRadius * Math.sin(labelAngle)
      
      pdf.setFontSize(FONT_SIZE.TINY)
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${Math.round(percentage * 100)}%`, labelX, labelY, { align: 'center' })
    }
    
    currentAngle += sliceAngle
  })
}

/**
 * Draw a gradient box (simulated with multiple rectangles)
 * Creates a modern gradient effect using overlapping rectangles with varying opacity
 */
function drawGradientBox(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  colorStart: string,
  colorEnd: string,
  rounded: boolean = true
): void {
  // Parse hex colors to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }
  
  const rgbStart = hexToRgb(colorStart)
  const rgbEnd = hexToRgb(colorEnd)
  
  // Draw gradient with multiple layers
  const steps = 20
  const stepHeight = height / steps
  
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps
    const r = Math.round(rgbStart.r + (rgbEnd.r - rgbStart.r) * ratio)
    const g = Math.round(rgbStart.g + (rgbEnd.g - rgbStart.g) * ratio)
    const b = Math.round(rgbStart.b + (rgbEnd.b - rgbStart.b) * ratio)
    
    pdf.setFillColor(r, g, b)
    
    if (rounded && i === 0) {
      pdf.roundedRect(x, y + i * stepHeight, width, stepHeight + 1, 2, 2, 'F')
    } else if (rounded && i === steps - 1) {
      pdf.roundedRect(x, y + i * stepHeight, width, stepHeight, 2, 2, 'F')
    } else {
      pdf.rect(x, y + i * stepHeight, width, stepHeight, 'F')
    }
  }
}

/**
 * Draw an icon box with colored background and icon
 * Modern KPI display with emoji/text icon
 */
function drawIconBox(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  icon: string,
  label: string,
  value: string,
  color: string,
  colorDark: string
): void {
  // Gradient background
  drawGradientBox(pdf, x, y, width, height, color, colorDark, true)
  
  // Icon
  pdf.setFontSize(FONT_SIZE.TITLE)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.text(icon, x + 5, y + height / 2 - 2, { baseline: 'middle' })
  
  // Label
  pdf.setFontSize(FONT_SIZE.SMALL)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'normal')
  pdf.text(label, x + 20, y + height / 2 - 3)
  
  // Value
  pdf.setFontSize(FONT_SIZE.SUBTITLE)
  pdf.setFont('helvetica', 'bold')
  pdf.text(value, x + 20, y + height / 2 + 5)
}

/**
 * Draw performance score with badge and visual indicator
 * Shows overall weekly performance score with color-coded badge
 */
function drawPerformanceScore(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  score: number,
  title: string = 'Performance Score'
): void {
  const centerX = x + width / 2
  const centerY = y + 25
  
  // Determine badge color and text based on score
  let badgeColor: string
  let badgeColorDark: string
  let badgeText: string
  
  if (score >= 85) {
    badgeColor = COLORS.SUCCESS
    badgeColorDark = COLORS.SUCCESS_DARK
    badgeText = 'ECCELLENTE'
  } else if (score >= 70) {
    badgeColor = COLORS.INFO
    badgeColorDark = COLORS.INFO_DARK
    badgeText = 'OTTIMO'
  } else if (score >= 55) {
    badgeColor = COLORS.WARNING
    badgeColorDark = COLORS.WARNING_DARK
    badgeText = 'BUONO'
  } else {
    badgeColor = COLORS.DANGER
    badgeColorDark = COLORS.DANGER_DARK
    badgeText = 'DA MIGLIORARE'
  }
  
  // Background box
  pdf.setDrawColor(COLORS.BORDER)
  pdf.setFillColor(COLORS.BG_LIGHT)
  pdf.roundedRect(x, y, width, 55, 3, 3, 'FD')
  
  // Title
  pdf.setFontSize(FONT_SIZE.BODY)
  pdf.setTextColor(COLORS.TEXT_LIGHT)
  pdf.setFont('helvetica', 'normal')
  pdf.text(title, centerX, y + 8, { align: 'center' })
  
  // Circular progress
  drawCircularProgress(pdf, centerX, centerY, 15, score, badgeColor)
  
  // Score text in center
  pdf.setFontSize(FONT_SIZE.SUBTITLE)
  pdf.setTextColor(COLORS.TEXT)
  pdf.setFont('helvetica', 'bold')
  pdf.text(Math.round(score).toString(), centerX, centerY + 1, { align: 'center', baseline: 'middle' })
  
  // Badge below
  const badgeWidth = 50
  const badgeHeight = 8
  const badgeX = centerX - badgeWidth / 2
  const badgeY = centerY + 20
  
  drawGradientBox(pdf, badgeX, badgeY, badgeWidth, badgeHeight, badgeColor, badgeColorDark, true)
  
  pdf.setFontSize(FONT_SIZE.TINY)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.text(badgeText, centerX, badgeY + 5.5, { align: 'center' })
}

/**
 * Draw modern cover page with executive summary
 * Creates an impressive first page with key metrics and professional design
 */
function drawCoverPage(
  pdf: jsPDF,
  data: WeeklyReportData,
  metrics: {
    totalHours: number
    completionRate: number
    efficiency: number
    productivity: number
    overallScore: number
  }
): void {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  // Gradient header (simulated with gradient box)
  drawGradientBox(pdf, 0, 0, pageWidth, 70, COLORS.PRIMARY, COLORS.SECONDARY_DARK, false)
  
  // Logo/Icon
  pdf.setFontSize(FONT_SIZE.MEGA + 10)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.text('📊', 20, 30)
  
  // Main title
  pdf.setFontSize(FONT_SIZE.MEGA)
  pdf.text('REPORT SETTIMANALE', 40, 25)
  
  // Subtitle
  pdf.setFontSize(FONT_SIZE.SUBTITLE)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Settimana ${data.weekNumber} / ${data.year}`, 40, 35)
  
  // Date range
  pdf.setFontSize(FONT_SIZE.BODY)
  pdf.text(
    `${formatDate(data.weekStartDate)} - ${formatDate(data.weekEndDate)}`,
    40,
    42
  )
  
  // User name
  pdf.setFontSize(FONT_SIZE.HEADING)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.userName, 40, 55)
  
  // Executive Summary Section
  let yPos = 85
  pdf.setFontSize(FONT_SIZE.HEADING)
  pdf.setTextColor(COLORS.PRIMARY)
  pdf.setFont('helvetica', 'bold')
  pdf.text('EXECUTIVE SUMMARY', 20, yPos)
  
  yPos += 3
  pdf.setDrawColor(COLORS.PRIMARY)
  pdf.setLineWidth(1)
  pdf.line(20, yPos, 90, yPos)
  
  yPos += 12
  
  // Performance Score (large, centered)
  drawPerformanceScore(pdf, 20, yPos, 80, metrics.overallScore, 'Performance Complessiva')
  
  yPos += 65
  
  // Key metrics in gradient boxes
  const boxWidth = 85
  const boxHeight = 22
  const boxSpacing = 5
  
  drawIconBox(
    pdf,
    20,
    yPos,
    boxWidth,
    boxHeight,
    '⏱',
    'Ore Totali',
    `${metrics.totalHours.toFixed(1)}h`,
    COLORS.PRIMARY,
    COLORS.PRIMARY_DARK
  )
  
  yPos += boxHeight + boxSpacing
  
  drawIconBox(
    pdf,
    20,
    yPos,
    boxWidth,
    boxHeight,
    '✓',
    'Tasso Completamento',
    `${metrics.completionRate.toFixed(0)}%`,
    COLORS.SUCCESS,
    COLORS.SUCCESS_DARK
  )
  
  yPos += boxHeight + boxSpacing
  
  drawIconBox(
    pdf,
    20,
    yPos,
    boxWidth,
    boxHeight,
    '⚡',
    'Efficienza',
    `${metrics.efficiency.toFixed(1)}%`,
    COLORS.WARNING,
    COLORS.WARNING_DARK
  )
  
  yPos += boxHeight + boxSpacing
  
  drawIconBox(
    pdf,
    20,
    yPos,
    boxWidth,
    boxHeight,
    '🎯',
    'Produttività',
    `${metrics.productivity.toFixed(1)}`,
    COLORS.INFO,
    COLORS.INFO_DARK
  )
  
  // Right side: Task distribution pie chart
  const pieX = 130
  const pieY = 120
  const pieRadius = 30
  
  pdf.setFontSize(FONT_SIZE.HEADING)
  pdf.setTextColor(COLORS.PRIMARY)
  pdf.setFont('helvetica', 'bold')
  pdf.text('DISTRIBUZIONE TASK', pieX - 5, pieY - 40)
  
  const taskDistribution = [
    {
      label: 'Completati',
      value: data.tasks.completed.length,
      color: COLORS.SUCCESS
    },
    {
      label: 'In Corso',
      value: data.tasks.inProgress.length,
      color: COLORS.WARNING
    },
    {
      label: 'Da Fare',
      value: data.tasks.created.length,
      color: COLORS.INFO
    }
  ]
  
  drawPieChart(pdf, pieX + 25, pieY, pieRadius, taskDistribution, true)
  
  // Legend for pie chart
  let legendY = pieY + pieRadius + 15
  taskDistribution.forEach((item) => {
    if (item.value > 0) {
      pdf.setFillColor(item.color)
      pdf.circle(pieX, legendY, 2, 'F')
      
      pdf.setFontSize(FONT_SIZE.SMALL)
      pdf.setTextColor(COLORS.TEXT)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${item.label}: ${item.value}`, pieX + 5, legendY + 1)
      
      legendY += 6
    }
  })
  
  // Footer with generation timestamp
  pdf.setFontSize(FONT_SIZE.SMALL)
  pdf.setTextColor(COLORS.TEXT_LIGHTER)
  pdf.setFont('helvetica', 'italic')
  pdf.text(
    `Documento generato il ${new Date().toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`,
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  )
  
  // Add new page for content
  pdf.addPage()
}

/**
 * ========================================
 * MAIN EXPORT FUNCTION
 * ========================================
 */

/**
 * Export weekly report to PDF with modern design
 * Features: cover page, performance metrics, charts, detailed breakdown
 * 
 * @param data - Weekly report data
 * @param selectedUserId - Optional user filter
 * @param options - Export options
 * @returns Result object with success status
 */
export async function exportWeeklyReportToPDF(
  data: WeeklyReportData,
  selectedUserId?: string | null,
  options: ExportOptions = {}
): Promise<PDFGeneratorResult> {
  try {
    const { onProgress } = options

    logger.info('Starting weekly report export', {
      hasEntries: !!data.timeTracking.entries,
      entriesLength: data.timeTracking.entries?.length || 0,
      byTaskLength: data.timeTracking.byTask.length,
    })

    onProgress?.(5)
  
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pageWidth - 2 * margin
    let yPos = margin

    // ========================================
    // Calculate Advanced Metrics
    // ========================================
    
    const totalMinutes = data.timeTracking.totalMinutes
    const totalHours = totalMinutes / 60
    const completedTasks = data.tasks.completed.length
    const totalTasks = completedTasks + data.tasks.inProgress.length + data.tasks.created.length
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    
    // Efficiency: task completion rate relative to time spent
    // Formula: (completed tasks / total hours) normalized to 0-100 scale
    const efficiency = totalHours > 0 ? Math.min(100, (completedTasks / totalHours) * 10) : 0
    
    // Productivity: weighted metric of completion and time utilization
    // Formula: average of completion rate and time efficiency
    const avgHoursPerDay = totalHours / 7
    const targetHoursPerDay = 8 // ideal work hours per day
    const timeUtilization = Math.min(100, (avgHoursPerDay / targetHoursPerDay) * 100)
    const productivity = (completionRate * 0.6 + timeUtilization * 0.4)
    
    // Overall Score: weighted combination of all metrics
    // Formula: efficiency 25%, completion 30%, productivity 25%, consistency 20%
    const consistency = totalHours > 0 ? Math.min(100, (avgHoursPerDay / Math.max(0.5, avgHoursPerDay)) * 80) : 0
    const overallScore = (
      efficiency * 0.25 +
      completionRate * 0.30 +
      productivity * 0.25 +
      consistency * 0.20
    )
    
    const metrics = {
      totalHours,
      completionRate,
      efficiency,
      productivity,
      overallScore
    }
    
    // ========================================
    // COVER PAGE
    // ========================================
    
    drawCoverPage(pdf, data, metrics)
    onProgress?.(15)
    
    // ========================================
    // Helper Functions (page-specific)
    // ========================================
    
    // Helper: Add new page if needed
    const checkPageBreak = (height: number): void => {
      if (yPos + height > pageHeight - margin - 15) {
        pdf.addPage()
        yPos = margin
      }
    }

    // Helper: Draw section title with modern styling
    const drawSectionTitle = (title: string, icon: string = ''): void => {
      checkPageBreak(15)
      
      // Background bar
      pdf.setFillColor(COLORS.BG_LIGHTER)
      pdf.rect(margin - 5, yPos - 3, contentWidth + 10, 10, 'F')
      
      // Icon + Title
      pdf.setFontSize(FONT_SIZE.HEADING)
      pdf.setTextColor(COLORS.PRIMARY)
      pdf.setFont('helvetica', 'bold')
      
      let textX = margin
      if (icon) {
        pdf.text(icon, textX, yPos + 4)
        textX += 8
      }
      
      pdf.text(title, textX, yPos + 4)
      yPos += 12
    }

    // Helper: Draw modern stat box with icon
    const drawStatBox = (
      x: number,
      y: number,
      width: number,
      icon: string,
      label: string,
      value: string,
      color: string
    ): void => {
      // Gradient background
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ] : [0, 0, 0]
      }
      
      const [r, g, b] = hexToRgb(color)
      
      // Light background with colored border
      pdf.setDrawColor(color)
      pdf.setLineWidth(0.8)
      pdf.setFillColor(r + 40, g + 40, b + 40)
      pdf.roundedRect(x, y, width, 20, 2, 2, 'FD')
      
      // Icon
      pdf.setFontSize(FONT_SIZE.SUBTITLE)
      pdf.setTextColor(color)
      pdf.text(icon, x + 4, y + 8)
      
      // Label
      pdf.setFontSize(FONT_SIZE.SMALL)
      pdf.setTextColor(COLORS.TEXT_LIGHT)
      pdf.setFont('helvetica', 'normal')
      pdf.text(label, x + 4, y + 14)
      
      // Value
      pdf.setFontSize(FONT_SIZE.SUBTITLE)
      pdf.setTextColor(COLORS.TEXT)
      pdf.setFont('helvetica', 'bold')
      pdf.text(value, x + width - 4, y + 14, { align: 'right' })
      
      pdf.setLineWidth(0.5) // Reset
    }

    // Helper: Draw horizontal bar chart with modern styling
    const drawHorizontalBarChart = (
      title: string,
      chartData: { label: string; value: number; color: string }[],
      maxValue: number,
      icon: string = ''
    ): void => {
      checkPageBreak(60)
      drawSectionTitle(title, icon)
      
      const barHeight = 8
      const barSpacing = 4
      const chartWidth = contentWidth - 65
      const labelWidth = 55
      
      chartData.forEach((item) => {
        checkPageBreak(barHeight + barSpacing)
        
        // Label
        pdf.setFontSize(FONT_SIZE.SMALL)
        pdf.setTextColor(COLORS.TEXT)
        pdf.setFont('helvetica', 'normal')
        const labelText = item.label.length > 28 ? item.label.substring(0, 28) + '...' : item.label
        pdf.text(labelText, margin, yPos + 6)
        
        // Bar background with shadow effect
        pdf.setDrawColor(COLORS.BORDER)
        pdf.setFillColor(COLORS.BG_LIGHTER)
        pdf.roundedRect(margin + labelWidth, yPos, chartWidth, barHeight, 2, 2, 'FD')
        
        // Bar fill with gradient simulation
        const barWidth = (item.value / maxValue) * chartWidth
        if (barWidth > 0) {
          pdf.setFillColor(item.color)
          pdf.roundedRect(margin + labelWidth, yPos, barWidth, barHeight, 2, 2, 'F')
          
          // Lighter overlay for gradient effect
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
            return result ? [
              parseInt(result[1], 16),
              parseInt(result[2], 16),
              parseInt(result[3], 16)
            ] : [0, 0, 0]
          }
          
          const [r, g, b] = hexToRgb(item.color)
          pdf.setFillColor(Math.min(255, r + 30), Math.min(255, g + 30), Math.min(255, b + 30))
          pdf.rect(margin + labelWidth, yPos, barWidth, barHeight / 2, 'F')
        }
        
        // Value label
        pdf.setFontSize(FONT_SIZE.SMALL)
        pdf.setTextColor(COLORS.TEXT)
        pdf.setFont('helvetica', 'bold')
        pdf.text(
          formatHours(item.value) + 'h',
          margin + labelWidth + chartWidth + 3,
          yPos + 6
        )
        
        yPos += barHeight + barSpacing
      })
      
      yPos += 8
    }

    // ========================================
    // PERFORMANCE DASHBOARD
    // ========================================
    
    drawSectionTitle('Dashboard Performance', '📈')
    
    // KPI boxes in 2 rows
    const kpiBoxWidth = (contentWidth - 6) / 3
    const kpiBoxHeight = 20
    const kpiSpacing = 3
    
    // Row 1
    drawStatBox(
      margin,
      yPos,
      kpiBoxWidth,
      '⏱',
      'Ore Totali',
      `${totalHours.toFixed(1)}h`,
      COLORS.PRIMARY
    )
    
    drawStatBox(
      margin + kpiBoxWidth + kpiSpacing,
      yPos,
      kpiBoxWidth,
      '✓',
      'Task Completati',
      completedTasks.toString(),
      COLORS.SUCCESS
    )
    
    drawStatBox(
      margin + 2 * (kpiBoxWidth + kpiSpacing),
      yPos,
      kpiBoxWidth,
      '📊',
      'Task Totali',
      totalTasks.toString(),
      COLORS.INFO
    )
    
    yPos += kpiBoxHeight + kpiSpacing + 3
    
    // Row 2
    drawStatBox(
      margin,
      yPos,
      kpiBoxWidth,
      '⚡',
      'Efficienza',
      `${efficiency.toFixed(0)}%`,
      COLORS.WARNING
    )
    
    drawStatBox(
      margin + kpiBoxWidth + kpiSpacing,
      yPos,
      kpiBoxWidth,
      '🎯',
      'Produttività',
      `${productivity.toFixed(0)}%`,
      COLORS.PURPLE
    )
    
    drawStatBox(
      margin + 2 * (kpiBoxWidth + kpiSpacing),
      yPos,
      kpiBoxWidth,
      '📅',
      'Media h/giorno',
      `${avgHoursPerDay.toFixed(1)}h`,
      COLORS.CYAN
    )
    
    yPos += kpiBoxHeight + 15

    // ========================================
    // Filter data if user is selected
    // ========================================
    
  const blockedTasks = selectedUserId
    ? data.blockedTasks.filter((t) => t.assigneeId === selectedUserId)
    : data.blockedTasks

  // Helper: Get time entries for a task (with safety check)
  const getTaskTimeEntries = (taskId: string) => {
    if (!data.timeTracking.entries || !Array.isArray(data.timeTracking.entries)) {
      return []
    }
    return data.timeTracking.entries.filter((e) => e.taskId === taskId)
  }

  // ========================================
  // PROJECT TIME DISTRIBUTION CHART
  // ========================================
  
  if (data.timeTracking.byProject.length > 0) {
    const projectsForChart = [...data.timeTracking.byProject]
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 5)
      .map((p, index) => ({
        label: p.projectName,
        value: p.totalMinutes,
        color: [
          COLORS.PRIMARY,
          COLORS.SUCCESS,
          COLORS.WARNING,
          COLORS.PURPLE,
          COLORS.CYAN,
        ][index] || COLORS.TEXT_LIGHT
      }))
    
    const maxValue = Math.max(...projectsForChart.map(p => p.value))
    drawHorizontalBarChart(
      'Distribuzione Ore per Progetto (Top 5)',
      projectsForChart,
      maxValue,
      '📁'
    )
  }

  // ========================================
  // TASK COMPLETION ANALYSIS
  // ========================================
  
  checkPageBreak(70)
  drawSectionTitle('Analisi Completamento Task', '✓')
  
  // Completion rate with circular progress
  const circleX = margin + 30
  const circleY = yPos + 20
  const circleRadius = 18
  
  // Background box for circular progress
  pdf.setDrawColor(COLORS.BORDER)
  pdf.setFillColor(COLORS.BG_LIGHT)
  pdf.roundedRect(margin, yPos, 70, 45, 3, 3, 'FD')
  
  drawCircularProgress(
    pdf,
    circleX,
    circleY,
    circleRadius,
    completionRate,
    COLORS.SUCCESS
  )
  
  // Percentage text in center
  pdf.setFontSize(FONT_SIZE.SUBTITLE)
  pdf.setTextColor(COLORS.TEXT)
  pdf.setFont('helvetica', 'bold')
  pdf.text(
    `${completionRate.toFixed(0)}%`,
    circleX,
    circleY + 1,
    { align: 'center', baseline: 'middle' }
  )
  
  // Label
  pdf.setFontSize(FONT_SIZE.SMALL)
  pdf.setTextColor(COLORS.TEXT_LIGHT)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Tasso Completamento', circleX, circleY + 25, { align: 'center' })
  
  // Task breakdown
  const breakdownX = margin + 75
  const breakdownY = yPos + 5
  const breakdownData = [
    { label: '✅ Completati', value: data.tasks.completed.length, color: COLORS.SUCCESS },
    { label: '🔄 In Corso', value: data.tasks.inProgress.length, color: COLORS.WARNING },
    { label: '📋 Da Fare', value: data.tasks.created.length, color: COLORS.INFO },
  ]
  
  breakdownData.forEach((item, index) => {
    const itemY = breakdownY + index * 12
    
    // Color indicator
    pdf.setFillColor(item.color)
    pdf.circle(breakdownX, itemY + 4, 2, 'F')
    
    // Label and value
    pdf.setFontSize(FONT_SIZE.SMALL)
    pdf.setTextColor(COLORS.TEXT)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`${item.label}:`, breakdownX + 5, itemY + 5)
    
    pdf.setFont('helvetica', 'bold')
    pdf.text(item.value.toString(), breakdownX + 50, itemY + 5)
  })
  
  yPos += 55

  // ========================================
  // DETAILED STATISTICS GRID
  // ========================================
  
  checkPageBreak(60)
  drawSectionTitle('Statistiche Dettagliate', '📊')
  
  const activeProjects = data.timeTracking.byProject.length
  
  // Find task with most time
  const topTask = data.timeTracking.byTask.length > 0 
    ? [...data.timeTracking.byTask].sort((a, b) => b.totalMinutes - a.totalMinutes)[0]
    : null
  
  const statistics = [
    { icon: '📅', label: 'Ore medie/giorno', value: avgHoursPerDay.toFixed(1) + 'h', color: COLORS.PRIMARY },
    { icon: '📁', label: 'Progetti attivi', value: activeProjects.toString(), color: COLORS.INFO },
    { icon: '⚡', label: 'Task/ora', value: totalHours > 0 ? (completedTasks / totalHours).toFixed(2) : '0', color: COLORS.WARNING },
    { icon: '🎯', label: 'Score Performance', value: overallScore.toFixed(0) + '%', color: COLORS.SUCCESS },
    { icon: '🔄', label: 'Task in corso', value: data.tasks.inProgress.length.toString(), color: COLORS.WARNING },
    { icon: '➕', label: 'Task creati', value: data.tasks.created.length.toString(), color: COLORS.CYAN },
  ]
  
  // Draw in 2-column grid with modern styling
  const statBoxWidth = (contentWidth - 6) / 2
  const statBoxHeight = 18
  const statSpacing = 4
  
  statistics.forEach((stat, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = margin + col * (statBoxWidth + statSpacing)
    const y = yPos + row * (statBoxHeight + statSpacing)
    
    if (col === 0) {
      checkPageBreak(statBoxHeight + statSpacing)
    }
    
    // Box with colored border
    pdf.setDrawColor(stat.color)
    pdf.setLineWidth(0.8)
    pdf.setFillColor(COLORS.BG_LIGHT)
    pdf.roundedRect(x, y, statBoxWidth, statBoxHeight, 2, 2, 'FD')
    
    // Icon
    pdf.setFontSize(FONT_SIZE.BODY)
    pdf.text(stat.icon, x + 4, y + 10)
    
    // Label
    pdf.setFontSize(FONT_SIZE.SMALL)
    pdf.setTextColor(COLORS.TEXT_LIGHT)
    pdf.setFont('helvetica', 'normal')
    pdf.text(stat.label, x + 14, y + 8)
    
    // Value
    pdf.setFontSize(FONT_SIZE.HEADING)
    pdf.setTextColor(COLORS.TEXT)
    pdf.setFont('helvetica', 'bold')
    pdf.text(stat.value, x + statBoxWidth - 4, y + 13, { align: 'right' })
  })
  
  yPos += Math.ceil(statistics.length / 2) * (statBoxHeight + statSpacing) + 10
  
  if (topTask) {
    checkPageBreak(15)
    pdf.setDrawColor(COLORS.PURPLE)
    pdf.setLineWidth(0.8)
    pdf.setFillColor(COLORS.BG_LIGHT)
    pdf.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'FD')
    
    pdf.setFontSize(FONT_SIZE.BODY)
    pdf.text('🏆', margin + 4, yPos + 7)
    
    pdf.setFontSize(FONT_SIZE.SMALL)
    pdf.setTextColor(COLORS.TEXT_LIGHT)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Task più impegnativo:', margin + 14, yPos + 7)
    
    pdf.setTextColor(COLORS.TEXT)
    pdf.setFont('helvetica', 'bold')
    const topTaskText = topTask.taskTitle.length > 45 
      ? topTask.taskTitle.substring(0, 45) + '...' 
      : topTask.taskTitle
    pdf.text(`${topTaskText} (${formatHours(topTask.totalMinutes)}h)`, margin + 58, yPos + 7)
    
    yPos += 18
  }

  // ========================================
  // PROJECT TIME DETAILS (TREE VIEW)
  // ========================================
  
  if (data.timeTracking.byTask.length > 0) {
    checkPageBreak(20)
    drawSectionTitle('Dettaglio Ore per Progetto', '🗂')
    
    // Build task status and recurring maps
    const taskStatusMap = new Map<string, string>()
    const taskRecurringMap = new Map<string, boolean>()
    
    const allTasksWithStatus = [
      ...data.tasks.completed,
      ...data.tasks.inProgress,
      ...data.tasks.created,
    ]
    
    allTasksWithStatus.forEach((task) => {
      taskStatusMap.set(task.id, task.status)
      taskRecurringMap.set(task.id, task.isRecurring)
    })
    
    // Helper: Get status display
    const getStatusDisplay = (status: string): { icon: string; color: string } => {
      switch (status.toLowerCase()) {
        case 'done':
          return { icon: '✓', color: COLORS.SUCCESS }
        case 'in_progress':
          return { icon: '⟳', color: COLORS.WARNING }
        case 'todo':
          return { icon: '○', color: COLORS.INFO }
        case 'blocked':
          return { icon: '⚠', color: COLORS.DANGER }
        default:
          return { icon: '•', color: COLORS.TEXT }
      }
    }
    
    // Group tasks
    interface ProjectTasks {
      [projectName: string]: Array<{
        taskId: string
        taskTitle: string
        totalMinutes: number
        status?: string
      }>
    }
    
    const projectToTasks: ProjectTasks = {}
    const recurringTasks: Array<{
      taskId: string
      taskTitle: string
      totalMinutes: number
      status?: string
    }> = []
    
    // Build map
    data.timeTracking.byTask.forEach((task) => {
      const isRecurring = taskRecurringMap.get(task.taskId)
      
      if (isRecurring) {
        recurringTasks.push({
          taskId: task.taskId,
          taskTitle: task.taskTitle,
          totalMinutes: task.totalMinutes,
          status: taskStatusMap.get(task.taskId),
        })
      } else {
        const projectName = task.projectName || 'Nessun progetto'
        if (!projectToTasks[projectName]) {
          projectToTasks[projectName] = []
        }
        projectToTasks[projectName].push({
          taskId: task.taskId,
          taskTitle: task.taskTitle,
          totalMinutes: task.totalMinutes,
          status: taskStatusMap.get(task.taskId),
        })
      }
    })
    
    // Calculate project totals
    const projectTotals = new Map<string, number>()
    data.timeTracking.byTask.forEach((task) => {
      const isRecurring = taskRecurringMap.get(task.taskId)
      if (!isRecurring) {
        const projectName = task.projectName || 'Nessun progetto'
        projectTotals.set(projectName, (projectTotals.get(projectName) || 0) + task.totalMinutes)
      }
    })
    
    // Render projects
    Array.from(projectTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([projectName, totalMinutes]) => {
        checkPageBreak(15)
        
        // PROJECT HEADER with colored background
        pdf.setFillColor(COLORS.PRIMARY)
        pdf.rect(margin - 2, yPos - 2, contentWidth + 4, 8, 'F')
        
        pdf.setFontSize(FONT_SIZE.BODY)
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        const projectHours = formatHours(totalMinutes)
        pdf.text(`📁 ${projectName}`, margin, yPos + 4)
        pdf.text(`${projectHours}h`, margin + contentWidth - 5, yPos + 4, { align: 'right' })
        yPos += 11
        
        // TASKS
        const tasks = projectToTasks[projectName] || []
        tasks.forEach((task) => {
          const taskEntries = getTaskTimeEntries(task.taskId)
          const hasEntries = taskEntries.length > 0
          checkPageBreak(hasEntries ? 20 : 8)
          
          // Task item background (alternating light gray)
          pdf.setFillColor(COLORS.BG_LIGHT)
          pdf.rect(margin + 2, yPos - 1, contentWidth - 4, 6, 'F')
          
          let xOffset = margin + 4
          
          // Status icon
          if (task.status) {
            const statusDisplay = getStatusDisplay(task.status)
            pdf.setFontSize(FONT_SIZE.BODY)
            pdf.setTextColor(statusDisplay.color)
            pdf.setFont('helvetica', 'bold')
            pdf.text(statusDisplay.icon, xOffset, yPos + 3)
            xOffset += 6
          }
          
          // Task name
          pdf.setFontSize(FONT_SIZE.SMALL)
          pdf.setTextColor(COLORS.TEXT)
          pdf.setFont('helvetica', 'normal')
          const taskHours = formatHours(task.totalMinutes)
          const maxTaskLength = 50
          const taskText = task.taskTitle.length > maxTaskLength 
            ? task.taskTitle.substring(0, maxTaskLength) + '...' 
            : task.taskTitle
          pdf.text(taskText, xOffset, yPos + 3)
          
          // Hours on the right
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(COLORS.PRIMARY)
          pdf.text(`${taskHours}h`, margin + contentWidth - 5, yPos + 3, { align: 'right' })
          
          yPos += 7
          
          // Time entries (compact format)
          if (hasEntries) {
            const entriesByDate = new Map<string, { totalMinutes: number; notes: string[] }>()
            
            taskEntries.forEach((entry) => {
              const entryDate = new Date(entry.startTime).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit'
              })
              
              if (!entriesByDate.has(entryDate)) {
                entriesByDate.set(entryDate, { totalMinutes: 0, notes: [] })
              }
              
              const dayData = entriesByDate.get(entryDate)!
              dayData.totalMinutes += entry.duration || 0
              
              if (entry.description && entry.description.trim()) {
                dayData.notes.push(entry.description.trim())
              }
            })
            
            // Display entries
            Array.from(entriesByDate.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .forEach(([date, entryData]) => {
                checkPageBreak(5)
                
                pdf.setFontSize(FONT_SIZE.TINY)
                pdf.setTextColor(COLORS.TEXT_LIGHTER)
                pdf.setFont('helvetica', 'normal')
                
                const dayHours = formatHours(entryData.totalMinutes)
                let entryText = `      ${date}: ${dayHours}h`
                
                if (entryData.notes.length > 0) {
                  const notesText = entryData.notes.join('; ')
                  entryText += ` - ${notesText}`
                }
                
                const splitText = pdf.splitTextToSize(entryText, contentWidth - 15)
                splitText.forEach((line: string) => {
                  checkPageBreak(3)
                  pdf.text(line, margin + 10, yPos)
                  yPos += 3
                })
              })
          }
          
          yPos += 1
        })
        yPos += 5
      })
    
    // RECURRING TASKS
    if (recurringTasks.length > 0) {
      const recurringTotalMinutes = recurringTasks.reduce((sum, task) => sum + task.totalMinutes, 0)
      
      checkPageBreak(15)
      
      pdf.setFillColor(COLORS.PURPLE)
      pdf.rect(margin - 2, yPos - 2, contentWidth + 4, 8, 'F')
      
      pdf.setFontSize(FONT_SIZE.BODY)
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      const recurringHours = formatHours(recurringTotalMinutes)
      pdf.text(`🔄 Task Ricorrenti`, margin, yPos + 4)
      pdf.text(`${recurringHours}h`, margin + contentWidth - 5, yPos + 4, { align: 'right' })
      yPos += 11
      
      recurringTasks.forEach((task) => {
        const taskEntries = getTaskTimeEntries(task.taskId)
        const hasEntries = taskEntries.length > 0
        checkPageBreak(hasEntries ? 20 : 8)
        
        pdf.setFillColor(COLORS.BG_LIGHT)
        pdf.rect(margin + 2, yPos - 1, contentWidth - 4, 6, 'F')
        
        let xOffset = margin + 4
        
        if (task.status) {
          const statusDisplay = getStatusDisplay(task.status)
          pdf.setFontSize(FONT_SIZE.BODY)
          pdf.setTextColor(statusDisplay.color)
          pdf.setFont('helvetica', 'bold')
          pdf.text(statusDisplay.icon, xOffset, yPos + 3)
          xOffset += 6
        }
        
        pdf.setFontSize(FONT_SIZE.SMALL)
        pdf.setTextColor(COLORS.TEXT)
        pdf.setFont('helvetica', 'normal')
        const taskHours = formatHours(task.totalMinutes)
        const taskText = task.taskTitle.length > 50 
          ? task.taskTitle.substring(0, 50) + '...' 
          : task.taskTitle
        pdf.text(taskText, xOffset, yPos + 3)
        
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(COLORS.PURPLE)
        pdf.text(`${taskHours}h`, margin + contentWidth - 5, yPos + 3, { align: 'right' })
        
        yPos += 7
        
        if (hasEntries) {
          const entriesByDate = new Map<string, { totalMinutes: number; notes: string[] }>()
          
          taskEntries.forEach((entry) => {
            const entryDate = new Date(entry.startTime).toLocaleDateString('it-IT', {
              day: '2-digit',
              month: '2-digit'
            })
            
            if (!entriesByDate.has(entryDate)) {
              entriesByDate.set(entryDate, { totalMinutes: 0, notes: [] })
            }
            
            const dayData = entriesByDate.get(entryDate)!
            dayData.totalMinutes += entry.duration || 0
            
            if (entry.description && entry.description.trim()) {
              dayData.notes.push(entry.description.trim())
            }
          })
          
          Array.from(entriesByDate.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([date, entryData]) => {
              checkPageBreak(5)
              
              pdf.setFontSize(FONT_SIZE.TINY)
              pdf.setTextColor(COLORS.TEXT_LIGHTER)
              pdf.setFont('helvetica', 'normal')
              
              const dayHours = formatHours(entryData.totalMinutes)
              let entryText = `      ${date}: ${dayHours}h`
              
              if (entryData.notes.length > 0) {
                const notesText = entryData.notes.join('; ')
                entryText += ` - ${notesText}`
              }
              
              const splitText = pdf.splitTextToSize(entryText, contentWidth - 15)
              splitText.forEach((line: string) => {
                checkPageBreak(3)
                pdf.text(line, margin + 10, yPos)
                yPos += 3
              })
            })
        }
        
        yPos += 1
      })
      yPos += 5
    }
    
    yPos += 5
  }

  // ========================================
  // BLOCKED TASKS (CRITICAL SECTION)
  // ========================================
  
  if (blockedTasks.length > 0) {
    checkPageBreak(20)
    
    // Alert header with gradient
    drawGradientBox(
      pdf,
      margin - 5,
      yPos - 3,
      contentWidth + 10,
      12,
      COLORS.DANGER,
      COLORS.DANGER_DARK,
      true
    )
    
    pdf.setFontSize(FONT_SIZE.HEADING)
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`⚠ ELEMENTI BLOCCATI (${blockedTasks.length})`, margin, yPos + 5)
    
    yPos += 15
    
    // Group by project
    const blockedByProject = blockedTasks.reduce((acc, task) => {
      const projectKey = task.projectName || 'Nessun progetto'
      if (!acc[projectKey]) {
        acc[projectKey] = []
      }
      acc[projectKey].push(task)
      return acc
    }, {} as Record<string, typeof blockedTasks>)
    
    Object.entries(blockedByProject).forEach(([projectName, tasks]) => {
      checkPageBreak(15)
      
      pdf.setFontSize(FONT_SIZE.BODY)
      pdf.setTextColor(COLORS.PRIMARY)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${projectName} (${tasks.length})`, margin, yPos)
      yPos += 7
      
      tasks.forEach((task) => {
        checkPageBreak(22)
        
        const boxHeight = task.lastComment ? 20 : 15
        
        // Danger box with strong border
        pdf.setDrawColor(COLORS.DANGER)
        pdf.setLineWidth(1.5)
        pdf.setFillColor('#fee2e2')
        pdf.roundedRect(margin + 3, yPos - 2, contentWidth - 6, boxHeight, 2, 2, 'FD')
        
        // Warning icon
        pdf.setFontSize(FONT_SIZE.SUBTITLE)
        pdf.setTextColor(COLORS.DANGER)
        pdf.setFont('helvetica', 'bold')
        pdf.text('⚠', margin + 6, yPos + 4)
        
        // Title
        pdf.setFontSize(FONT_SIZE.BODY)
        pdf.setTextColor(COLORS.TEXT)
        pdf.setFont('helvetica', 'bold')
        const taskText = task.title.length > 60 ? task.title.substring(0, 60) + '...' : task.title
        pdf.text(taskText, margin + 14, yPos + 4)
        yPos += 6
        
        // Info line
        pdf.setFontSize(FONT_SIZE.TINY)
        pdf.setTextColor(COLORS.TEXT_LIGHT)
        pdf.setFont('helvetica', 'normal')
        
        let infoText = ''
        if (task.assigneeName) {
          infoText += `👤 ${task.assigneeName}`
        }
        if (task.blockedSince) {
          const blockedDate = new Date(task.blockedSince)
          const daysSince = Math.floor((Date.now() - blockedDate.getTime()) / (1000 * 60 * 60 * 24))
          if (infoText) infoText += ' • '
          infoText += `⏱ Bloccato da ${daysSince} giorni`
        }
        
        if (infoText) {
          pdf.text(infoText, margin + 14, yPos + 2)
          yPos += 5
        }
        
        // Comment
        if (task.lastComment) {
          pdf.setFont('helvetica', 'italic')
          pdf.setTextColor(COLORS.TEXT_LIGHT)
          const commentText = task.lastComment.substring(0, 90) + (task.lastComment.length > 90 ? '...' : '')
          const splitComment = pdf.splitTextToSize(`💬 "${commentText}"`, contentWidth - 25)
          pdf.text(splitComment[0], margin + 14, yPos + 2)
          yPos += 5
        }
        
        yPos += 3
        pdf.setLineWidth(0.5) // Reset
      })
      
      yPos += 3
    })
    
    yPos += 5
  }

  // ========================================
  // FOOTER WITH PAGE NUMBERS
  // ========================================
  
  const totalPages = (pdf as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    
    // Footer line
    pdf.setDrawColor(COLORS.BORDER)
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)
    
    // Page number
    pdf.setFontSize(FONT_SIZE.SMALL)
    pdf.setTextColor(COLORS.TEXT_LIGHT)
    pdf.setFont('helvetica', 'normal')
    pdf.text(
      `Pagina ${i} di ${totalPages}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    )
    
    // Timestamp (only on pages after cover)
    if (i > 1) {
      pdf.setFontSize(FONT_SIZE.TINY)
      pdf.setTextColor(COLORS.TEXT_LIGHTER)
      pdf.text(
        `Generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
        pageWidth - margin,
        pageHeight - 7,
        { align: 'right' }
      )
    }
  }

  // ========================================
  // SAVE FILE
  // ========================================
  
  const fileName = `report_settimana_${data.weekNumber}_${data.year}_${data.userName.replace(/\s+/g, '_')}.pdf`
    pdf.save(fileName)

    onProgress?.(100)
    logger.success(`Weekly report exported: ${fileName}`)

    return {
      success: true,
      filename: fileName,
    }
  } catch (error) {
    logger.error('Weekly report export failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
