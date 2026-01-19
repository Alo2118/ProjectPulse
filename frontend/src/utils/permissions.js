/**
 * Permission utility functions for ProjectPulse (Frontend)
 *
 * Role Permissions:
 * - amministratore: Can modify EVERYTHING (all records, even created by others, including users)
 * - dipendente: Can modify EVERYTHING EXCEPT user management
 * - direzione: Can only VIEW (read-only), EXCEPT inbox where they can create/modify requests
 */

/**
 * Check if user can modify a resource
 * @param {Object} user - Current user object {id, role}
 * @param {Object} resource - Resource to check {created_by}
 * @param {String} resourceType - Type of resource (optional, for special cases like 'request')
 * @returns {Boolean}
 */
export const canModify = (user, resource, resourceType = null) => {
  if (!user) return false;

  // Amministratore can modify everything
  if (user.role === 'amministratore') {
    return true;
  }

  // Dipendente can modify everything except users
  if (user.role === 'dipendente') {
    if (resourceType === 'user') return false;
    return true;
  }

  // Direzione can only modify requests (inbox items)
  if (user.role === 'direzione') {
    return resourceType === 'request';
  }

  return false;
};

/**
 * Check if user can delete a resource
 * Same logic as canModify
 */
export const canDelete = (user, resource, resourceType = null) => {
  return canModify(user, resource, resourceType);
};

/**
 * Check if user can create a resource
 * @param {Object} user - Current user object {id, role}
 * @param {String} resourceType - Type of resource
 * @returns {Boolean}
 */
export const canCreate = (user, resourceType = null) => {
  if (!user) return false;

  // Amministratore can create everything
  if (user.role === 'amministratore') {
    return true;
  }

  // Dipendente can create anything except users
  if (user.role === 'dipendente') {
    return resourceType !== 'user';
  }

  // Direzione can only create requests
  if (user.role === 'direzione') {
    return resourceType === 'request';
  }

  return false;
};

/**
 * Check if user can view a resource (read-only)
 * All roles can view everything
 */
export const canView = (user) => {
  return !!user;
};

/**
 * Check if user can access templates
 * @param {Object} user - Current user object {role}
 * @returns {Boolean}
 */
export const canAccessTemplates = (user) => {
  if (!user) return false;
  // Direzione cannot access templates
  return user.role !== 'direzione';
};

/**
 * Check if user can access user management
 * @param {Object} user - Current user object {role}
 * @returns {Boolean}
 */
export const canAccessUserManagement = (user) => {
  if (!user) return false;
  // Only amministratore can manage users
  return user.role === 'amministratore';
};

/**
 * Check if user can access a page/route
 * @param {Object} user - Current user object {role}
 * @param {String} route - Route name
 * @returns {Boolean}
 */
export const canAccessRoute = (user, route) => {
  if (!user) return false;

  // Amministratore can access everything
  if (user.role === 'amministratore') return true;

  // Routes that direzione CANNOT access
  const direzioneForbidden = ['templates', 'template-manager', 'users'];

  if (user.role === 'direzione' && direzioneForbidden.includes(route)) {
    return false;
  }

  // Dipendente cannot access user management
  if (user.role === 'dipendente' && route === 'users') {
    return false;
  }

  return true;
};
