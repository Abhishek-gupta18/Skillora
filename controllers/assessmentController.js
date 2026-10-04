const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPassThresholdForLevel, getDifficultyForLevel } = require('../utils/skillLevelBands');

async function startSession(req, res, next) {
  try {
    const { skillId } = req.body;
    const profileId = req.profile.id;

    const skillClaim = await prisma.skillClaim.findUnique({
      where: { profileId_skillId: { profileId, skillId } },
      select: { selfRatedLevel: true },
    });

    if (!skillClaim) {
      return res.status(422).json({
        success: false,
        message: 'You must claim this skill before taking an assessment for it.',
      });
    }

    const existingSession = await prisma.assessmentSession.findFirst({
      where: { profileId, skillId, status: 'IN_PROGRESS' },
    });

    if (existingSession) {
      if (new Date() < existingSession.expiresAt) {
        return res.status(409).json({
          success: false,
          message: 'You already have an assessment in progress for this skill',
          sessionId: existingSession.id,
        });
      } else {
        await prisma.assessmentSession.update({
          where: { id: existingSession.id },
          data: { status: 'EXPIRED' },
        });
      }
    }

    const targetLevel = skillClaim.selfRatedLevel;
    const passThresholdPercent = getPassThresholdForLevel(targetLevel);
    const difficulty = getDifficultyForLevel(targetLevel);

    const questions = await prisma.$queryRaw`
      SELECT id, "promptText", options, difficulty
      FROM "Question"
      WHERE "skillId" = ${skillId} AND difficulty = ${difficulty}::"QuestionDifficulty"
      ORDER BY RANDOM()
      LIMIT 10
    `;
    // Prisma Client has no built-in "random sample" query method.
    // Using $queryRaw with ORDER BY RANDOM() LIMIT 10 is the standard
    // PostgreSQL approach for efficient random sampling at the database level.
    // Tagged-template $queryRaw auto-parameterizes values (skillId, difficulty
    // are server-resolved, not client input), preventing SQL injection.

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const session = await prisma.assessmentSession.create({
      data: {
        profileId,
        skillId,
        targetLevel,
        passThresholdPercent,
        expiresAt,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        skillId: session.skillId,
        targetLevel: session.targetLevel,
        expiresAt: session.expiresAt,
        questions: questions.map(q => ({
          id: q.id,
          promptText: q.promptText,
          options: q.options,
          difficulty: q.difficulty,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getSessionQuestions(req, res, next) {
  try {
    const { sessionId } = req.params;
    const profileId = req.profile.id;

    const session = await prisma.assessmentSession.findFirst({
      where: { id: sessionId, profileId },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(409).json({
        success: false,
        message: 'This assessment session is no longer active',
      });
    }

    if (new Date() > session.expiresAt) {
      await prisma.assessmentSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      return res.status(409).json({
        success: false,
        message: 'This assessment session has expired',
      });
    }

    const answers = await prisma.assessmentAnswer.findMany({
      where: { sessionId },
      select: { id: true, questionId: true, selectedOptionIndex: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        answers,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function submitAnswer(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { questionId, selectedOptionIndex } = req.body;
    const profileId = req.profile.id;

    const session = await prisma.assessmentSession.findFirst({
      where: { id: sessionId, profileId },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(409).json({
        success: false,
        message: 'This assessment session is no longer active',
      });
    }

    if (new Date() > session.expiresAt) {
      await prisma.assessmentSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      return res.status(409).json({
        success: false,
        message: 'This assessment session has expired',
      });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { skillId: true, options: true, correctOptionIndex: true },
    });

    if (!question) {
      return res.status(422).json({ success: false, message: 'Question not found' });
    }

    if (question.skillId !== session.skillId) {
      return res.status(422).json({ success: false, message: 'Invalid question for this session' });
    }

    if (selectedOptionIndex >= question.options.length) {
      return res.status(422).json({ success: false, message: 'selectedOptionIndex out of bounds' });
    }

    const isCorrect = selectedOptionIndex === question.correctOptionIndex;

    await prisma.assessmentAnswer.upsert({
      where: { sessionId_questionId: { sessionId, questionId } },
      update: { selectedOptionIndex, isCorrect },
      create: { sessionId, questionId, selectedOptionIndex, isCorrect },
    });

    return res.status(200).json({
      success: true,
      data: { questionId, submitted: true },
    });
  } catch (err) {
    next(err);
  }
}

async function completeSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const profileId = req.profile.id;

    const session = await prisma.assessmentSession.findFirst({
      where: { id: sessionId, profileId },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(409).json({
        success: false,
        message: 'This assessment session is not in progress.',
      });
    }

    if (new Date() > session.expiresAt) {
      await prisma.assessmentSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      return res.status(409).json({
        success: false,
        message: 'This assessment session has expired',
      });
    }

    const answers = await prisma.assessmentAnswer.findMany({
      where: { sessionId },
      select: { isCorrect: true },
    });

    const totalAnswered = answers.length;
    const correctCount = answers.filter(a => a.isCorrect).length;
    const overallScore = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;

    const passed = overallScore >= session.passThresholdPercent;

    const updatedSession = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        score: overallScore,
        passed,
      },
    });

    // Deliberate exception to this file's normal error handling: if the SkillClaim was
    // deleted between session start and completion (edge case), the session result itself
    // is still valid and should be returned — we don't want a missing SkillClaim to fail
    // an otherwise-successful completion. This is NOT the pattern for other errors in
    // this file, which propagate normally via next(err).
    if (passed) {
      try {
        await prisma.skillClaim.update({
          where: { profileId_skillId: { profileId: session.profileId, skillId: session.skillId } },
          data: { verifiedScore: overallScore },
        });
      } catch (err) {
        console.error(
          `Failed to update SkillClaim.verifiedScore for profileId=${session.profileId}, skillId=${session.skillId}:`,
          err
        );
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: updatedSession.id,
        score: overallScore,
        passed,
        passThresholdPercent: session.passThresholdPercent,
        correctCount,
        totalAnswered,
      },
    });
  } catch (err) {
    next(err);
  }
}
module.exports = {
  startSession: asyncHandler(startSession),
  getSessionQuestions: asyncHandler(getSessionQuestions),
  submitAnswer: asyncHandler(submitAnswer),
  completeSession: asyncHandler(completeSession),
};