const { ROLES } = require('../config/constants');

/**
 * Middleware to restrict route access to specific user roles
 * @param  {...string} roles - Permitted roles (e.g. 'admin', 'officer', 'institution')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access forbidden: Permitted roles are [${roles.join(', ')}]. Current role is '${req.user.role}'.`
      });
    }

    next();
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
