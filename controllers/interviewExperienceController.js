const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { matchedData } = require('express-validator');

/**
 * createInterviewExperience — create a new interview experience with nested rounds
 * Author is always req.profile.id (never from body).
 * companyId and jobPostingId are verified to exist if provided.
 * Nested create for rounds in the same Prisma call.
 * Responds 201 with created record including rounds.
 */
async function createInterviewExperience(req, res, next) {
  try {
    // Verify companyId if provided
    if (req.body.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: req.body.companyId },
      });
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found' });
      }
    }

    // Verify jobPostingId if provided (no status filter — experience can be for closed jobs)
    if (req.body.jobPostingId) {
      const jobPosting = await prisma.jobPosting.findUnique({
        where: { id: req.body.jobPostingId },
      });
      if (!jobPosting) {
        return res.status(404).json({ success: false, message: 'Job posting not found' });
      }
    }

    const { companyName, companyId, roleTitle, jobPostingId, outcome, interviewDate, isAnonymous, narrative, rounds } = req.body;

    const created = await prisma.interviewExperience.create({
      data: {
        authorProfileId: req.profile.id,
        companyName,
        companyId: companyId || null,
        roleTitle,
        jobPostingId: jobPostingId || null,
        outcome,
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        isAnonymous: isAnonymous ?? false,
        narrative: narrative || null,
        rounds: {
          create: rounds.map((r) => ({
            roundOrder: r.roundOrder,
            roundType: r.roundType,
            questionsAsked: r.questionsAsked,
            notes: r.notes || null,
          })),
        },
      },
      include: { rounds: true },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

/**
 * listInterviewExperiences — browse interview experiences with optional filters
 * Never includes author-identifying info in response (consistent with GFG/LeetCode Discuss style).
 * Uses matchedData(req) for query params (Express 5 req.query is read-only getter).
 */
async function listInterviewExperiences(req, res, next) {
  try {
    const { companyName, roleTitle, outcome } = matchedData(req);

    const andConditions = [];

    if (companyName !== undefined && companyName !== '') {
      andConditions.push({ companyName: { contains: companyName, mode: 'insensitive' } });
    }
    if (roleTitle !== undefined && roleTitle !== '') {
      andConditions.push({ roleTitle: { contains: roleTitle, mode: 'insensitive' } });
    }
    if (outcome !== undefined) {
      andConditions.push({ outcome });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const experiences = await prisma.interviewExperience.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        companyId: true,
        roleTitle: true,
        jobPostingId: true,
        outcome: true,
        interviewDate: true,
        isAnonymous: true,
        narrative: true,
        createdAt: true,
        updatedAt: true,
        rounds: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: experiences });
  } catch (err) {
    next(err);
  }
}

/**
 * getInterviewExperience — view a single interview experience by id
 * Never includes author-identifying info in response.
 */
async function getInterviewExperience(req, res, next) {
  try {
    const experience = await prisma.interviewExperience.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        companyName: true,
        companyId: true,
        roleTitle: true,
        jobPostingId: true,
        outcome: true,
        interviewDate: true,
        isAnonymous: true,
        narrative: true,
        createdAt: true,
        updatedAt: true,
        rounds: true,
      },
    });

    if (!experience) {
      return res.status(404).json({ success: false, message: 'Interview experience not found' });
    }

    return res.status(200).json({ success: true, data: experience });
  } catch (err) {
    next(err);
  }
}

/**
 * deleteOwnInterviewExperience — delete own interview experience
 * Ownership check via combined {id, authorProfileId} query — identical 404 whether missing or not yours.
 * Rounds cascade-delete automatically per schema.
 */
async function deleteOwnInterviewExperience(req, res, next) {
  try {
    const experience = await prisma.interviewExperience.findFirst({
      where: {
        id: req.params.id,
        authorProfileId: req.profile.id,
      },
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
  createInterviewExperience: asyncHandler(createInterviewExperience),
  listInterviewExperiences: asyncHandler(listInterviewExperiences),
  getInterviewExperience: asyncHandler(getInterviewExperience),
  deleteOwnInterviewExperience: asyncHandler(deleteOwnInterviewExperience),
};