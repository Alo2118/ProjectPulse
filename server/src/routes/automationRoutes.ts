/**
 * Automation Routes - Feature 4.4: Automation Engine
 *
 * Global automation management (admin / direzione only):
 *   GET    /api/automations                - List all automation rules
 *   GET    /api/automations/templates      - List predefined templates
 *   GET    /api/automations/registry       - V2 registry metadata (triggers, conditions, actions)
 *   GET    /api/automations/:id            - Get single rule
 *   GET    /api/automations/:id/logs       - Get execution logs
 *   POST   /api/automations                - Create rule
 *   POST   /api/automations/from-template  - Create rule from predefined template
 *   PUT    /api/automations/:id            - Update rule
 *   DELETE /api/automations/:id            - Soft-delete rule
 *
 * Project-scoped routes (any authenticated user; capability enforced in controller):
 *   GET    /api/projects/:projectId/automations - List project rules
 *   POST   /api/projects/:projectId/automations - Create project rule
 */

import { Router } from 'express'
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js'
import * as automationController from '../controllers/automationController.js'

const router = Router({ mergeParams: true })

router.use(authMiddleware)

// ── Global automation CRUD (admin / direzione) ─────────────────────────────

router.get(
  '/automations',
  requireRole('admin', 'direzione'),
  automationController.getAutomations
)

// Template routes MUST be registered before '/:id' routes to avoid param collision
router.get(
  '/automations/templates',
  requireRole('admin', 'direzione'),
  automationController.getAutomationTemplatesHandler
)

router.post(
  '/automations/from-template',
  requireRole('admin', 'direzione'),
  automationController.createFromTemplateHandler
)

router.get(
  '/automations/registry',
  requireRole('admin', 'direzione'),
  automationController.getRegistryMetadata
)

// ── Recommendations (admin / direzione) ─────────────────────────────────────

router.get(
  '/automations/recommendations',
  requireRole('admin', 'direzione'),
  automationController.getRecommendationsHandler
)

router.post(
  '/automations/recommendations/generate',
  requireRole('admin'),
  automationController.generateRecommendationsHandler
)

router.post(
  '/automations/recommendations/:id/apply',
  requireRole('admin', 'direzione'),
  automationController.applyRecommendationHandler
)

router.post(
  '/automations/recommendations/:id/dismiss',
  requireRole('admin', 'direzione'),
  automationController.dismissRecommendationHandler
)

// ── Packages (admin / direzione) ────────────────────────────────────────────

router.get(
  '/automations/packages',
  requireRole('admin', 'direzione'),
  automationController.getPackagesHandler
)

router.post(
  '/automations/packages/:key/activate',
  requireRole('admin', 'direzione'),
  automationController.activatePackageHandler
)

router.patch(
  '/automations/:id/toggle',
  requireRole('admin', 'direzione'),
  automationController.toggleAutomation
)

router.get(
  '/automations/:id',
  requireRole('admin', 'direzione'),
  automationController.getAutomation
)

router.get(
  '/automations/:id/logs',
  requireRole('admin', 'direzione'),
  automationController.getAutomationLogs
)

router.post(
  '/automations',
  requireRole('admin', 'direzione'),
  automationController.createAutomation
)

router.patch(
  '/automations/:id',
  requireRole('admin', 'direzione'),
  automationController.updateAutomation
)

router.delete(
  '/automations/:id',
  requireRole('admin', 'direzione'),
  automationController.deleteAutomation
)

// ── Project-scoped routes (capability checked inside controller) ───────────

router.get(
  '/projects/:projectId/automations',
  automationController.getProjectAutomations
)

router.post(
  '/projects/:projectId/automations',
  automationController.createProjectAutomation
)

export default router
