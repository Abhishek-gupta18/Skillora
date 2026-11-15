/**
 * calculateEligibility — pure function to compute a candidate's match
 * against a job's required skills.
 * 
 * Effective level is the claim's verifiedLevel (null when unverified).
 * Matched = verifiedLevel !== null && verifiedLevel >= minimumLevel.
 * 
 * @param {Array<{skillId: string, selfRatedLevel: number, verifiedLevel: number|null, verifiedScore: number|null}>} candidateSkillClaims
 * @param {Array<{skillId: string, skill: {name: string}, minimumLevel: number, isRequired: boolean}>} jobRequiredSkills
 * @returns {{
 *   eligibilityScore: number,
 *   isEligible: boolean,
 *   matchedSkills: Array,
 *   missingSkills: Array,
 *   eligibilityLabel: string
 * }}
 */
function calculateEligibility(candidateSkillClaims, jobRequiredSkills) {
  const claimMap = new Map();
  for (const claim of candidateSkillClaims) {
    claimMap.set(claim.skillId, claim);
  }

  const results = [];
  for (const req of jobRequiredSkills) {
    const claim = claimMap.get(req.skillId);
    const verifiedLevel = claim ? claim.verifiedLevel : null;
    const matched = verifiedLevel !== null && verifiedLevel >= req.minimumLevel;

    let status;
    if (!claim) {
      status = 'not-claimed';
    } else if (verifiedLevel === null) {
      status = 'unverified';
    } else if (matched) {
      status = 'verified-match';
    } else {
      status = 'below-level';
    }

    results.push({
      skillId: req.skillId,
      skillName: req.skill.name,
      minimumLevel: req.minimumLevel,
      isRequired: req.isRequired,
      selfRatedLevel: claim ? claim.selfRatedLevel : null,
      verifiedLevel,
      gap: Math.max(0, req.minimumLevel - (verifiedLevel ?? 0)),
      matched,
      status,
    });
  }

  const mustHave = results.filter(e => e.isRequired);

  const eligibilityScore = mustHave.length === 0
    ? 100
    : Math.round((mustHave.filter(e => e.matched).length / mustHave.length) * 100);

  const isEligible = mustHave.every(e => e.matched);

  const matchedSkills = results.filter(e => e.matched);
  const missingSkills = results.filter(e => !e.matched);

  let eligibilityLabel;
  if (isEligible) {
    eligibilityLabel = 'eligible';
  } else if (eligibilityScore >= 50) {
    eligibilityLabel = 'partially-eligible';
  } else {
    eligibilityLabel = 'skill-gap';
  }

  return {
    eligibilityScore,
    isEligible,
    matchedSkills,
    missingSkills,
    eligibilityLabel,
  };
}

function rankJobMatches(candidateSkillClaims, jobs) {
  const results = jobs.map(job => {
    const { eligibilityScore, isEligible, eligibilityLabel } = calculateEligibility(
      candidateSkillClaims,
      job.jobRequiredSkills
    );
    return {
      jobId: job.id,
      title: job.title,
      companyName: job.company.name,
      eligibilityScore,
      isEligible,
      eligibilityLabel,
    };
  });

  results.sort((a, b) => b.eligibilityScore - a.eligibilityScore);
  return results;
}

module.exports = { calculateEligibility, rankJobMatches };