function requireRole(allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this resource",
      });
    }

    next();
  };
}

module.exports = { requireRole };