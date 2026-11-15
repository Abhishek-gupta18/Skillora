const { test, describe } = require('node:test');
const assert = require('node:assert');
const { assembleCoverage } = require('../utils/coverage');

describe('assembleCoverage', () => {
  test('includes zero-count rows for every active skill x difficulty', () => {
    const activeSkills = [
      { id: 's1', name: 'JavaScript' },
      { id: 's2', name: 'Python' },
    ];

    const groupedCounts = [
      { skillId: 's1', difficulty: 'EASY', _count: { _all: 10 } },
      { skillId: 's1', difficulty: 'MEDIUM', _count: { _all: 5 } },
      { skillId: 's2', difficulty: 'HARD', _count: { _all: 20 } },
    ];

    const coverage = assembleCoverage(activeSkills, groupedCounts);

    assert.strictEqual(coverage.length, 6); // 2 skills × 3 difficulties

    // Check all combinations exist
    const combinations = new Set(coverage.map(c => `${c.skillId}|${c.difficulty}`));
    assert.ok(combinations.has('s1|EASY'));
    assert.ok(combinations.has('s1|MEDIUM'));
    assert.ok(combinations.has('s1|HARD'));
    assert.ok(combinations.has('s2|EASY'));
    assert.ok(combinations.has('s2|MEDIUM'));
    assert.ok(combinations.has('s2|HARD'));

    // Check counts
    const s1Easy = coverage.find(c => c.skillId === 's1' && c.difficulty === 'EASY');
    assert.strictEqual(s1Easy.activeCount, 10);

    const s1Hard = coverage.find(c => c.skillId === 's1' && c.difficulty === 'HARD');
    assert.strictEqual(s1Hard.activeCount, 0); // zero count

    const s2Hard = coverage.find(c => c.skillId === 's2' && c.difficulty === 'HARD');
    assert.strictEqual(s2Hard.activeCount, 20);
  });

  test('ready flag at 15 active (ASSESSMENT_QUESTION_COUNT=10, threshold=15)', () => {
    const activeSkills = [{ id: 's1', name: 'JS' }];
    const groupedCounts = [
      { skillId: 's1', difficulty: 'EASY', _count: { _all: 14 } },
      { skillId: 's1', difficulty: 'MEDIUM', _count: { _all: 15 } },
      { skillId: 's1', difficulty: 'HARD', _count: { _all: 16 } },
    ];

    const coverage = assembleCoverage(activeSkills, groupedCounts);

    const easy = coverage.find(c => c.difficulty === 'EASY');
    assert.strictEqual(easy.ready, false);

    const medium = coverage.find(c => c.difficulty === 'MEDIUM');
    assert.strictEqual(medium.ready, true);

    const hard = coverage.find(c => c.difficulty === 'HARD');
    assert.strictEqual(hard.ready, true);
  });

  test('empty groupedCounts returns all zero counts', () => {
    const activeSkills = [{ id: 's1', name: 'JS' }, { id: 's2', name: 'Python' }];
    const groupedCounts = [];

    const coverage = assembleCoverage(activeSkills, groupedCounts);

    assert.strictEqual(coverage.length, 6);
    for (const c of coverage) {
      assert.strictEqual(c.activeCount, 0);
      assert.strictEqual(c.ready, false);
    }
  });

  test('skillName and skillId preserved', () => {
    const activeSkills = [{ id: 'skill-123', name: 'TypeScript' }];
    const groupedCounts = [{ skillId: 'skill-123', difficulty: 'EASY', _count: { _all: 5 } }];

    const coverage = assembleCoverage(activeSkills, groupedCounts);

    const row = coverage[0];
    assert.strictEqual(row.skillId, 'skill-123');
    assert.strictEqual(row.skillName, 'TypeScript');
  });
});