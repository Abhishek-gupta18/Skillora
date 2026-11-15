const { test, describe } = require('node:test');
const assert = require('node:assert');
const { isRetakeRequired, countRetakeEligibleSessions } = require('../utils/retakeGate');

describe('isRetakeRequired', () => {
  test('returns false when no prior sessions exist', () => {
    const completedTargetLevels = [];
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 1), false);
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 3), false);
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 5), false);
  });

  test('returns false when targetLevel has not been completed before', () => {
    const completedTargetLevels = [1, 2];
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 3), false);
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 4), false);
  });

  test('returns true when targetLevel has been completed before', () => {
    const completedTargetLevels = [1, 2, 3];
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 2), true);
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 3), true);
  });

  test('handles multiple completed sessions at same level', () => {
    const completedTargetLevels = [1, 2, 2, 3, 3, 3];
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 2), true);
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 3), true);
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 1), true);
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 4), false);
  });

  test('level upgrade (higher level) is not a retake', () => {
    const completedTargetLevels = [2];
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 3), false);
  });

  test('level downgrade (lower level) is a retake if that level was completed', () => {
    const completedTargetLevels = [3];
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 2), false);
    const completedTargetLevels2 = [3, 2];
    assert.strictEqual(isRetakeRequired(completedTargetLevels2, 2), true);
  });

  test('expired-only history requires approval (retake required)', () => {
    const completedTargetLevels = [2];
    assert.strictEqual(isRetakeRequired(completedTargetLevels, 2), true);
  });
});

describe('countRetakeEligibleSessions', () => {
  test('counts sessions matching targetLevel', () => {
    const sessions = [
      { targetLevel: 1 },
      { targetLevel: 2 },
      { targetLevel: 2 },
      { targetLevel: 3 },
    ];
    assert.strictEqual(countRetakeEligibleSessions(sessions, 1), 1);
    assert.strictEqual(countRetakeEligibleSessions(sessions, 2), 2);
    assert.strictEqual(countRetakeEligibleSessions(sessions, 3), 1);
    assert.strictEqual(countRetakeEligibleSessions(sessions, 4), 0);
  });

  test('returns 0 for empty sessions', () => {
    assert.strictEqual(countRetakeEligibleSessions([], 1), 0);
  });
});