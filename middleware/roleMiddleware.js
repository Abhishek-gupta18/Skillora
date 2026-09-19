const { prisma } = require('../config/prisma');

/**
 * Middleware factory: requireRole(allowedRoles)
 * 
 * Safer design: queries the DB for the user's CURRENT role rather than
 * trusting whatever string is embedded in the JWT payload. The existing
 * authController.js signs tokens with `{ id, type: 'candidate' }` (lowercase
 * string), which is a mismatch against the Prisma enum values
 * (CANDIDATE/ADMIN). Looking up from DB avoids issues with already-issued
 * tokens and ensures we always check the authoritative source.
 * 
 * Usage: router.use(authenticate, requireRole(['ADMIN']))
 */
function requireRole(allowedRoles) {
  return async function (req, res, next) {
    // req.user is set by authenticate middleware via jwt.verify()
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Look up the user's current role from the DB (authoritative source)
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (!user) {
      // User record gone (e.g. deleted after token issued)
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this resource",
      });
    }

    next();
  };
}

module.exports = { requireRole };