const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * listSkills — master skill list (name + category) for dropdowns.
 * Used by candidates (claiming skills) and admins (job required skills),
 * so it requires authentication only — no role or profile needed.
 * Sorted by category, then name, so grouped dropdowns read naturally.
 */
async function listSkills(req, res, next) {
  try {
    const skills = await prisma.skill.findMany({
      select: { id: true, name: true, category: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return res.status(200).json({ success: true, data: skills });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSkills: asyncHandler(listSkills) };
