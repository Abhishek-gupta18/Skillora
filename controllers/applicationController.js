const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * applyToJob — candidate applies to an OPEN job
 * Uses the same combined {id, status: 'OPEN'} query pattern as getOpenJob
 * so "doesn't exist" and "exists but not open" both return 404.
 * Status defaults to APPLIED per schema; never accepted from client.
 */
async function applyToJob(req, res, next) {
  try {
    const job = await prisma.jobPosting.findFirst({
      where: {
        id: req.params.id,
        status: 'OPEN',
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    try {
      const application = await prisma.application.create({
        data: {
          profileId: req.profile.id,
          jobPostingId: job.id,
          coverNote: req.body.coverNote,
        },
        include: {
          jobPosting: {
            include: {
              company: { select: { name: true } },
            },
          },
        },
      });

      return res.status(201).json({ success: true, data: application });
    } catch (err) {
      // Prisma P2002: unique constraint violation on [profileId, jobPostingId]
      if (err.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'You have already applied to this job',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * listMyApplications — list the current candidate's applications
 * Includes job title, company name, status, appliedAt for each.
 */
async function listMyApplications(req, res, next) {
  try {
    const applications = await prisma.application.findMany({
      where: { profileId: req.profile.id },
      include: {
        jobPosting: {
          include: {
            company: { select: { name: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    const data = applications.map(app => ({
      id: app.id,
      jobId: app.jobPostingId,
      jobTitle: app.jobPosting.title,
      companyName: app.jobPosting.company.name,
      status: app.status,
      coverNote: app.coverNote,
      appliedAt: app.appliedAt,
      statusUpdatedAt: app.statusUpdatedAt,
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * withdrawApplication — candidate withdraws their own application
 * Ownership check combines id + profileId in a single query (same
 * pattern as other list-section ownership checks). Returns identical
 * 404 whether the application doesn't exist or belongs to someone else.
 * If already REJECTED/WITHDRAWN/HIRED: 409 with the current status.
 * Otherwise: updates status to WITHDRAWN and bumps statusUpdatedAt.
 */
async function withdrawApplication(req, res, next) {
  try {
    const application = await prisma.application.findFirst({
      where: {
        id: req.params.id,
        profileId: req.profile.id,
      },
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const terminalStatuses = ['REJECTED', 'WITHDRAWN', 'HIRED'];
    if (terminalStatuses.includes(application.status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot withdraw an application that is already ${application.status}`,
      });
    }

    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: {
        status: 'WITHDRAWN',
        statusUpdatedAt: new Date(),
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  applyToJob: asyncHandler(applyToJob),
  listMyApplications: asyncHandler(listMyApplications),
  withdrawApplication: asyncHandler(withdrawApplication),
};