/**
 * Webhook Action Executor - webhook
 * Sends an HTTP POST request to an external URL with event data.
 * Includes a 10-second timeout to prevent blocking the automation pipeline.
 * @module services/automation/actions/webhookAction
 */

import { logger } from '../../../utils/logger.js'
import type { ActionExecutor } from '../types.js'

/**
 * Sends a webhook POST request to an external URL.
 * Params:
 *   - url: string (required) -- the target webhook URL
 *   - headers?: string (optional) -- JSON string of additional headers to merge
 */
export const webhookAction: ActionExecutor = {
  type: 'webhook',
  domain: '*',

  async execute(action, event, context, _fireEvent) {
    const url = action.params['url'] as string
    if (!url) {
      logger.warn('webhook: no URL provided', { entityId: event.entityId })
      return
    }

    let headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (action.params['headers']) {
      try {
        const extra = JSON.parse(action.params['headers'] as string) as Record<string, string>
        headers = { ...headers, ...extra }
      } catch {
        logger.warn('webhook: invalid headers JSON, using defaults', {
          entityId: event.entityId,
        })
      }
    }

    const body = {
      domain: context.domain,
      entityId: event.entityId,
      triggerType: event.type,
      projectId: context.projectId,
      timestamp: new Date().toISOString(),
      data: event.data,
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        logger.warn('webhook: non-OK response', {
          url,
          status: response.status,
          entityId: event.entityId,
        })
      } else {
        logger.info('webhook: request successful', {
          url,
          status: response.status,
          entityId: event.entityId,
        })
      }
    } catch (err) {
      logger.error('webhook: request failed', {
        url,
        entityId: event.entityId,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err // let the engine log it as an error in AutomationLog
    }
  },
}

/** All webhook action executors for bulk registration */
export const allWebhookActions: ActionExecutor[] = [webhookAction]
