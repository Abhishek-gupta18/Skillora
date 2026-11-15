const { test, describe } = require('node:test');
const assert = require('node:assert');
const { calculateEligibility, rankJobMatches } = require('../services/eligibilityService');

function makeReqSkill(skillId, minimumLevel, isRequired = true, skillName = 'Test Skill') {
  return { skillId, minimumLevel, isRequired, skill: { name: skillName } };
}

function makeClaim(skillId, selfRatedLevel, verifiedLevel = null, verifiedScore = null) {
  return { skillId, selfRatedLevel, verifiedLevel, verifiedScore };
}

describe('calculateEligibility', () => {
  describe('unverified claims', () => {
    test('unverified claim does not match even if selfRated is 5', () => {
      const claims = [makeClaim('js', 5, null, null)];
      const reqSkills = [makeReqSkill('js', 3)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.eligibilityScore, 0);
      assert.strictEqual(result.matchedSkills.length, 0);
      assert.strictEqual(result.missingSkills[0].status, 'unverified');
    });

    test('unverified claim with selfRated below minimum', () => {
      const claims = [makeClaim('js', 2, null, null)];
      const reqSkills = [makeReqSkill('js', 3)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.missingSkills[0].status, 'unverified');
    });
  });

  describe('verified claims', () => {
    test('verified level equal to minimum -> match', () => {
      const claims = [makeClaim('js', 3, 3, 85)];
      const reqSkills = [makeReqSkill('js', 3)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, true);
      assert.strictEqual(result.eligibilityScore, 100);
      assert.strictEqual(result.matchedSkills.length, 1);
      assert.strictEqual(result.matchedSkills[0].status, 'verified-match');
    });

    test('verified level above minimum -> match', () => {
      const claims = [makeClaim('js', 3, 4, 90)];
      const reqSkills = [makeReqSkill('js', 3)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, true);
      assert.strictEqual(result.matchedSkills[0].status, 'verified-match');
    });

    test('verified level below minimum -> no match', () => {
      const claims = [makeClaim('js', 4, 2, 70)];
      const reqSkills = [makeReqSkill('js', 3)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.missingSkills[0].status, 'below-level');
      assert.strictEqual(result.missingSkills[0].gap, 1);
    });
  });

  describe('optional vs required skills', () => {
    test('optional skill not matched does not affect isEligible', () => {
      const claims = [makeClaim('js', 5, 5, 95)];
      const reqSkills = [
        makeReqSkill('js', 3, true),
        makeReqSkill('python', 3, false),
      ];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, true);
      assert.strictEqual(result.eligibilityScore, 100);
      assert.strictEqual(result.matchedSkills.length, 1);
      assert.strictEqual(result.missingSkills[0].isRequired, false);
    });

    test('optional skill matched increases matchedSkills but not required count', () => {
      const claims = [
        makeClaim('js', 5, 5, 95),
        makeClaim('python', 3, 3, 80),
      ];
      const reqSkills = [
        makeReqSkill('js', 3, true),
        makeReqSkill('python', 3, false),
      ];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, true);
      assert.strictEqual(result.matchedSkills.length, 2);
    });

    test('required skill unverified -> not eligible', () => {
      const claims = [makeClaim('js', 5, null, null)];
      const reqSkills = [
        makeReqSkill('js', 3, true),
        makeReqSkill('python', 3, true),
      ];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.eligibilityScore, 0);
    });
  });

  describe('no required skills', () => {
    test('score is 100 when no required skills', () => {
      const claims = [];
      const reqSkills = [
        makeReqSkill('js', 3, false),
        makeReqSkill('python', 3, false),
      ];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.eligibilityScore, 100);
      assert.strictEqual(result.isEligible, true);
    });
  });

  describe('eligibilityLabel', () => {
    test('eligible when isEligible true', () => {
      const claims = [makeClaim('js', 5, 5, 95)];
      const reqSkills = [makeReqSkill('js', 3)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.eligibilityLabel, 'eligible');
    });

    test('partially-eligible when score >= 50 and not eligible', () => {
      const claims = [
        makeClaim('js', 5, 5, 95),
        makeClaim('python', 2, null, null),
      ];
      const reqSkills = [
        makeReqSkill('js', 3, true),
        makeReqSkill('python', 3, true),
      ];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.eligibilityScore, 50);
      assert.strictEqual(result.eligibilityLabel, 'partially-eligible');
    });

    test('skill-gap when score < 50', () => {
      const claims = [makeClaim('js', 2, null, null)];
      const reqSkills = [
        makeReqSkill('js', 3, true),
        makeReqSkill('python', 3, true),
      ];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.eligibilityScore, 0);
      assert.strictEqual(result.eligibilityLabel, 'skill-gap');
    });

    test('skill-gap at boundary (score 49)', () => {
      const claims = [makeClaim('js', 5, 5, 95)];
      const reqSkills = [
        makeReqSkill('js', 3, true),
        makeReqSkill('python', 3, true),
        makeReqSkill('java', 3, true),
      ];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.eligibilityScore, 33);
      assert.strictEqual(result.eligibilityLabel, 'skill-gap');
    });
  });

  describe('not-claimed skills', () => {
    test('skill not claimed at all', () => {
      const claims = [];
      const reqSkills = [makeReqSkill('js', 3)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.missingSkills[0].status, 'not-claimed');
      assert.strictEqual(result.missingSkills[0].verifiedLevel, null);
    });
  });

  describe('gap calculation', () => {
    test('gap = minimumLevel - verifiedLevel when verifiedLevel < minimumLevel', () => {
      const claims = [makeClaim('js', 5, 2, 70)];
      const reqSkills = [makeReqSkill('js', 4)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.missingSkills[0].gap, 2);
    });

    test('gap = 0 when verifiedLevel >= minimumLevel', () => {
      const claims = [makeClaim('js', 5, 4, 85)];
      const reqSkills = [makeReqSkill('js', 3)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.matchedSkills[0].gap, 0);
    });

    test('gap = minimumLevel when unverified (verifiedLevel null)', () => {
      const claims = [makeClaim('js', 5, null, null)];
      const reqSkills = [makeReqSkill('js', 3)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.missingSkills[0].gap, 3);
    });

    test('gap = minimumLevel when not claimed', () => {
      const claims = [];
      const reqSkills = [makeReqSkill('js', 4)];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.missingSkills[0].gap, 4);
    });
  });

  describe('multiple skills mixed', () => {
    test('mix of verified-match, below-level, unverified, not-claimed', () => {
      const claims = [
        makeClaim('js', 5, 5, 95),      // verified-match
        makeClaim('python', 3, 2, 70),  // below-level
        makeClaim('java', 4, null, null), // unverified
      ];
      const reqSkills = [
        makeReqSkill('js', 3, true),
        makeReqSkill('python', 3, true),
        makeReqSkill('java', 3, true),
        makeReqSkill('go', 3, true),    // not-claimed
      ];
      const result = calculateEligibility(claims, reqSkills);
      assert.strictEqual(result.isEligible, false);
      assert.strictEqual(result.eligibilityScore, 25);
      const statuses = result.missingSkills.map(s => s.status).sort();
      assert.deepStrictEqual(statuses, ['below-level', 'not-claimed', 'unverified']);
    });
  });
});

describe('rankJobMatches', () => {
  test('returns jobs sorted by eligibilityScore desc', () => {
    const claims = [
      makeClaim('js', 5, 5, 95),
      makeClaim('python', 3, 3, 80),
    ];
    const jobs = [
      { id: '1', title: 'Job A', company: { name: 'Co A' }, jobRequiredSkills: [makeReqSkill('js', 3)] },
      { id: '2', title: 'Job B', company: { name: 'Co B' }, jobRequiredSkills: [makeReqSkill('python', 5)] },
      { id: '3', title: 'Job C', company: { name: 'Co C' }, jobRequiredSkills: [makeReqSkill('java', 3)] },
    ];
    const results = rankJobMatches(claims, jobs);
    assert.strictEqual(results[0].jobId, '1');
    assert.strictEqual(results[0].eligibilityScore, 100);
    assert.strictEqual(results[1].jobId, '2');
    assert.strictEqual(results[1].eligibilityScore, 0);
    assert.strictEqual(results[2].jobId, '3');
    assert.strictEqual(results[2].eligibilityScore, 0);
  });

  test('includes eligibilityLabel in results', () => {
    const claims = [makeClaim('js', 5, 5, 95)];
    const jobs = [
      { id: '1', title: 'Job A', company: { name: 'Co A' }, jobRequiredSkills: [makeReqSkill('js', 3)] },
    ];
    const results = rankJobMatches(claims, jobs);
    assert.ok(results[0].eligibilityLabel);
    assert.strictEqual(results[0].eligibilityLabel, 'eligible');
  });
});