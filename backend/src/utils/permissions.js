/**
 * Permission utility functions for ProjectPulse
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
 * Middleware to check modify permission
 */
export const requireModifyPermission = (resourceType = null) => {
  return (req, res, next) => {
    const user = req.user;
    const resource = req.resource; // Should be set by previous middleware

    if (!canModify(user, resource, resourceType)) {
      return res.status(403).json({
        error: 'Non hai i permessi per modificare questa risorsa'
      });
    }

    next();
  };
};

/**
 * Middleware to check delete permission
 */
export const requireDeletePermission = (resourceType = null) => {
  return (req, res, next) => {
    const user = req.user;
    const resource = req.resource; // Should be set by previous middleware

    if (!canDelete(user, resource, resourceType)) {
      return res.status(403).json({
        error: 'Non hai i permessi per eliminare questa risorsa'
      });
    }

    next();
  };
};

/**
 * Middleware to check create permission
 */
export const requireCreatePermission = (resourceType = null) => {
  return (req, res, next) => {
    const user = req.user;

    if (!canCreate(user, resourceType)) {
      return res.status(403).json({
        error: 'Non hai i permessi per creare questa risorsa'
      });
    }

    next();
  };
};
