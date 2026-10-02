const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * adminDeleteInterviewExperience — admin moderation delete
 * No ownership scoping — any admin can remove any post.
 * 404 if not found, then delete (rounds cascade).
 */
async function adminDeleteInterviewExperience(req, res, next) {
  try {
    const experience = await prisma.interviewExperience.findUnique({
      where: { id: req.params.id },
    });

    if (!experience) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    await prisma.interviewExperience.delete({
      where: { id: req.params.id },
    });

    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminDeleteInterviewExperience: asyncHandler(adminDeleteInterviewExperience),
};