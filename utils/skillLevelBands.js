function getPassThresholdForLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    throw new Error('Level must be an integer between 1 and 5');
  }
  if (level <= 2) return 70;
  if (level === 3) return 80;
  if (level === 4) return 85;
  return 90;
}

function getDifficultyForLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    throw new Error('Level must be an integer between 1 and 5');
  }
  if (level <= 2) return 'EASY';
  if (level === 3) return 'MEDIUM';
  return 'HARD';
}

module.exports = {
  getPassThresholdForLevel,
  getDifficultyForLevel,
};