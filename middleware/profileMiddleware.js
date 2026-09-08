const { prisma } = require('../config/prisma');

async function attachProfile(req, res, next) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, userId: true, createdAt: true, updatedAt: true },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    req.profile = profile;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { attachProfile };
