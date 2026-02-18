/**
 * Email Service - Sends transactional emails via nodemailer
 * Gracefully disabled when SMTP_HOST is not configured.
 * @module services/emailService
 */

import { logger } from '../utils/logger.js'

// Dynamic import to avoid hard dependency at startup
type Transporter = import('nodemailer').Transporter

let transporter: Transporter | null = null
let emailEnabled = false

/**
 * Initialize the nodemailer transporter.
 * Called once at server startup — safe to call even when nodemailer is absent.
 */
export async function initEmailService(): Promise<void> {
  const host = process.env.SMTP_HOST
  if (!host) {
    logger.info('Email service disabled (SMTP_HOST not set)')
    return
  }

  try {
    const nodemailer = await import('nodemailer')
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || '',
          }
        : undefined,
    })

    await transporter.verify()
    emailEnabled = true
    logger.info(`Email service ready (host: ${host})`)
  } catch (err) {
    logger.warn('Email service unavailable — continuing without email', { err })
    transporter = null
    emailEnabled = false
  }
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

const FROM_ADDRESS = process.env.SMTP_FROM || 'ProjectPulse <noreply@projectpulse.local>'

/**
 * Sends an email. Silently skips if SMTP is not configured.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!emailEnabled || !transporter) {
    return false
  }

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    return true
  } catch (err) {
    logger.error('Failed to send email', { err, subject: options.subject })
    return false
  }
}

// ─── HTML Templates ──────────────────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; margin: 0; padding: 0; }
    .wrapper { max-width: 580px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px 32px; }
    .header h1 { margin: 0; color: #fff; font-size: 20px; font-weight: 700; }
    .header p { margin: 4px 0 0; color: rgba(255,255,255,.8); font-size: 13px; }
    .body { padding: 28px 32px; }
    .body p { color: #374151; line-height: 1.6; font-size: 14px; margin: 0 0 12px; }
    .alert { border-left: 4px solid #ef4444; background: #fef2f2; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .alert.warning { border-color: #f59e0b; background: #fffbeb; }
    .alert.info { border-color: #6366f1; background: #eef2ff; }
    .btn { display: inline-block; background: #6366f1; color: #fff !important; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 8px 0; }
    .footer { padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #374151; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>ProjectPulse</h1>
      <p>Notifica automatica</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      <p>Questo messaggio è stato inviato da ProjectPulse. Non rispondere a questa email.</p>
    </div>
  </div>
</body>
</html>`
}

// ─── Typed Email Senders ──────────────────────────────────────────────────────

export interface TaskDueSoonPayload {
  userEmail: string
  userName: string
  tasks: Array<{ code: string; title: string; projectName: string; dueDate: string; daysLeft: number }>
}

export async function sendTaskDueSoonEmail(payload: TaskDueSoonPayload): Promise<boolean> {
  const rows = payload.tasks
    .map(
      (t) => `<tr>
        <td>${t.code}</td>
        <td>${t.title}</td>
        <td>${t.projectName}</td>
        <td style="color:${t.daysLeft <= 1 ? '#ef4444' : '#f59e0b'}; font-weight:600;">${t.daysLeft <= 0 ? 'Scaduto' : `${t.daysLeft}g`}</td>
      </tr>`
    )
    .join('')

  const body = `
    <p>Ciao <strong>${payload.userName}</strong>,</p>
    <p>I seguenti task sono in scadenza o già scaduti:</p>
    <table>
      <thead><tr><th>Codice</th><th>Task</th><th>Progetto</th><th>Scadenza</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Accedi a ProjectPulse per aggiornarli.</p>`

  return sendEmail({
    to: payload.userEmail,
    subject: `[ProjectPulse] ${payload.tasks.length} task in scadenza`,
    html: baseTemplate(`${payload.tasks.length} task in scadenza`, body),
    text: `${payload.tasks.length} task in scadenza per ${payload.userName}. Accedi a ProjectPulse.`,
  })
}

export interface CriticalRiskPayload {
  userEmail: string
  userName: string
  risks: Array<{ code: string; title: string; projectName: string; severity: string }>
}

export async function sendCriticalRiskEmail(payload: CriticalRiskPayload): Promise<boolean> {
  const rows = payload.risks
    .map(
      (r) => `<tr>
        <td>${r.code}</td>
        <td>${r.title}</td>
        <td>${r.projectName}</td>
        <td style="color:#ef4444; font-weight:600;">${r.severity}</td>
      </tr>`
    )
    .join('')

  const body = `
    <p>Ciao <strong>${payload.userName}</strong>,</p>
    <div class="alert">
      <strong>⚠️ Rischi critici aperti nel tuo progetto</strong>
    </div>
    <table>
      <thead><tr><th>Codice</th><th>Rischio</th><th>Progetto</th><th>Severità</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Accedi a ProjectPulse per gestire i rischi.</p>`

  return sendEmail({
    to: payload.userEmail,
    subject: `[ProjectPulse] ⚠️ ${payload.risks.length} rischio/i critico/i`,
    html: baseTemplate('Rischi critici', body),
    text: `${payload.risks.length} rischi critici aperti. Accedi a ProjectPulse.`,
  })
}

export interface BlockedTaskPayload {
  userEmail: string
  userName: string
  tasks: Array<{ code: string; title: string; projectName: string; blockedSinceDays: number }>
}

export async function sendBlockedTaskEmail(payload: BlockedTaskPayload): Promise<boolean> {
  const rows = payload.tasks
    .map(
      (t) => `<tr>
        <td>${t.code}</td>
        <td>${t.title}</td>
        <td>${t.projectName}</td>
        <td style="color:#ef4444;">${t.blockedSinceDays}g</td>
      </tr>`
    )
    .join('')

  const body = `
    <p>Ciao <strong>${payload.userName}</strong>,</p>
    <div class="alert">
      <strong>🚫 Task bloccati da più di 24 ore</strong>
    </div>
    <table>
      <thead><tr><th>Codice</th><th>Task</th><th>Progetto</th><th>Bloccato da</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Accedi a ProjectPulse per sbloccarli.</p>`

  return sendEmail({
    to: payload.userEmail,
    subject: `[ProjectPulse] 🚫 ${payload.tasks.length} task bloccato/i`,
    html: baseTemplate('Task bloccati', body),
    text: `${payload.tasks.length} task bloccati. Accedi a ProjectPulse.`,
  })
}
