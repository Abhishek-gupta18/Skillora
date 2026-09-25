const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { streamResumeToResponse } = require('./resumeController');

async function listJobApplicants(req, res, next) {
  try {
    const { jobId } = req.params;

    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    const applications = await prisma.application.findMany({
      where: { jobPostingId: jobId },
      include: {
        profile: {
          include: {
            basicInfo: { select: { name: true } },
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    const data = applications.map(app => ({
      id: app.id,
      status: app.status,
      coverNote: app.coverNote,
      appliedAt: app.appliedAt,
      statusUpdatedAt: app.statusUpdatedAt,
      candidateName: app.profile?.basicInfo?.name ?? null,
      candidateEmail: app.profile?.user?.email ?? null,
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updateApplicationStatus(req, res, next) {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status === 'WITHDRAWN') {
      return res.status(409).json({
        success: false,
        message: 'Cannot update a withdrawn application',
      });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: req.body.status,
        statusUpdatedAt: new Date(),
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function downloadApplicantResume(req, res, next) {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    return streamResumeToResponse(res, application.profileId);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listJobApplicants: asyncHandler(listJobApplicants),
  updateApplicationStatus: asyncHandler(updateApplicationStatus),
  downloadApplicantResume: asyncHandler(downloadApplicantResume),
};