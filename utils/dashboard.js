const { ASSESSMENT_QUESTION_COUNT } = require('./skillLevelBands');

const MISSING_SECTIONS_ORDER = [
  'basicInfo',
  'photoHeadline',
  'address',
  'educationEntries',
  'experienceEntries',
  'skillClaims',
  'certifications',
  'projects',
  'careerSummary',
  'preferredRoles',
  'preferredLocations',
  'salaryExpectation',
  'availability',
  'languages',
  'socialLinks',
  'resume',
  'references',
  'privacyConsent',
];

function getMissingSections(profile) {
  const missing = [];
  for (const section of MISSING_SECTIONS_ORDER) {
    const value = profile[section];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      missing.push(section);
    }
  }
  return missing;
}

function buildNextAction(ctx) {
  const { profile, claims, matches, roadmap } = ctx;

  const completion = ctx.profileCompletion;
  if (completion && completion.percent < 60) {
    const missing = completion.missingSections || getMissingSections(ctx.profile);
    if (missing.length > 0) {
      const section = missing[0];
      const formatted = section
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, c => c.toUpperCase())
        .trim();
      return {
        id: `complete-${missing[0]}`,
        title: `Complete ${formatted}`,
        description: `Your profile is ${completion.percent}% complete. Finish this section to improve your profile.`,
        linkTo: `/profile/${missing[0]}`,
      };
    }
  }

  if (!claims || claims.length === 0) {
    return {
      id: 'add-skills',
      title: 'Add Your First Skill',
      description: 'Claim a skill to start tracking your proficiency and unlock assessments.',
      linkTo: '/skills',
    };
  }

  const unverifiedClaims = claims.filter(c => c.verifiedLevel === null);
  if (unverifiedClaims.length > 0) {
    const claim = unverifiedClaims[0];
    return {
      id: `assess-${claim.skillId}`,
      title: `Take Assessment for ${claim.skill?.name ?? claim.skillId}`,
      description: `You claimed ${claim.skill?.name ?? claim.skillId} at level ${claim.selfRatedLevel} but haven't verified it yet.`,
      linkTo: `/assessments/start?skillId=${claim.skillId}`,
    };
  }

  const failedClaims = claims.filter(c => c.verifiedLevel !== null && c.verifiedLevel < c.selfRatedLevel);
  if (failedClaims.length > 0 && !roadmap) {
    const claim = failedClaims[0];
    return {
      id: `roadmap-${claim.skillId}`,
      title: `Generate Roadmap for ${claim.skill?.name ?? claim.skillId}`,
      description: `You scored below your claimed level for ${claim.skill?.name ?? claim.skillId}. Generate a roadmap to improve.`,
      linkTo: `/roadmaps/create?skillId=${claim.skillId}`,
    };
  }

  if (roadmap && roadmap.currentStep) {
    return {
      id: `roadmap-step-${roadmap.currentStep.id}`,
      title: `Continue: ${roadmap.currentStep.title}`,
      description: `You're ${roadmap.overallProgress}% through your roadmap for ${roadmap.targetSkill}.`,
      linkTo: `/roadmaps/${roadmap.id}`,
    };
  }

  if (matches && matches.length > 0) {
    const match = matches[0];
    return {
      id: `job-${match.jobId}`,
      title: `Apply to ${match.title} at ${match.companyName}`,
      description: `Your eligibility score is ${match.eligibilityScore}% (${match.eligibilityLabel}).`,
      linkTo: `/jobs/${match.jobId}`,
    };
  }

  return null;
}

function computeReadiness(matches, claims) {
  const verifiedClaims = claims.filter(c => c.verifiedLevel !== null);
  const bestScore = matches.length > 0 ? matches[0]?.eligibilityScore ?? null : null;
  return {
    readinessScore: bestScore,
    verifiedSkillsCount: verifiedClaims.length,
    claimedSkillsCount: claims.length,
    skillGapCount: claims.filter(c => c.verifiedLevel !== null && c.verifiedLevel < c.selfRatedLevel).length,
    profileCompletion: 0,
  };
}

function buildSkillGaps(matches, claims) {
  const skillMap = new Map();
  for (const claim of claims) {
    skillMap.set(claim.skillId, claim);
  }

  const gapMap = new Map();

  for (const match of matches.slice(0, 5)) {
    for (const missing of match.missingSkills ?? []) {
      const key = missing.skillId;
      const existing = gapMap.get(key);
      const requiredLevel = missing.requiredLevel ?? 0;
      const currentLevel = skillMap.get(key)?.verifiedLevel ?? skillMap.get(key)?.selfRatedLevel ?? 0;

      if (!existing || requiredLevel > existing.requiredLevel) {
        gapMap.set(key, {
          skillId: missing.skillId,
          skill: missing.skill?.name ?? missing.skillId,
          currentLevel,
          requiredLevel,
          gap: requiredLevel - currentLevel,
        });
      }
    }
  }

  return Array.from(gapMap.values())
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10);
}

function shapeVerifiedSkills(claims) {
  return claims
    .filter(c => c.verifiedLevel !== null)
    .map(c => ({
      id: c.skillId,
      name: c.skill?.name ?? c.skillId,
      proficiency: c.verifiedScore ?? null,
      state: 'verified',
      level: c.verifiedLevel,
      selfRatedLevel: c.selfRatedLevel,
      lastAssessedAt: c.verifiedAt ?? null,
    }));
}

function initials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const single = parts[0];
    return single.length === 1 ? single.toUpperCase() + '?' : single.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

module.exports = {
  buildNextAction,
  computeReadiness,
  buildSkillGaps,
  shapeVerifiedSkills,
  initials,
};