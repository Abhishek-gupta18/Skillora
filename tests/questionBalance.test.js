const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { balanceCorrectPositions, isPinnedQuestion, getDistribution, checkDistribution } = require('../utils/questionBalance');

const QUESTIONS_DIR = path.join(__dirname, '../prisma/questions');

function loadQuestionsFromFile(filename) {
  const filePath = path.join(QUESTIONS_DIR, filename);
  return require(filePath).questions;
}

describe('questionBalance', () => {
  describe('isPinnedQuestion', () => {
    test('detects "all of the above"', () => {
      const q = {
        options: ['A', 'B', 'C', 'All of the above'],
        correct: 3,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });

    test('detects "none of the above"', () => {
      const q = {
        options: ['A', 'B', 'C', 'None of the above'],
        correct: 3,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });

    test('detects "both A and B"', () => {
      const q = {
        options: ['A', 'B', 'Both A and B', 'D'],
        correct: 2,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });

    test('detects case-insensitive', () => {
      const q = {
        options: ['A', 'B', 'ALL OF THE ABOVE'],
        correct: 2,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });

    test('returns false for regular questions', () => {
      const q = {
        options: ['A', 'B', 'C', 'D'],
        correct: 0,
      };
      assert.strictEqual(isPinnedQuestion(q), false);
    });
  });

  describe('balanceCorrectPositions', () => {
    test('preserves correct answer TEXT for every question', () => {
      const questions = [
        { options: ['A', 'B', 'C', 'D'], correct: 0 },
        { options: ['W', 'X', 'Y', 'Z'], correct: 1 },
        { options: ['1', '2', '3', '4'], correct: 2 },
        { options: ['a', 'b', 'c', 'd'], correct: 3 },
      ];
      const balanced = balanceCorrectPositions(questions, 'test-seed');
      for (let i = 0; i < questions.length; i++) {
        const originalCorrectText = questions[i].options[questions[i].correct];
        const newCorrectText = balanced[i].options[balanced[i].correct];
        assert.strictEqual(originalCorrectText, newCorrectText, `Question ${i}: correct answer text changed`);
      }
    });

    test('same seed produces same output', () => {
      const questions = [
        { options: ['A', 'B', 'C', 'D'], correct: 0 },
        { options: ['W', 'X', 'Y', 'Z'], correct: 1 },
        { options: ['1', '2', '3', '4'], correct: 2 },
        { options: ['a', 'b', 'c', 'd'], correct: 3 },
        { options: ['p', 'q', 'r', 's'], correct: 0 },
        { options: ['u', 'v', 'w', 'x'], correct: 1 },
        { options: ['e', 'f', 'g', 'h'], correct: 2 },
        { options: ['i', 'j', 'k', 'l'], correct: 3 },
        { options: ['m', 'n', 'o', 'p'], correct: 0 },
        { options: ['q', 'r', 's', 't'], correct: 1 },
        { options: ['u', 'v', 'w', 'x'], correct: 2 },
        { options: ['y', 'z', 'a', 'b'], correct: 3 },
        { options: ['c', 'd', 'e', 'f'], correct: 0 },
        { options: ['g', 'h', 'i', 'j'], correct: 1 },
        { options: ['k', 'l', 'm', 'n'], correct: 2 },
      ];
      const result1 = balanceCorrectPositions(questions, 'fixed-seed');
      const result2 = balanceCorrectPositions(questions, 'fixed-seed');
      for (let i = 0; i < questions.length; i++) {
        assert.deepStrictEqual(result1[i], result2[i], `Question ${i} differs between runs`);
      }
    });

    test('different seeds produce different distributions (usually)', () => {
      const questions = Array.from({ length: 15 }, (_, i) => ({
        options: [`A${i}`, `B${i}`, `C${i}`, `D${i}`],
        correct: i % 4,
      }));
      const result1 = balanceCorrectPositions(questions, 'seed-a');
      const result2 = balanceCorrectPositions(questions, 'seed-b');
      const correct1 = result1.map(q => q.correct);
      const correct2 = result2.map(q => q.correct);
      assert.notDeepStrictEqual(correct1, correct2);
    });

    test('pinned questions are untouched', () => {
      const questions = [
        { options: ['A', 'B', 'C', 'All of the above'], correct: 3 },
        { options: ['W', 'X', 'Y', 'Z'], correct: 1 },
      ];
      const balanced = balanceCorrectPositions(questions, 'test-seed');
      assert.deepStrictEqual(balanced[0], questions[0], 'Pinned question was modified');
      assert.notDeepStrictEqual(balanced[1], questions[1], 'Non-pinned question should be modified');
    });

    test('pinned questions keep their correct index', () => {
      const questions = [
        { options: ['A', 'B', 'C', 'All of the above'], correct: 3 },
        { options: ['W', 'X', 'Y', 'None of the above'], correct: 3 },
      ];
      const balanced = balanceCorrectPositions(questions, 'test-seed');
      assert.strictEqual(balanced[0].correct, 3);
      assert.strictEqual(balanced[1].correct, 3);
    });

    test('evenness on real prisma/questions/*.js files', () => {
      const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.js'));
      for (const file of files) {
        const questions = loadQuestionsFromFile(file);
        const balanced = balanceCorrectPositions(questions, file);
        const passed = checkDistribution(balanced);
        assert.strictEqual(passed, true, `File ${file} failed distribution check`);
      }
    });

    test('3-option question deeply equal in mixed file (fifteen 4-option + one 3-option)', () => {
      const questions = [
        ...Array.from({ length: 15 }, (_, i) => ({
          options: [`A${i}`, `B${i}`, `C${i}`, `D${i}`],
          correct: i % 4,
        })),
        { options: ['X', 'Y', 'Z'], correct: 1 },
      ];
      const balanced = balanceCorrectPositions(questions, 'mixed-seed');
      // The 3-option question must be deeply equal to input (text and order unchanged)
      const threeOption = balanced[balanced.length - 1];
      const original = questions[questions.length - 1];
assert.deepStrictEqual(threeOption, original, '3-option question should be deeply equal to input');
    });
  });

  describe('getDistribution', () => {
    test('counts correct indices for non-pinned questions', () => {
      const questions = [
        { options: ['A', 'B', 'C', 'D'], correct: 0 },
        { options: ['W', 'X', 'Y', 'Z'], correct: 1 },
        { options: ['1', '2', '3', '4'], correct: 0 },
        { options: ['a', 'b', 'c', 'All of the above'], correct: 3 },
      ];
      const dist = getDistribution(questions);
      assert.deepStrictEqual(dist, { '0': 2, '1': 1 });
    });

    test('excludes pinned questions', () => {
      const questions = [
        { options: ['A', 'B', 'C', 'All of the above'], correct: 3 },
        { options: ['W', 'X', 'Y', 'None of the above'], correct: 3 },
      ];
      const dist = getDistribution(questions);
      assert.deepStrictEqual(dist, {});
    });
  });

  describe('checkDistribution', () => {
    test('passes when no index exceeds 40%', () => {
      const questions = [
        { options: ['A', 'B', 'C', 'D'], correct: 0 },
        { options: ['W', 'X', 'Y', 'Z'], correct: 1 },
        { options: ['1', '2', '3', '4'], correct: 2 },
        { options: ['a', 'b', 'c', 'd'], correct: 3 },
      ];
      assert.strictEqual(checkDistribution(questions), true);
    });

    test('fails when an index exceeds 40%', () => {
      const questions = [
        { options: ['A', 'B', 'C', 'D'], correct: 0 },
        { options: ['W', 'X', 'Y', 'Z'], correct: 0 },
        { options: ['1', '2', '3', '4'], correct: 0 },
        { options: ['a', 'b', 'c', 'd'], correct: 1 },
      ];
      assert.strictEqual(checkDistribution(questions), false);
    });

    test('passes for empty non-pinned list', () => {
      const questions = [
        { options: ['A', 'B', 'C', 'All of the above'], correct: 3 },
      ];
      assert.strictEqual(checkDistribution(questions), true);
    });
  });

  describe('isPinnedQuestion edge cases', () => {
    test('detects "All of the above" case-insensitive', () => {
      const q = {
        options: ['A', 'B', 'C', 'All of the above'],
        correct: 3,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });

    test('detects "None of the above" case-insensitive', () => {
      const q = {
        options: ['A', 'B', 'C', 'None of the above'],
        correct: 3,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });

    test('Java and Bash must NOT be pinned', () => {
      const q = {
        options: ['Java', 'Bash', 'C++', 'Python'],
        correct: 0,
      };
      assert.strictEqual(isPinnedQuestion(q), false);
    });

    test('a and b phrase only matches whole option text "A and B"', () => {
      const q = {
        options: ['A and B', 'C', 'D', 'E'],
        correct: 0,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });

    test('a and b phrase does NOT match "A and BC"', () => {
      const q = {
        options: ['A and BC', 'C', 'D', 'E'],
        correct: 0,
      };
      assert.strictEqual(isPinnedQuestion(q), false);
    });

    test('3-option question with "both A and B"', () => {
      const q = {
        options: ['A', 'B', 'Both A and B'],
        correct: 2,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });

    test('"None of the above." pins a question with that exact option text', () => {
      const q = {
        options: ['A', 'B', 'C', 'None of the above.'],
        correct: 3,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });

    test('"Both A and B are correct" pins a question', () => {
      const q = {
        options: ['A', 'B', 'Both A and B are correct', 'D'],
        correct: 2,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });

    // False-positive tests (F4)
    test('"Java and Bash" is NOT pinned (real-world false positive)', () => {
      const q = {
        options: ['Java and Bash', 'Python', 'Go', 'Rust'],
        correct: 0,
      };
      assert.strictEqual(isPinnedQuestion(q), false);
    });

    test('"Data and Base" is NOT pinned (real-world false positive)', () => {
      const q = {
        options: ['Data and Base', 'X', 'Y', 'Z'],
        correct: 0,
      };
      assert.strictEqual(isPinnedQuestion(q), false);
    });

    test('"A and B" IS pinned (Python-style option "a and b" intentionally pinned as safe direction)', () => {
      const q = {
        options: ['A and B', 'C', 'D', 'E'],
        correct: 0,
      };
      assert.strictEqual(isPinnedQuestion(q), true);
    });
  });
});