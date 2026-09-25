/**
 * calculateEligibility — pure function to compute a candidate's match
 * against a job's required skills.
 * 
 * NOTE: Currently uses SkillClaim.selfRatedLevel as the effective level
 * because the Assessment Engine is deferred (see Decisions.md). When the
 * Assessment Engine ships, this logic should be updated to prefer
 * verifiedScore over selfRatedLevel when a verified score exists.
 * 
 * @param {Array<{skillId: string, selfRatedLevel: number, verifiedScore: number|null}>} candidateSkillClaims
 * @param {Array<{skillId: string, skill: {name: string}, minimumLevel: number, isRequired: boolean}>} jobRequiredSkills
 * @returns {{eligibilityScore: number, isEligible: boolean, matchedSkills: Array, missingSkills: Array}}
 */
function calculateEligibility(candidateSkillClaims, jobRequiredSkills) {
  const claimMap = new Map();
  for (const claim of candidateSkillClaims) {
    claimMap.set(claim.skillId, claim);
  }

  const results = [];
  for (const req of jobRequiredSkills) {
    const claim = claimMap.get(req.skillId);
    const effectiveLevel = claim ? claim.selfRatedLevel : null;
    const matched = claim !== undefined && effectiveLevel >= req.minimumLevel;

    results.push({
      skillId: req.skillId,
      skillName: req.skill.name,
      minimumLevel: req.minimumLevel,
      isRequired: req.isRequired,
      candidateLevel: effectiveLevel,
      matched,
    });
  }

  const mustHave = results.filter(e => e.isRequired);

  const eligibilityScore = mustHave.length === 0
    ? 100
    : Math.round((mustHave.filter(e => e.matched).length / mustHave.length) * 100);

  const isEligible = mustHave.every(e => e.matched);

  const matchedSkills = results.filter(e => e.matched);
  const missingSkills = results.filter(e => !e.matched);

  return {
    eligibilityScore,
    isEligible,
    matchedSkills,
    missingSkills,
  };
}

module.exports = { calculateEligibility };