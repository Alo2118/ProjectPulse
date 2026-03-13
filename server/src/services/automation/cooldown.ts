/**
 * Automation Engine V2 - Cooldown System
 * Prevents the same rule from firing on the same entity within the configured cooldown period.
 * Uses the AutomationCooldown model for persistence across restarts.
 * @module services/automation/cooldown
 */

import { prisma } from '../../models/prismaClient.js'
import { logger } from '../../utils/logger.js'
import { STALE_COOLDOWN_MS } from '../../constants/config.js'

/**
 * Checks whether a rule is still in cooldown for a specific entity.
 * Returns true if the rule has fired within the last `cooldownMinutes` minutes.
 * Returns false (not in cooldown) if cooldownMinutes is 0 or no record exists.
 */
export async function isInCooldown(
  ruleId: string,
  entityId: string,
  cooldownMinutes: number
): Promise<boolean> {
  if (cooldownMinutes <= 0) return false

  try {
    const record = await prisma.automationCooldown.findUnique({
      where: {
        ruleId_entityId: { ruleId, entityId },
      },
      select: { lastFiredAt: true },
    })

    if (!record) return false

    const cooldownMs = cooldownMinutes * 60 * 1000
    const elapsed = Date.now() - record.lastFiredAt.getTime()

    return elapsed < cooldownMs
  } catch (err) {
    logger.error('Cooldown check failed', { ruleId, entityId, error: err })
    // Conservative: if we can't check, allow the rule to fire
    return false
  }
}

/**
 * Records (upserts) a cooldown entry for a rule + entity pair.
 * Sets lastFiredAt to the current time.
 */
export async function recordCooldown(
  ruleId: string,
  entityId: string
): Promise<void> {
  try {
    await prisma.automationCooldown.upsert({
      where: {
        ruleId_entityId: { ruleId, entityId },
      },
      update: {
        lastFiredAt: new Date(),
      },
      create: {
        ruleId,
        entityId,
        lastFiredAt: new Date(),
      },
    })
  } catch (err) {
    logger.error('Cooldown record failed', { ruleId, entityId, error: err })
    // Non-critical: proceed even if cooldown recording fails
  }
}

/**
 * Removes stale cooldown records older than 7 days.
 * Intended to be called periodically (e.g. from the automation scheduler).
 */
export async function cleanupStaleCooldowns(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STALE_COOLDOWN_MS)

    const result = await prisma.automationCooldown.deleteMany({
      where: {
        lastFiredAt: { lt: cutoff },
      },
    })

    if (result.count > 0) {
      logger.info('Cleaned up stale cooldown records', { deleted: result.count })
    }
  } catch (err) {
    logger.error('Cooldown cleanup failed', { error: err })
  }
}
