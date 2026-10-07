function calculateRoadmapProgress(totalSteps, completedCount) {
  // percent is always computed against the template's current step count,
  // so steps an admin adds later are correctly counted as not-yet-completed
  // for existing assignments.
  const progressPercent = totalSteps === 0 ? 0 : Math.round((completedCount / totalSteps) * 100);
  return { totalSteps, completedCount, progressPercent };
}

module.exports = { calculateRoadmapProgress };