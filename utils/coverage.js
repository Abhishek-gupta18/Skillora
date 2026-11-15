const { ASSESSMENT_QUESTION_COUNT } = require('./skillLevelBands');

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

/**
 * Assemble coverage rows from grouped counts and active skills.
 * Returns array of { skillId, skillName, difficulty, activeCount, ready }
 * where ready = activeCount >= ASSESSMENT_QUESTION_COUNT * 1.5
 */
function assembleCoverage(activeSkills, groupedCounts) {
  const threshold = ASSESSMENT_QUESTION_COUNT * 1.5;
  const countMap = new Map();

  for (const row of groupedCounts) {
    const key = `${row.skillId}|${row.difficulty}`;
    countMap.set(key, row._count._all);
  }

  const coverage = [];
  for (const skill of activeSkills) {
    for (const difficulty of DIFFICULTIES) {
      const key = `${skill.id}|${difficulty}`;
      const activeCount = countMap.get(key) || 0;
      coverage.push({
        skillId: skill.id,
        skillName: skill.name,
        difficulty,
        activeCount,
        ready: activeCount >= threshold,
      });
    }
  }

  return coverage;
}

module.exports = { assembleCoverage };