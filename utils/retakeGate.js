function isRetakeRequired(completedTargetLevels, targetLevel) {
  return completedTargetLevels.includes(targetLevel);
}

function countRetakeEligibleSessions(sessions, targetLevel) {
  return sessions.filter(s => s.targetLevel === targetLevel).length;
}

module.exports = {
  isRetakeRequired,
  countRetakeEligibleSessions,
};