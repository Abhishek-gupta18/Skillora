const { balanceCorrectPositions, getDistribution } = require('./questionBalance');

/**
 * Prepare and validate bulk questions for insertion.
 * - Trims promptText
 * - Rejects empty options
 * - De-duplicates identical promptText within the batch (reports skipped)
 * - Balances correct positions
 * - Asserts correct option TEXT is unchanged and no option is undefined/null/empty
 * Returns: { questions: balancedQuestions[], skipped: { promptText: string, reason: string }[], distribution: object }
 */
function prepareBulkQuestions(questions, seedString) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('questions must be a non-empty array');
  }
  if (questions.length > 100) {
    throw new Error('Maximum 100 questions per bulk insert');
  }

  const seenPrompts = new Set();
  const toBalance = [];
  const skipped = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const prefix = `questions[${i}]`;

    // Validate required fields
    if (!q.promptText || typeof q.promptText !== 'string' || q.promptText.trim().length === 0) {
      skipped.push({ promptText: q.promptText ?? '', reason: 'promptText is required' });
      continue;
    }
    const trimmedPrompt = q.promptText.trim();

    // Check in-batch duplicate
    if (seenPrompts.has(trimmedPrompt)) {
      skipped.push({ promptText: trimmedPrompt, reason: 'duplicate promptText in batch' });
      continue;
    }

    // Validate options
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      skipped.push({ promptText: trimmedPrompt, reason: 'options must be 2-6 strings' });
      continue;
    }
    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      if (opt === undefined || opt === null || typeof opt !== 'string' || opt.trim().length === 0) {
        skipped.push({ promptText: trimmedPrompt, reason: `options[${j}] must be a non-empty string` });
        break;
      }
      if (opt.length > 300) {
        skipped.push({ promptText: trimmedPrompt, reason: `options[${j}] exceeds 300 characters` });
        break;
      }
    }
    if (skipped.length > 0 && skipped[skipped.length - 1].promptText === trimmedPrompt) {
      continue;
    }

    // Validate correctOptionIndex
    if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
      skipped.push({ promptText: trimmedPrompt, reason: 'correctOptionIndex out of bounds' });
      continue;
    }

    // Store original correct option text for assertion after balancing
    const originalCorrectText = q.options[q.correctOptionIndex];

    toBalance.push({
      promptText: trimmedPrompt,
      options: q.options.map(o => o.trim()),
      correctOptionIndex: q.correctOptionIndex,
      _originalCorrectText: originalCorrectText,
    });

    seenPrompts.add(trimmedPrompt);
  }

  if (toBalance.length === 0) {
    throw new Error('No valid questions to insert after validation');
  }

  // Balance correct positions
  const balanced = balanceCorrectPositions(
    toBalance.map(q => ({
      promptText: q.promptText,
      options: q.options,
      correct: q.correctOptionIndex,
    })),
    seedString
  );

  // Map back to expected shape and assert correct option text unchanged
  const balancedQuestions = [];
  for (let i = 0; i < toBalance.length; i++) {
    const original = toBalance[i];
    const balanced = balanced[i];

    // Assert correct option TEXT unchanged
    const balancedCorrectText = balanced.options[balanced.correct];
    if (balancedCorrectText !== original._originalCorrectText) {
      throw new Error(`Correct answer text changed for question "${original.promptText}": expected "${original._originalCorrectText}", got "${balancedCorrectText}"`);
    }

    // Assert no option is undefined/null/empty
    for (const opt of balanced.options) {
      if (opt === undefined || opt === null || opt === '') {
        throw new Error(`Empty option found in balanced question "${balanced.promptText}"`);
      }
    }

    balancedQuestions.push({
      promptText: balanced.promptText,
      options: balanced.options,
      correctOptionIndex: balanced.correct,
    });
  }

  // Compute real distribution counts
  const distribution = getDistribution(
    balancedQuestions.map(q => ({ options: q.options, correct: q.correctOptionIndex }))
  );

  return { questions: balancedQuestions, skipped, distribution };
}

module.exports = { prepareBulkQuestions };