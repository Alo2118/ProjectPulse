/**
 * Email Action Executor - send_email
 * Sends an email to a resolved recipient. Falls back to logging if SMTP is not configured.
 * @module services/automation/actions/emailAction
 */

import { logger } from '../../../utils/logger.js'
import { interpolateMessage } from '../interpolation.js'
import type { ActionExecutor, AutomationContext } from '../types.js'

/**
 * Resolves a recipient identifier to an email address.
 * Accepts: 'assignee', 'owner', 'project_owner', or a userId string.
 */
async function resolveRecipientEmail(
  to: string,
  context: AutomationContext
): Promise<string | null> {
  if (to === 'assignee') return context.assignee?.email ?? null
  if (to === 'owner' || to === 'project_owner') return context.projectOwner?.email ?? null

  // Assume it's a userId -- look up email from the database
  if (to) {
    try {
      const { prisma } = await import('../../../models/prismaClient.js')
      const user = await prisma.user.findUnique({
        where: { id: to },
        select: { email: true },
      })
      return user?.email ?? null
    } catch (err) {
      logger.warn('resolveRecipientEmail: failed to look up user', { to, error: err })
      return null
    }
  }
  return null
}

/**
 * Sends an email notification.
 * Uses nodemailer if available and SMTP is configured.
 * Falls back to logging the email content for debugging purposes.
 * Params:
 *   - to: 'assignee' | 'owner' | 'project_owner' | userId string
 *   - subject?: string (supports interpolation)
 *   - body?: string (supports interpolation, rendered as HTML)
 */
export const sendEmailAction: ActionExecutor = {
  type: 'send_email',
  domain: '*',

  async execute(action, event, context, _fireEvent) {
    const to = action.params['to'] as string
    if (!to) {
      logger.warn('send_email: missing "to" param', { entityId: event.entityId })
      return
    }

    const subject = interpolateMessage(
      (action.params['subject'] as string) || 'Notifica automazione',
      context
    )
    const body = interpolateMessage((action.params['body'] as string) || '', context)

    const email = await resolveRecipientEmail(to, context)
    if (!email) {
      logger.warn('send_email: could not resolve recipient', {
        to,
        entityId: event.entityId,
      })
      return
    }

    // Try to use nodemailer if configured
    try {
      const nodemailer = await import('nodemailer')
      const transportConfig = {
        host: process.env['SMTP_HOST'] || 'localhost',
        port: Number(process.env['SMTP_PORT'] || 587),
        secure: process.env['SMTP_SECURE'] === 'true',
        auth: process.env['SMTP_USER']
          ? {
              user: process.env['SMTP_USER'],
              pass: process.env['SMTP_PASS'],
            }
          : undefined,
      }
      const transporter = nodemailer.createTransport(transportConfig)
      await transporter.sendMail({
        from: process.env['SMTP_FROM'] || 'noreply@projectpulse.local',
        to: email,
        subject,
        html: body || `<p>${subject}</p>`,
      })
      logger.info('Automation email sent', { to: email, subject })
    } catch (err) {
      // If nodemailer is not available or SMTP fails, log the email for debugging
      logger.warn('send_email: email delivery not configured, logging instead', {
        to: email,
        subject,
        body,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  },
}

/** All email action executors for bulk registration */
export const allEmailActions: ActionExecutor[] = [sendEmailAction]
