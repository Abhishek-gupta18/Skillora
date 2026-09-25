const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { calculateEligibility } = require('../services/eligibilityService');

/**
 * getJobEligibility — current candidate's match against ONE specific open job
 * Uses the same combined {id, status: 'OPEN'} query pattern as getOpenJob
 * so "doesn't exist" and "exists but not open" both return 404.
 */
async function getJobEligibility(req, res, next) {
  try {
    const job = await prisma.jobPosting.findFirst({
      where: {
        id: req.params.id,
        status: 'OPEN',
      },
      include: {
        company: { select: { name: true } },
        jobRequiredSkills: {
          include: { skill: true },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    const candidateSkillClaims = await prisma.skillClaim.findMany({
      where: { profileId: req.profile.id },
      select: { skillId: true, selfRatedLevel: true, verifiedScore: true },
    });

    const result = calculateEligibility(candidateSkillClaims, job.jobRequiredSkills);

    return res.status(200).json({
      success: true,
      data: {
        job: {
          id: job.id,
          title: job.title,
          companyId: job.companyId,
          companyName: job.company.name,
        },
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * getJobMatches — ALL open jobs, ranked by the current candidate's eligibility score
 * Fetches all open jobs and computes in application code rather than in the
 * database query — fine at current scale, would need optimization (e.g. a
 * materialized/cached score, or moving the comparison into SQL) if the
 * number of open jobs grows large. Do not attempt that optimization now.
 */
async function getJobMatches(req, res, next) {
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: { status: 'OPEN' },
      include: {
        company: { select: { name: true } },
        jobRequiredSkills: {
          include: { skill: true },
        },
      },
    });

    const candidateSkillClaims = await prisma.skillClaim.findMany({
      where: { profileId: req.profile.id },
      select: { skillId: true, selfRatedLevel: true, verifiedScore: true },
    });

    const results = jobs.map(job => {
      const { eligibilityScore, isEligible } = calculateEligibility(
        candidateSkillClaims,
        job.jobRequiredSkills
      );
      return {
        jobId: job.id,
        title: job.title,
        companyName: job.company.name,
        eligibilityScore,
        isEligible,
      };
    });

    results.sort((a, b) => b.eligibilityScore - a.eligibilityScore);

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getJobEligibility: asyncHandler(getJobEligibility),
  getJobMatches: asyncHandler(getJobMatches),
};