function seededRandom(seed) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}

function makeRng(seedString) {
  let state = seededRandom(seedString);
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function isPinnedQuestion(question) {
  const optionTexts = question.options.map(o => o.trim());
  const combinedText = optionTexts.join(' ');
  const regex = new RegExp(
    '\\b(all|none) of the (above|these)\\b|' +
    '\\bboth\\s+[a-d]\\s+and\\s+[a-d]\\b|' +
    '\\b[a-d]\\s+and\\s+[a-d]\\b|' +  // <-- added this pattern
    '\\b[a-d]\\s+and\\s+[a-d]\\s+(only|both)\\b|' +
    '\\b(option|choice)s?\\s+[a-d]\\b',
    'i'
  );
  return regex.test(combinedText);
}

function moveCorrectOption(question, targetIndex) {
  const options = [...question.options];
  const oldIndex = question.correct;
  const correctOption = options[oldIndex];
  options.splice(oldIndex, 1);
  options.splice(targetIndex, 0, correctOption);
  return { ...question, options, correct: targetIndex };
}

function getMajorityOptionCount(questions) {
  const counts = {};
  for (const q of questions) {
    const n = q.options?.length ?? 0;
    counts[n] = (counts[n] || 0) + 1;
  }
  let majority = 0;
  let maxCount = 0;
  for (const [n, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      majority = parseInt(n, 10);
    }
  }
  return majority;
}

function balanceCorrectPositions(questions, seedString) {
  const rng = makeRng(seedString);
  const majorityOptions = getMajorityOptionCount(questions);

  const nonPinned = [];
  const pinned = [];
  const skipped = [];

  for (const q of questions) {
    const numOptions = q.options?.length ?? 0;
    if (numOptions !== majorityOptions) {
      skipped.push(q);
    } else if (isPinnedQuestion(q)) {
      pinned.push(q);
    } else {
      nonPinned.push(q);
    }
  }

  const totalNonPinned = nonPinned.length;
  if (totalNonPinned === 0) {
    return [...pinned, ...skipped];
  }

  const baseCount = Math.floor(totalNonPinned / majorityOptions);
  const remainder = totalNonPinned % majorityOptions;

  const targetCounts = Array(majorityOptions).fill(baseCount);
  for (let i = 0; i < remainder; i++) {
    targetCounts[i]++;
  }

  const positionTargets = [];
  for (let pos = 0; pos < majorityOptions; pos++) {
    for (let c = 0; c < targetCounts[pos]; c++) {
      positionTargets.push(pos);
    }
  }

  for (let i = positionTargets.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positionTargets[i], positionTargets[j]] = [positionTargets[j], positionTargets[i]];
  }

  const balancedNonPinned = nonPinned.map((q, idx) => moveCorrectOption(q, positionTargets[idx]));

  const result = [];
  let nonPinnedIdx = 0;
  for (const q of questions) {
    const numOptions = q.options?.length ?? 0;
    if (numOptions !== majorityOptions) {
      result.push(q);
    } else if (isPinnedQuestion(q)) {
      result.push(q);
    } else {
      result.push(balancedNonPinned[nonPinnedIdx++]);
    }
  }

  return result;
}

function getDistribution(questions) {
  const dist = {};
  for (const q of questions) {
    if (!isPinnedQuestion(q)) {
      dist[q.correct] = (dist[q.correct] || 0) + 1;
    }
  }
  return dist;
}

function checkDistribution(questions) {
  const dist = getDistribution(questions);
  const nonPinnedCount = questions.filter(q => !isPinnedQuestion(q)).length;
  if (nonPinnedCount === 0) return true;
  for (const [index, count] of Object.entries(dist)) {
    if (count / nonPinnedCount > 0.4) {
      return false;
    }
  }
  return true;
}

module.exports = {
  balanceCorrectPositions,
  isPinnedQuestion,
  getDistribution,
  checkDistribution,
};