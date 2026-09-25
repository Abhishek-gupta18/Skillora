const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { matchedData } = require('express-validator');

/**
 * listOpenJobs — list OPEN job postings with optional filters and search
 * Only OPEN jobs are returned; DRAFT and CLOSED are never exposed.
 * No pagination in this version (future improvement).
 * 
 * Uses matchedData(req) instead of req.query because Express 5 makes
 * req.query a read-only getter — express-validator sanitizers like
 * .toBoolean() and .trim() cannot mutate it. matchedData returns the
 * validated AND sanitized values from the validator chain.
 */
async function listOpenJobs(req, res, next) {
  try {
    const { search, employmentType, experienceLevel, location, isRemote } = matchedData(req);

    const andConditions = [{ status: 'OPEN' }];

    if (employmentType !== undefined) {
      andConditions.push({ employmentType });
    }
    if (experienceLevel !== undefined) {
      andConditions.push({ experienceLevel });
    }
    if (location !== undefined) {
      andConditions.push({ location: { contains: location, mode: 'insensitive' } });
    }
    if (isRemote !== undefined) {
      andConditions.push({ isRemote });
    }
    if (search !== undefined && search !== '') {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          {
            jobRequiredSkills: {
              some: {
                skill: { name: { contains: search, mode: 'insensitive' } },
              },
            },
          },
        ],
      });
    }

    const where = { AND: andConditions };

    const jobs = await prisma.jobPosting.findMany({
      where,
      include: {
        company: true,
        jobRequiredSkills: {
          include: { skill: true },
        },
      },
      orderBy: { postedAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
}

/**
 * getOpenJob — get a single OPEN job posting by id
 * Status check is part of the same findFirst call as the id lookup
 * so "doesn't exist" and "exists but not open" both return 404.
 */
async function getOpenJob(req, res, next) {
  try {
    const job = await prisma.jobPosting.findFirst({
      where: {
        id: req.params.id,
        status: 'OPEN',
      },
      include: {
        company: true,
        jobRequiredSkills: {
          include: { skill: true },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    return res.status(200).json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listOpenJobs: asyncHandler(listOpenJobs),
  getOpenJob: asyncHandler(getOpenJob),
};