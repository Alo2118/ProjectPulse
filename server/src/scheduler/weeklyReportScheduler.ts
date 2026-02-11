/**
 * Weekly Report Scheduler - Sends Friday reminders to generate reports
 * @module scheduler/weeklyReportScheduler
 */

import { prisma } from '../models/prismaClient.js'
import { notificationService } from '../services/notificationService.js'
import { logger } from '../utils/logger.js'

let schedulerInterval: NodeJS.Timeout | null = null
let lastReminderSent: string | null = null // Track to avoid duplicate sends

/**
 * Checks if current time is Friday at 17:00 (5 PM)
 */
function isFridayReportTime(): boolean {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 5 = Friday
  const hour = now.getHours()

  return day === 5 && hour === 17
}

/**
 * Gets unique key for today's reminder (to prevent duplicates)
 */
function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

/**
 * Sends weekly report reminders to all active users
 */
async function sendFridayReminders(): Promise<void> {
  const todayKey = getTodayKey()

  // Prevent sending multiple times on the same day
  if (lastReminderSent === todayKey) {
    return
  }

  logger.info('Sending weekly report reminders')

  try {
    // Get all active users
    const users = await prisma.user.findMany({
      where: { isActive: true, isDeleted: false },
      select: { id: true, email: true, firstName: true },
    })

    let sentCount = 0

    for (const user of users) {
      try {
        await notificationService.createNotification({
          userId: user.id,
          type: 'weekly_report_reminder',
          title: 'Promemoria Report Settimanale',
          message: `Ciao ${user.firstName}! È venerdì, ricordati di generare il tuo report settimanale.`,
          data: { action: 'generate_report', url: '/reports/weekly' },
        })
        sentCount++
      } catch (error) {
        logger.error(`Failed to send reminder to user ${user.email}`, { error })
      }
    }

    lastReminderSent = todayKey
    logger.info(`Weekly report reminders sent to ${sentCount} users`)
  } catch (error) {
    logger.error('Failed to send weekly report reminders', { error })
  }
}

/**
 * Scheduler tick - runs every hour to check if it's time to send reminders
 */
async function schedulerTick(): Promise<void> {
  if (isFridayReportTime()) {
    await sendFridayReminders()
  }
}

/**
 * Initializes the weekly report scheduler
 * Checks every hour if it's Friday at 5 PM
 */
export function initWeeklyReportScheduler(): void {
  // Check every hour (3600000 ms)
  schedulerInterval = setInterval(schedulerTick, 60 * 60 * 1000)

  // Also do an immediate check
  schedulerTick()

  logger.info('Weekly report scheduler initialized')
}

/**
 * Stops the scheduler
 */
export function stopWeeklyReportScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
    logger.info('Weekly report scheduler stopped')
  }
}

/**
 * Manually trigger reminders (for testing or admin use)
 */
export async function triggerRemindersManually(): Promise<number> {
  logger.info('Manually triggering weekly report reminders')

  const users = await prisma.user.findMany({
    where: { isActive: true, isDeleted: false },
    select: { id: true, email: true, firstName: true },
  })

  let sentCount = 0

  for (const user of users) {
    try {
      await notificationService.createNotification({
        userId: user.id,
        type: 'weekly_report_reminder',
        title: 'Promemoria Report Settimanale',
        message: `Ciao ${user.firstName}! Ricordati di generare il tuo report settimanale.`,
        data: { action: 'generate_report', url: '/reports/weekly' },
      })
      sentCount++
    } catch (error) {
      logger.error(`Failed to send reminder to user ${user.email}`, { error })
    }
  }

  return sentCount
}
