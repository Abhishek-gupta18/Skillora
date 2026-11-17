const { test, describe } = require('node:test');
const assert = require('node:assert');
const { prepareBulkQuestions } = require('../utils/questionBulk');

const mk = (n, pick = () => 0) => Array.from({ length: n }, (_, i) => ({
  promptText: `Question ${i}`,
  options: [`Right ${i}`, `Wrong A ${i}`, `Wrong B ${i}`, `Wrong C ${i}`],
  correctOptionIndex: pick(i),
}));

describe('prepareBulkQuestions', () => {
  test('does not crash on a normal batch and keeps every correct answer TEXT', () => {
    const input = mk(20);
    const out = prepareBulkQuestions(input, 'seed-1');
    assert.strictEqual(out.questions.length, 20);
    assert.strictEqual(out.skipped.length, 0);
    out.questions.forEach((q, i) => {
      assert.strictEqual(q.options[q.correctOptionIndex], `Right ${i}`);
      assert.strictEqual(new Set(q.options).size, 4);
    });
  });

  test('balances answer positions (20 questions, all index 0 -> 5 per index)', () => {
    const out = prepareBulkQuestions(mk(20), 'seed-2');
    assert.deepStrictEqual(out.distribution, { 0: 5, 1: 5, 2: 5, 3: 5 });
  });

  test('empty, null and undefined options are skipped with a reason', () => {
    const bad = [
      { promptText: 'E', options: ['A', '', 'C', 'D'], correctOptionIndex: 0 },
      { promptText: 'N', options: ['A', null, 'C', 'D'], correctOptionIndex: 0 },
      { promptText: 'U', options: ['A', undefined, 'C', 'D'], correctOptionIndex: 0 },
    ];
    const out = prepareBulkQuestions([...bad, ...mk(1)], 'seed-3');
    assert.strictEqual(out.questions.length, 1);
    assert.strictEqual(out.skipped.length, 3);
    out.skipped.forEach((s) => assert.match(s.reason, /non-empty string/));
  });

  test('in-batch duplicate promptText is skipped', () => {
    const out = prepareBulkQuestions([
      { promptText: 'Same', options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 },
      { promptText: ' Same ', options: ['W', 'X', 'Y', 'Z'], correctOptionIndex: 1 },
    ], 'seed-4');
    assert.strictEqual(out.questions.length, 1);
    assert.strictEqual(out.skipped.length, 1);
    assert.match(out.skipped[0].reason, /duplicate promptText in batch/);
  });

  test('out-of-bounds correctOptionIndex is skipped, valid ones still pass', () => {
    const out = prepareBulkQuestions([
      { promptText: 'Bad', options: ['A', 'B'], correctOptionIndex: 5 },
      ...mk(2),
    ], 'seed-5');
    assert.strictEqual(out.questions.length, 2);
    assert.match(out.skipped[0].reason, /out of bounds/);
  });

  test('throws when nothing valid remains, or on empty / oversized input', () => {
    assert.throws(() => prepareBulkQuestions([{ promptText: 'Q', options: ['A'], correctOptionIndex: 0 }], 's'), /No valid questions/);
    assert.throws(() => prepareBulkQuestions([], 's'), /non-empty array/);
    assert.throws(() => prepareBulkQuestions(mk(101), 's'), /Maximum 100/);
  });

  test('same seed gives the same layout (deterministic)', () => {
    const a = prepareBulkQuestions(mk(12), 'fixed');
    const b = prepareBulkQuestions(mk(12), 'fixed');
    assert.deepStrictEqual(a.questions, b.questions);
  });
});