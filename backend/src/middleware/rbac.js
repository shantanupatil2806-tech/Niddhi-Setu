const { ROLES } = require('../config/constants');

/**
 * Middleware to restrict route access to specific user roles
 * Supports granular department clearance roles as well as general officer/admin roles
 * @param  {...string} roles - Permitted roles (e.g. 'admin', 'officer', 'institution', 'officer_pgrc', etc.)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    // Direct match
    if (roles.includes(userRole)) {
      return next();
    }

    // Role hierarchy:
    // If 'officer' is accepted, any department-specific officer role qualifies
    if (roles.includes(ROLES.OFFICER) && userRole.startsWith('officer')) {
      return next();
    }

    // Admin has governance access across officer actions unless explicitly restricted
    if (userRole === ROLES.ADMIN && roles.some(r => r.startsWith('officer') || r === ROLES.OFFICER)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access forbidden: Permitted roles are [${roles.join(', ')}]. Current role is '${userRole}'.`
    });
  };
};

/**
 * Middleware ensuring institution users only access their assigned institution records
 * Officers and Admins bypass this check.
 * @param {string} paramKey - Request parameter containing institutionId ('id', 'institutionId')
 */
const requireInstitutionAccess = (paramKey = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Admins and Officers have global oversight access
    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.OFFICER) {
      return next();
    }

    if (req.user.role === ROLES.INSTITUTION) {
      const requestedInstId =
        req.params[paramKey] ||
        req.query.institutionId ||
        (req.body && req.body.institutionId);

      if (requestedInstId && String(requestedInstId) !== String(req.user.institutionId)) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: You cannot access or modify records of another institution.'
        });
      }
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireInstitutionAccess
};
