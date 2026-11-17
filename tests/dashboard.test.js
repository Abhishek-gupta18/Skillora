const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  buildNextAction,
  computeReadiness,
  buildSkillGaps,
  shapeVerifiedSkills,
  initials,
} = require('../utils/dashboard');

describe('utils/dashboard', () => {
  describe('initials', () => {
    test('returns first two letters for single name', () => {
      assert.strictEqual(initials('John'), 'JO');
    });

    test('returns first and last initial for full name', () => {
      assert.strictEqual(initials('John Doe'), 'JD');
    });

    test('handles middle names', () => {
      assert.strictEqual(initials('John Michael Doe'), 'JD');
    });

    test('returns ?? for empty name', () => {
      assert.strictEqual(initials(''), '??');
      assert.strictEqual(initials(null), '??');
      assert.strictEqual(initials(undefined), '??');
    });
  });

  describe('initials edge cases', () => {
    test('handles names with extra spaces', () => {
      assert.strictEqual(initials('  John   Doe  '), 'JD');
    });

    test('single character name', () => {
      assert.strictEqual(initials('J'), 'J?');
    });
  });

  describe('shapeVerifiedSkills', () => {
    test('filters only verified claims', () => {
      const claims = [
        { skillId: 'js', skill: { name: 'JavaScript' }, verifiedLevel: 3, verifiedScore: 85, verifiedAt: new Date('2024-01-01'), selfRatedLevel: 4 },
        { skillId: 'py', skill: { name: 'Python' }, verifiedLevel: null, verifiedScore: null, verifiedAt: null, selfRatedLevel: 3 },
      ];
      const result = shapeVerifiedSkills(claims);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].id, 'js');
      assert.strictEqual(result[0].name, 'JavaScript');
      assert.strictEqual(result[0].level, 3);
      assert.strictEqual(result[0].proficiency, 85);
      assert.strictEqual(result[0].state, 'verified');
    });

    test('returns empty array when no verified claims', () => {
      const claims = [
        { skillId: 'js', skill: { name: 'JavaScript' }, verifiedLevel: null, verifiedScore: null, verifiedAt: null, selfRatedLevel: 4 },
      ];
      const result = shapeVerifiedSkills(claims);
      assert.strictEqual(result.length, 0);
    });

    test('handles empty claims array', () => {
      const result = shapeVerifiedSkills([]);
      assert.strictEqual(result.length, 0);
    });
  });

  describe('computeReadiness', () => {
    test('returns best eligibility score from matches', () => {
      const matches = [
        { eligibilityScore: 85, eligibilityLabel: 'eligible' },
        { eligibilityScore: 60, eligibilityLabel: 'partially-eligible' },
      ];
      const claims = [
        { verifiedLevel: 3, selfRatedLevel: 4 },
        { verifiedLevel: 2, selfRatedLevel: 2 },
      ];
      const result = computeReadiness(matches, claims);
      assert.strictEqual(result.readinessScore, 85);
      assert.strictEqual(result.verifiedSkillsCount, 2);
      assert.strictEqual(result.claimedSkillsCount, 2);
      assert.strictEqual(result.skillGapCount, 1);
    });

    test('handles no matches', () => {
      const result = computeReadiness([], []);
      assert.strictEqual(result.readinessScore, null);
      assert.strictEqual(result.verifiedSkillsCount, 0);
      assert.strictEqual(result.claimedSkillsCount, 0);
      assert.strictEqual(result.skillGapCount, 0);
    });

    test('handles empty matches array', () => {
      const result = computeReadiness([], [{ verifiedLevel: 3, selfRatedLevel: 3 }]);
      assert.strictEqual(result.readinessScore, null);
    });
  });

  describe('buildSkillGaps', () => {
    test('builds gaps from top 5 matches', () => {
      const matches = [
        {
          jobId: 'j1',
          missingSkills: [
            { skillId: 'js', skill: { name: 'JavaScript' }, requiredLevel: 4 },
            { skillId: 'py', skill: { name: 'Python' }, requiredLevel: 3 },
          ],
        },
        {
          jobId: 'j2',
          missingSkills: [
            { skillId: 'js', skill: { name: 'JavaScript' }, requiredLevel: 5 },
            { skillId: 'go', skill: { name: 'Go' }, requiredLevel: 3 },
          ],
        },
      ];
      const claims = [
        { skillId: 'js', skill: { name: 'JavaScript' }, verifiedLevel: 3, selfRatedLevel: 4 },
        { skillId: 'py', skill: { name: 'Python' }, verifiedLevel: 2, selfRatedLevel: 3 },
      ];
      const gaps = buildSkillGaps(matches, claims);
      assert.strictEqual(gaps.length, 3);
      const jsGap = gaps.find(g => g.skillId === 'js');
      assert.strictEqual(jsGap.gap, 2); // required 5 - current 3
      assert.strictEqual(jsGap.requiredLevel, 5); // max of 4 and 5
      const pyGap = gaps.find(g => g.skillId === 'py');
      assert.strictEqual(pyGap.gap, 1); // required 3 - current 2
    });

    test('uses selfRatedLevel when verifiedLevel is null', () => {
      const matches = [{ missingSkills: [{ skillId: 'js', skill: { name: 'JavaScript' }, requiredLevel: 4 }] }];
      const claims = [{ skillId: 'js', skill: { name: 'JavaScript' }, verifiedLevel: null, selfRatedLevel: 3 }];
      const gaps = buildSkillGaps(matches, claims);
      const jsGap = gaps.find(g => g.skillId === 'js');
      assert.strictEqual(jsGap.currentLevel, 3); // uses selfRatedLevel
      assert.strictEqual(jsGap.gap, 1); // 4 - 3
    });

    test('limits to 10 gaps', () => {
      const matches = [{
        missingSkills: Array.from({ length: 15 }, (_, i) => ({
          skillId: `skill${i}`,
          skill: { name: `Skill ${i}` },
          requiredLevel: 5,
        })),
      }];
      const claims = Array.from({ length: 15 }, (_, i) => ({
        skillId: `skill${i}`,
        skill: { name: `Skill ${i}` },
        verifiedLevel: 0,
        selfRatedLevel: 0,
      }));
      const gaps = buildSkillGaps(matches, claims);
      assert.strictEqual(gaps.length, 10);
    });
  });

  describe('shapeVerifiedSkills', () => {
    test('filters only verified claims with verifiedLevel', () => {
      const claims = [
        { skillId: 'js', skill: { name: 'JavaScript' }, verifiedLevel: 3, verifiedScore: 85, verifiedAt: new Date(), selfRatedLevel: 4 },
        { skillId: 'py', skill: { name: 'Python' }, verifiedLevel: null, verifiedScore: null, verifiedAt: null, selfRatedLevel: 3 },
      ];
      const result = shapeVerifiedSkills(claims);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].state, 'verified');
      assert.strictEqual(result[0].level, 3);
      assert.strictEqual(result[0].proficiency, 85);
    });

    test('includes all verified fields', () => {
      const now = new Date('2024-01-15');
      const claims = [{
        skillId: 'js',
        skill: { name: 'JavaScript' },
        verifiedLevel: 3,
        verifiedScore: 85.5,
        verifiedAt: now,
        selfRatedLevel: 4,
      }];
      const result = shapeVerifiedSkills(claims);
      assert.strictEqual(result[0].id, 'js');
      assert.strictEqual(result[0].name, 'JavaScript');
      assert.strictEqual(result[0].proficiency, 85.5);
      assert.strictEqual(result[0].level, 3);
      assert.strictEqual(result[0].state, 'verified');
      assert.strictEqual(result[0].lastAssessedAt.toISOString(), now.toISOString());
    });
  });

  describe('buildNextAction', () => {
    const baseCtx = {
      claims: [{ skillId: 'js', skill: { name: 'JavaScript' }, selfRatedLevel: 3, verifiedLevel: null }],
      matches: [{ jobId: 'j1', title: 'Frontend Dev', companyName: 'Acme', eligibilityScore: 80, eligibilityLabel: 'eligible' }],
      roadmap: null,
    };

    test('profile < 60% -> complete next missing section', () => {
      const ctx = {
        ...baseCtx,
        profile: { basicInfo: { name: 'John' }, educationEntries: [], experienceEntries: [], skillClaims: [] },
        profileCompletion: { percent: 40, missingSections: ['basicInfo', 'educationEntries'] },
      };
      const action = buildNextAction(ctx);
      assert.strictEqual(action.id, 'complete-basicInfo');
      assert.ok(action.title.includes('Complete Basic Info'));
    });

    test('no skills claimed -> add skills', () => {
      const ctx = { ...baseCtx, profileCompletion: { percent: 80, missingSections: [] }, claims: [] };
      const action = buildNextAction(ctx);
      assert.strictEqual(action.id, 'add-skills');
    });

    test('unverified claim -> take assessment', () => {
      const ctx = { ...baseCtx, profileCompletion: { percent: 80, missingSections: [] }, claims: [{ skillId: 'js', skill: { name: 'JavaScript' }, selfRatedLevel: 3, verifiedLevel: null }] };
      const action = buildNextAction(ctx);
      assert.strictEqual(action.id, 'assess-js');
      assert.ok(action.title.includes('Assessment for JavaScript'));
    });

    test('failed claim with no roadmap -> generate roadmap', () => {
      const ctx = {
        ...baseCtx,
        profileCompletion: { percent: 80, missingSections: [] },
        claims: [{ skillId: 'js', skill: { name: 'JavaScript' }, selfRatedLevel: 4, verifiedLevel: 2 }],
        roadmap: null,
      };
      const action = buildNextAction(ctx);
      assert.strictEqual(action.id, 'roadmap-js');
      assert.ok(action.title.includes('Generate Roadmap for JavaScript'));
    });

    test('active roadmap -> continue current step', () => {
      const ctx = {
        ...baseCtx,
        profileCompletion: { percent: 80, missingSections: [] },
        claims: [{ skillId: 'js', skill: { name: 'JavaScript' }, selfRatedLevel: 3, verifiedLevel: 3 }],
        roadmap: { id: 'r1', targetSkill: 'JavaScript', overallProgress: 40, currentStep: { id: 's1', title: 'Learn React' } },
      };
      const action = buildNextAction(ctx);
      assert.strictEqual(action.id, 'roadmap-step-s1');
      assert.ok(action.title.includes('Continue: Learn React'));
    });

    test('top job match as fallback', () => {
      const ctx = {
        ...baseCtx,
        profileCompletion: { percent: 80, missingSections: [] },
        claims: [{ skillId: 'js', skill: { name: 'JavaScript' }, selfRatedLevel: 3, verifiedLevel: 3 }],
        roadmap: null,
        matches: [{ jobId: 'j1', title: 'Frontend Dev', companyName: 'Acme', eligibilityScore: 80, eligibilityLabel: 'eligible' }],
      };
      const action = buildNextAction(ctx);
      assert.strictEqual(action.id, 'job-j1');
      assert.ok(action.title.includes('Apply to Frontend Dev at Acme'));
    });

    test('returns null when no action applicable', () => {
      const ctx = {
        ...baseCtx,
        profileCompletion: { percent: 80, missingSections: [] },
        claims: [{ skillId: 'js', skill: { name: 'JavaScript' }, selfRatedLevel: 3, verifiedLevel: 3 }],
        roadmap: null,
        matches: [],
      };
      const action = buildNextAction(ctx);
      assert.strictEqual(action, null);
    });
  });

  describe('initials', () => {
    test('returns first two letters for single name', () => {
      assert.strictEqual(initials('John'), 'JO');
    });

    test('returns first and last initial', () => {
      assert.strictEqual(initials('John Doe'), 'JD');
    });

    test('handles middle names', () => {
      assert.strictEqual(initials('John Michael Doe'), 'JD');
    });

    test('handles empty/undefined', () => {
      assert.strictEqual(initials(''), '??');
      assert.strictEqual(initials(null), '??');
      assert.strictEqual(initials(undefined), '??');
    });

    test('handles extra spaces', () => {
      assert.strictEqual(initials('  John   Doe  '), 'JD');
    });
  });
});