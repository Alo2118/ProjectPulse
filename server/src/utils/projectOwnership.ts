/**
 * Project Ownership Helper - Centralized authorization check for project ownership
 * @module utils/projectOwnership
 */

import { assertProjectCapability } from '../services/permissionService.js'
import type { ProjectCapability } from '../types/index.js'

/**
 * Asserts that the current user has a capability on a project.
 * Delegates to the granular permission service.
 * Default capability: 'edit_project' (backward compatible).
 *
 * @throws AppError 404 if project not found
 * @throws AppError 403 if user lacks the required capability
 */
export async function assertProjectOwnership(
  projectId: string,
  userId: string,
  userRole: string | undefined,
  capability: ProjectCapability = 'edit_project'
): Promise<void> {
  await assertProjectCapability(userId, userRole ?? '', projectId, capability)
}
