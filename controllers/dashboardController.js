const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { calculateProfileCompletion } = require('../services/profileCompletionService');
const { calculateEligibility, rankJobMatches } = require('../services/eligibilityService');
const { buildNextAction, computeReadiness, buildSkillGaps, shapeVerifiedSkills, initials } = require('../utils/dashboard');

async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const profileId = req.profile.id;

    // Build all sections independently with Promise.allSettled
    const [
      userResult,
      targetRoleResult,
      readinessResult,
      profileCompletionResult,
      verifiedSkillsResult,
      skillGapsResult,
      recommendedJobsResult,
      applicationsResult,
      pendingTestsResult,
      roadmapResult,
      interviewInsightsResult,
      notificationsResult,
    ] = await Promise.allSettled([
      // User basic info
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),

      // Target role (first preferred role)
      prisma.preferredRole.findFirst({
        where: { profileId },
        select: { roleName: true },
        orderBy: { createdAt: 'asc' },
      }),

      // Readiness (best eligibility score among open jobs)
      (async () => {
        const matches = await getJobMatchesInternal(profileId);
        return computeReadiness(matches, []);
      })(),

      // Profile completion
      (async () => {
        const fullProfile = await prisma.profile.findUnique({
          where: { id: profileId },
          include: {
            basicInfo: true,
            photoHeadline: true,
            address: true,
            educationEntries: true,
            experienceEntries: true,
            skillClaims: true,
            certifications: true,
            projects: true,
            careerSummary: true,
            preferredRoles: true,
            preferredLocations: true,
            salaryExpectation: true,
            availability: true,
            languages: true,
            socialLinks: true,
            resume: true,
            references: true,
            privacyConsent: true,
          },
        });
        if (!fullProfile) return { percent: 0, missingSections: [] };
        return calculateProfileCompletion(fullProfile);
      })(),

      // Verified skills
      (async () => {
        const claims = await prisma.skillClaim.findMany({
          where: { profileId },
          include: { skill: { select: { name: true } } },
        });
        return shapeVerifiedSkills(claims);
      })(),

      // Skill gaps
      (async () => {
        const matches = await getJobMatchesInternal(profileId);
        const claims = await prisma.skillClaim.findMany({
          where: { profileId },
          include: { skill: { select: { name: true } } },
        });
        return buildSkillGaps(matches, claims);
      })(),

      // Recommended jobs (top 5)
      (async () => {
        const matches = await getJobMatchesInternal(profileId);
        const top5 = matches.slice(0, 5);
        return top5.map(m => ({
          id: m.jobId,
          role: m.title,
          company: m.companyName,
          location: m.location,
          workMode: m.isRemote ? 'remote' : 'on-site',
          postedAt: m.postedAt,
          match: m.eligibilityScore,
          eligibility: m.eligibilityLabel,
          topGap: m.missingSkills.length > 0 ? m.missingSkills[0].gap : 0,
        }));
      })(),

      // Applications
      (async () => {
        const applications = await prisma.application.findMany({
          where: { profileId },
          include: {
            jobPosting: {
              select: { title: true, company: { select: { name: true } } },
            },
          },
          orderBy: { appliedAt: 'desc' },
        });
        const byStage = applications.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {});
        const recent = applications.slice(0, 5).map(app => ({
          id: app.id,
          role: app.jobPosting?.title,
          company: app.jobPosting?.company?.name,
          status: app.status,
          appliedAt: app.appliedAt,
        }));
        return { total: applications.length, byStage, recent };
      })(),

      // Pending tests
      (async () => {
        const claims = await prisma.skillClaim.findMany({
          where: { profileId },
          select: { skillId: true, selfRatedLevel: true, verifiedLevel: true },
        });
        const sessions = await prisma.assessmentSession.findMany({
          where: { profileId },
          select: { id: true, skillId: true, status: true, expiresAt: true },
        });
        const skillIdToClaim = new Map(claims.map(c => [c.skillId, c]));
        const pendingTests = [];
        for (const claim of claims) {
          const session = sessions.find(s => s.skillId === claim.skillId);
          if (!session) {
            pendingTests.push({
              id: claim.skillId,
              title: `Assessment for ${claim.skill?.name ?? 'Unknown'}`,
              skill: claim.skill?.name ?? 'Unknown',
              status: 'not-started',
            });
          } else if (session.status === 'IN_PROGRESS') {
            pendingTests.push({
              id: claim.skillId,
              title: `Assessment for ${claim.skill?.name ?? 'Unknown'}`,
              skill: claim.skill?.name ?? 'Unknown',
              status: 'in-progress',
              activeSessionId: session.id,
              expiresAt: session.expiresAt,
            });
          } else if (session.status === 'COMPLETED' || session.status === 'EXPIRED') {
            const needsRetake = await prisma.retakeRequest.findFirst({
              where: { profileId: req.profile.id, skillId: claim.skillId, status: 'PENDING' },
            });
            if (needsRetake) {
              pendingTests.push({
                id: claim.skillId,
                title: `Retake for ${claim.skill?.name ?? 'Unknown'}`,
                skill: claim.skill?.name ?? 'Unknown',
                status: 'retake-pending',
              });
            } else {
              // Check if there's an approved retake request
              const approved = await prisma.retakeRequest.findFirst({
                where: { profileId: req.profile.id, skillId: claim.skillId, status: 'APPROVED', consumedAt: null },
              });
              if (approved) {
                pendingTests.push({
                  id: claim.skillId,
                  title: `Retake for ${claim.skill?.name ?? 'Unknown'}`,
                  skill: claim.skill?.name ?? 'Unknown',
                  status: 'retake-approved',
                });
              } else {
                pendingTests.push({
                  id: claim.skillId,
                  title: `Retake for ${claim.skill?.name ?? 'Unknown'}`,
                  skill: claim.skill?.name ?? 'Unknown',
                  status: 'retake-needed',
                });
              }
            }
          }
        }
        return pendingTests;
      })(),

      // Roadmap
      (async () => {
        const assignment = await prisma.roadmapAssignment.findFirst({
          where: { profileId, status: 'ACTIVE' },
          include: {
            roadmapTemplate: {
              select: { id: true, title: true, targetSkill: { select: { name: true } } },
              include: { steps: { select: { id: true, title: true } } },
            },
          },
        });
        if (!assignment) return null;
        const completedSteps = await prisma.roadmapStepProgress.count({
          where: { roadmapAssignmentId: assignment.id, isCompleted: true },
        });
        const totalSteps = assignment.roadmapTemplate.steps.length;
        const currentStep = assignment.roadmapTemplate.steps[completedSteps] ?? null;
        return {
          id: assignment.id,
          targetSkill: assignment.roadmapTemplate.targetSkill.name,
          overallProgress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
          currentStep: currentStep ? { id: currentStep.id, title: currentStep.title } : null,
        };
      })(),

      // Interview insights
      (async () => {
        const matches = await getJobMatchesInternal(profileId);
        const topMatches = matches.slice(0, 5);
        const companyNames = [...new Set(topMatches.map(m => m.companyName).filter(Boolean))];
        const roleTitles = [...new Set(topMatches.map(m => m.title).filter(Boolean))];

        const experiences = await prisma.interviewExperience.findMany({
          where: {
            OR: [
              { companyName: { in: companyNames } },
              { roleTitle: { in: roleTitles } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            companyName: true,
            roleTitle: true,
            outcome: true,
            interviewDate: true,
            narrative: true,
            rounds: { select: { roundType: true, questionsAsked: true } },
          },
        });
        return experiences;
      })(),

      // Notifications
      (async () => {
        const [unreadCount, latest] = await Promise.all([
          prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
          prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { id: true, type: true, title: true, readAt: true, createdAt: true },
          }),
        ]);
        return { unreadCount, latest };
      })(),
    ]);

    // Helper function to get job matches
    async function getJobMatchesInternal(profileId) {
      const jobs = await prisma.jobPosting.findMany({
        where: { status: 'OPEN' },
        include: {
          company: { select: { name: true } },
          jobRequiredSkills: { include: { skill: true } },
        },
      });
      const candidateSkillClaims = await prisma.skillClaim.findMany({
        where: { profileId },
        select: { skillId: true, selfRatedLevel: true, verifiedLevel: true, verifiedScore: true },
      });
      const results = jobs.map(job => {
        const { eligibilityScore, isEligible, eligibilityLabel } = calculateEligibility(
          candidateSkillClaims,
          job.jobRequiredSkills
        );
        return {
          jobId: job.id,
          title: job.title,
          companyName: job.company.name,
          location: job.location,
          isRemote: job.isRemote,
          postedAt: job.postedAt,
          eligibilityScore,
          isEligible,
          eligibilityLabel,
        };
      });
      results.sort((a, b) => b.eligibilityScore - a.eligibilityScore);
      return results;
    }

    // Build response handling settled promises
    const buildSection = (result, fallback) => {
      if (result.status === 'fulfilled') return result.value;
      return fallback;
    };

    const user = userResult.status === 'fulfilled' ? userResult.value : null;
    const basicInfo = await prisma.basicInfo.findUnique({ where: { profileId }, select: { name: true } }).catch(() => null);

    const response = {
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        joinedAt: user.createdAt,
        firstName: basicInfo?.name?.split(' ')[0] ?? null,
        lastName: basicInfo?.name?.split(' ').slice(1).join(' ') ?? null,
        fullName: basicInfo?.name ?? null,
        title: targetRoleResult.status === 'fulfilled' ? targetRoleResult.value?.roleName ?? null : null,
        avatarInitials: basicInfo?.name ? initials(basicInfo.name) : '??',
      } : null,
      targetRole: targetRoleResult.status === 'fulfilled' ? { title: targetRoleResult.value?.roleName ?? null } : null,
      readiness: readinessResult.status === 'fulfilled' ? readinessResult.value : { readinessScore: null, verifiedSkillsCount: 0, claimedSkillsCount: 0, skillGapCount: 0, profileCompletion: 0 },
      profileCompletion: profileCompletionResult.status === 'fulfilled' ? profileCompletionResult.value : { percent: 0, missingSections: [] },
      verifiedSkills: verifiedSkillsResult.status === 'fulfilled' ? verifiedSkillsResult.value : [],
      skillGaps: skillGapsResult.status === 'fulfilled' ? skillGapsResult.value : [],
      recommendedJobs: recommendedJobsResult.status === 'fulfilled' ? recommendedJobsResult.value : [],
      applications: applicationsResult.status === 'fulfilled' ? applicationsResult.value : { total: 0, byStage: {}, recent: [] },
      pendingTests: pendingTestsResult.status === 'fulfilled' ? pendingTestsResult.value : [],
      roadmap: roadmapResult.status === 'fulfilled' ? roadmapResult.value : null,
      interviewInsights: interviewInsightsResult.status === 'fulfilled' ? interviewInsightsResult.value : [],
      notifications: notificationsResult.status === 'fulfilled' ? notificationsResult.value : { unreadCount: 0, latest: [] },
      generatedAt: new Date().toISOString(),
    };

    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard: asyncHandler(getDashboard) };