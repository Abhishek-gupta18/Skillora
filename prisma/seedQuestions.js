const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/prisma');

const QUESTIONS_DIR = path.join(__dirname, 'questions');

async function main() {
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

    for (const q of questions) {
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
  .finally(() => prisma.$disconnect());
