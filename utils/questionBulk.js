const { balanceCorrectPositions, getDistribution } = require('./questionBalance');

/**
 * Validate, de-duplicate and balance a batch of admin-supplied questions.
 * Input items:  { promptText, options, correctOptionIndex }
 * Returns:      { questions: [{ promptText, options, correctOptionIndex }], skipped: [{ promptText, reason }], distribution }
 * Throws if the batch is empty/too large, if nothing valid remains, or if balancing ever changes
 * the TEXT of a correct answer (data-integrity guard).
 */
function prepareBulkQuestions(questions, seedString) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('questions must be a non-empty array');
  }
  if (questions.length > 100) {
    throw new Error('Maximum 100 questions per bulk insert');
  }

  const seenPrompts = new Set();
  const valid = [];
  const skipped = [];

  for (const q of questions) {
    const rawPrompt = q && typeof q.promptText === 'string' ? q.promptText : '';
    const promptText = rawPrompt.trim();
    const skip = (reason) => skipped.push({ promptText, reason });

    if (!promptText) { skip('promptText is required'); continue; }
    if (seenPrompts.has(promptText)) { skip('duplicate promptText in batch'); continue; }
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      skip('options must be 2-6 strings'); continue;
    }

    let badOption = null;
    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      if (typeof opt !== 'string' || opt.trim().length === 0) { badOption = `options[${j}] must be a non-empty string`; break; }
      if (opt.trim().length > 300) { badOption = `options[${j}] exceeds 300 characters`; break; }
    }
    if (badOption) { skip(badOption); continue; }

    if (!Number.isInteger(q.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
      skip('correctOptionIndex out of bounds'); continue;
    }

    const options = q.options.map((o) => o.trim());
    valid.push({ promptText, options, correctOptionIndex: q.correctOptionIndex, correctText: options[q.correctOptionIndex] });
    seenPrompts.add(promptText);
  }

  if (valid.length === 0) {
    throw new Error('No valid questions to insert after validation');
  }

  const balanced = balanceCorrectPositions(
    valid.map((v) => ({ promptText: v.promptText, options: v.options, correct: v.correctOptionIndex })),
    seedString
  );

  const result = valid.map((v, i) => {
    const b = balanced[i];
    if (!b || !Array.isArray(b.options) || b.options[b.correct] !== v.correctText) {
      throw new Error(`Correct answer text changed during balancing for "${v.promptText}"`);
    }
    if (b.options.length !== v.options.length || b.options.some((o) => typeof o !== 'string' || o.length === 0)) {
      throw new Error(`Invalid options after balancing for "${v.promptText}"`);
    }
    return { promptText: b.promptText, options: b.options, correctOptionIndex: b.correct };
  });

  const distribution = getDistribution(result.map((r) => ({ options: r.options, correct: r.correctOptionIndex })));
  return { questions: result, skipped, distribution };
}

module.exports = { prepareBulkQuestions };