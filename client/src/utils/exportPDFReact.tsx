/**
 * React-PDF Export Utility
 * @module utils/exportPDFReact
 *
 * Generate and download PDF reports using @react-pdf/renderer
 * Modern, professional PDF output with all charts and statistics
 */

import { pdf } from '@react-pdf/renderer'
import { WeeklyReportPDF } from '@components/pdf/WeeklyReportPDF'
import type { WeeklyReportData } from '@/types'

interface PDFExportResult {
  success: boolean
  filename?: string
  error?: string
}

/**
 * Export weekly report to PDF using React-PDF
 *
 * @param data - Weekly report data
 * @param selectedUserId - Optional user filter for team reports
 * @returns Result object with success status and filename/error
 */
export async function exportWeeklyReportReactPDF(
  data: WeeklyReportData,
  selectedUserId?: string | null
): Promise<PDFExportResult> {
  try {
    // Create PDF document component
    const pdfDoc = <WeeklyReportPDF data={data} selectedUserId={selectedUserId} />

    // Generate blob
    const blob = await pdf(pdfDoc).toBlob()

    // Generate filename
    const userName = selectedUserId
      ? data.timeTracking.byUser?.find(u => u.userId === selectedUserId)?.userName.replace(/\s+/g, '_')
      : data.userName.replace(/\s+/g, '_')

    const filename = `Report_Settimana${data.weekNumber}_${data.year}${userName ? `_${userName}` : ''}.pdf`

    // Download
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Cleanup immediately - browser has already cloned the blob
    URL.revokeObjectURL(url)

    return {
      success: true,
      filename,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during PDF generation',
    }
  }
}

/**
 * Preview PDF in new tab
 * Opens the PDF in browser instead of downloading
 *
 * @param data - Weekly report data
 * @param selectedUserId - Optional user filter
 */
export async function previewWeeklyReportPDF(
  data: WeeklyReportData,
  selectedUserId?: string | null
): Promise<PDFExportResult> {
  try {
    const pdfDoc = <WeeklyReportPDF data={data} selectedUserId={selectedUserId} />

    // Generate blob
    const blob = await pdf(pdfDoc).toBlob()

    // Open in new tab
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')

    // Cleanup after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000)

    return {
      success: true,
      filename: 'preview',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during PDF preview',
    }
  }
}
