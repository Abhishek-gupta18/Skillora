require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');
const { balanceCorrectPositions, getDistribution, checkDistribution } = require('../utils/questionBalance');

const QUESTIONS_DIR = path.join(__dirname, 'questions');

function runCheckOnly() {
  const files = fs.readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith('.js'));

  let allPassed = true;

  for (const file of files) {
    const { skill, difficulty, questions } = require(path.join(QUESTIONS_DIR, file));

    const balancedQuestions = balanceCorrectPositions(questions, file);
    const dist = getDistribution(balancedQuestions);
    console.log(`File ${file}: correct index distribution after balancing:`, dist);

    if (!checkDistribution(balancedQuestions)) {
      console.error(`File ${file}: FAILED distribution check — some index exceeds 40% of non-pinned questions.`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    process.exit(1);
  } else {
    console.log('All files passed distribution check.');
  }
}

async function main() {
  const isCheckOnly = process.argv.includes('--check');

  if (isCheckOnly) {
    runCheckOnly();
    return;
  }

  const files = fs.readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith('.js'));

  let created = 0;
  let skipped = 0;

  for (const file of files) {
    const { skill, difficulty, questions } = require(path.join(QUESTIONS_DIR, file));

    const skillRecord = await prisma.skill.findUnique({ where: { name: skill } });
    if (!skillRecord) {
      console.error(`Skill "${skill}" not found in DB — skipped ${file}. Run npm run prisma:seed first.`);
      continue;
    }

    const expectedDifficulty = file.match(/-(easy|medium|hard)\.js$/);
    if (!expectedDifficulty || expectedDifficulty[1].toUpperCase() !== difficulty) {
      console.error(`File ${file}: difficulty "${difficulty}" does not match filename convention — skipped.`);
      continue;
    }

    const balancedQuestions = balanceCorrectPositions(questions, file);
    const dist = getDistribution(balancedQuestions);
    console.log(`File ${file}: correct index distribution after balancing:`, dist);

    if (!checkDistribution(balancedQuestions)) {
      console.error(`File ${file}: FAILED distribution check — some index exceeds 40% of non-pinned questions.`);
      process.exit(1);
    }

    for (const q of balancedQuestions) {
      if (!q.prompt || !Array.isArray(q.options) || q.options.length < 2 || typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length) {
        console.error(`File ${file}: malformed question "${q.prompt || '(missing prompt)'}" — skipped.`);
        continue;
      }

      const existing = await prisma.question.findFirst({
        where: { skillId: skillRecord.id, promptText: q.prompt, difficulty },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.question.create({
        data: {
          skillId: skillRecord.id,
          promptText: q.prompt,
          options: q.options,
          correctOptionIndex: q.correct,
          difficulty,
        },
      });
      created++;
    }
  }

  console.log(`Question seed complete: ${created} created, ${skipped} already present.`);
}

main()
  .catch((e) => {
    console.error('Question seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => {
    if (!process.argv.includes('--check')) {
      prisma.$disconnect();
    }
  });