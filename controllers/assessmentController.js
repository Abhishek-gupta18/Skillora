const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPassThresholdForLevel, getDifficultyForLevel, ASSESSMENT_QUESTION_COUNT } = require('../utils/skillLevelBands');
const { matchedData } = require('express-validator');
const { isRetakeRequired, countRetakeEligibleSessions } = require('../utils/retakeGate');

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

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // Row lock: serialize concurrent assessment starts per (profileId, skillId).
      // This prevents race conditions where two starts could both create
      // IN_PROGRESS sessions or both consume the same grant.
      await tx.$queryRaw`
        SELECT id FROM "SkillClaim" WHERE "profileId" = ${profileId} AND "skillId" = ${skillId} FOR UPDATE
      `;

      // Re-read targetLevel from SkillClaim INSIDE the tx after the row lock
      const lockedSkillClaim = await tx.skillClaim.findUnique({
        where: { profileId_skillId: { profileId, skillId } },
        select: { selfRatedLevel: true },
      });

      if (!lockedSkillClaim) {
        return { halt: { status: 422, body: { success: false, message: 'You must claim this skill before taking an assessment for it.' } } };
      }

      const targetLevel = lockedSkillClaim.selfRatedLevel;
      const passThresholdPercent = getPassThresholdForLevel(targetLevel);
      const difficulty = getDifficultyForLevel(targetLevel);

      // IN_PROGRESS check with expired self-heal (kept inside tx after lock)
      const existingSession = await tx.assessmentSession.findFirst({
        where: { profileId, skillId, status: 'IN_PROGRESS' },
      });

      if (existingSession) {
        if (new Date() < existingSession.expiresAt) {
          return { halt: { status: 409, body: { success: false, message: 'You already have an assessment in progress for this skill', data: { sessionId: existingSession.id } } } };
        } else {
          await tx.assessmentSession.update({
            where: { id: existingSession.id },
            data: { status: 'EXPIRED' },
          });
        }
      }

      const priorSessions = await tx.assessmentSession.findMany({
        where: {
          profileId,
          skillId,
          status: { in: ['COMPLETED', 'EXPIRED'] },
        },
        select: { targetLevel: true },
      });

      const completedTargetLevels = priorSessions.map(s => s.targetLevel);
      const retakeRequired = isRetakeRequired(completedTargetLevels, targetLevel);

      let unconsumedRetake = null;
      if (retakeRequired) {
        unconsumedRetake = await tx.retakeRequest.findFirst({
          where: {
            profileId,
            skillId,
            targetLevel,
            status: 'APPROVED',
            consumedAt: null,
          },
        });

        if (!unconsumedRetake) {
          return { halt: { status: 403, body: { success: false, message: 'A retake needs approval from the Skillora team. Submit a retake request.' } } };
        }
      }

      // Sample questions INSIDE the tx using the re-validated targetLevel
      const questions = await tx.$queryRaw`
        SELECT id, "promptText", options, difficulty
        FROM "Question"
        WHERE "skillId" = ${skillId} AND difficulty = ${difficulty}::"QuestionDifficulty" AND "isActive" = true
        ORDER BY RANDOM()
        LIMIT ${ASSESSMENT_QUESTION_COUNT}
      `;

      if (questions.length < ASSESSMENT_QUESTION_COUNT) {
        return { halt: { status: 422, body: { success: false, message: 'Assessment is not available yet for this skill and level.' } } };
      }

      const session = await tx.assessmentSession.create({
        data: {
          profileId,
          skillId,
          targetLevel,
          passThresholdPercent,
          expiresAt,
        },
      });

      const sessionQuestionsData = questions.map((q, index) => ({
        sessionId: session.id,
        questionId: q.id,
        position: index,
      }));

      await tx.assessmentSessionQuestion.createMany({
        data: sessionQuestionsData,
      });

      if (retakeRequired) {
        if (!unconsumedRetake) {
          const err = new Error('Retake grant not found or already consumed');
          err.code = 'RETAKE_GRANT_CONSUMED';
          err.statusCode = 409;
          throw err;
        }

        const updateResult = await tx.retakeRequest.updateMany({
          where: {
            id: unconsumedRetake.id,
            profileId,
            skillId,
            targetLevel,
            status: 'APPROVED',
            consumedAt: null,
          },
          data: { consumedAt: new Date() },
        });

        if (updateResult.count !== 1) {
          const err = new Error('Failed to consume retake grant');
          err.code = 'RETAKE_GRANT_CONSUMED';
          err.statusCode = 409;
          throw err;
        }
      }

      return { session, questions };
    });

    if (result.halt) {
      return res.status(result.halt.status).json(result.halt.body);
    }

    return res.status(201).json({
      success: true,
      data: {
        sessionId: result.session.id,
        skillId: result.session.skillId,
        targetLevel: result.session.targetLevel,
        expiresAt: result.session.expiresAt,
        questions: result.questions.map((q, index) => ({
          id: q.id,
          promptText: q.promptText,
          options: q.options,
          difficulty: q.difficulty,
          position: index,
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

    const sessionQuestions = await prisma.assessmentSessionQuestion.findMany({
      where: { sessionId },
      orderBy: { position: 'asc' },
      include: {
        question: {
          select: { id: true, promptText: true, options: true, difficulty: true },
        },
      },
    });

    const answers = await prisma.assessmentAnswer.findMany({
      where: { sessionId },
      select: { questionId: true, selectedOptionIndex: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        expiresAt: session.expiresAt,
        questions: sessionQuestions.map(sq => ({
          id: sq.question.id,
          promptText: sq.question.promptText,
          options: sq.question.options,
          difficulty: sq.question.difficulty,
          position: sq.position,
        })),
        answers: answers.map(a => ({
          questionId: a.questionId,
          selectedOptionIndex: a.selectedOptionIndex,
        })),
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

    const sessionQuestion = await prisma.assessmentSessionQuestion.findUnique({
      where: { sessionId_questionId: { sessionId, questionId } },
      include: {
        question: {
          select: { options: true, correctOptionIndex: true },
        },
      },
    });

    if (!sessionQuestion) {
      return res.status(422).json({ success: false, message: 'Invalid question for this session' });
    }

    const question = sessionQuestion.question;

    if (selectedOptionIndex < 0 || selectedOptionIndex >= question.options.length) {
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

    const now = new Date();
    if (now > session.expiresAt) {
      await prisma.assessmentSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      return res.status(409).json({
        success: false,
        message: 'This assessment session has expired',
      });
    }

    const sessionQuestions = await prisma.assessmentSessionQuestion.findMany({
      where: { sessionId },
      select: { questionId: true },
    });

    const totalQuestions = sessionQuestions.length;
    const boundQuestionIds = sessionQuestions.map(sq => sq.questionId);

    const answers = await prisma.assessmentAnswer.findMany({
      where: { sessionId, questionId: { in: boundQuestionIds } },
      select: { isCorrect: true },
    });

    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalAnswered = answers.length;
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    const passed = score >= session.passThresholdPercent;
    const completedAt = new Date();

    const updateResult = await prisma.assessmentSession.updateMany({
      where: {
        id: sessionId,
        profileId,
        status: 'IN_PROGRESS',
        expiresAt: { gt: now },
      },
      data: {
        status: 'COMPLETED',
        completedAt,
        score,
        passed,
      },
    });

    if (updateResult.count !== 1) {
      return res.status(409).json({
        success: false,
        message: 'This assessment session has already been completed or expired',
      });
    }

    if (passed) {
      try {
        const existingClaim = await prisma.skillClaim.findUnique({
          where: { profileId_skillId: { profileId: session.profileId, skillId: session.skillId } },
          select: { verifiedLevel: true, verifiedScore: true, verifiedAt: true },
        });

        const newVerifiedLevel = session.targetLevel;
        const keepExistingLevel = existingClaim?.verifiedLevel !== null && existingClaim.verifiedLevel > newVerifiedLevel;

        if (keepExistingLevel) {
          // Do not overwrite verifiedScore or verifiedAt when keeping higher existing level
          // verifiedLevel stays the same (no update needed)
        } else {
          await prisma.skillClaim.update({
            where: { profileId_skillId: { profileId: session.profileId, skillId: session.skillId } },
            data: {
              verifiedScore: score,
              verifiedLevel: newVerifiedLevel,
              verifiedAt: new Date(),
            },
          });
        }
      } catch (err) {
        console.error(
          `Failed to update SkillClaim verified fields for profileId=${session.profileId}, skillId=${session.skillId}:`,
          err
        );
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        score,
        passed,
        passThresholdPercent: session.passThresholdPercent,
        correctCount,
        totalAnswered,
        totalQuestions,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function createRetakeRequest(req, res, next) {
  try {
    const profileId = req.profile.id;
    const data = matchedData(req);
    const { sessionId, reasonType, reason, evidenceNote } = data;

    const session = await prisma.assessmentSession.findFirst({
      where: { id: sessionId, profileId },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const now = new Date();
    const effectiveStatus = (session.status === 'IN_PROGRESS' && now > session.expiresAt) ? 'EXPIRED' : session.status;

    // Persist EXPIRED when needed
    if (effectiveStatus === 'EXPIRED' && session.status === 'IN_PROGRESS') {
      await prisma.assessmentSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
    }

    // Reject genuinely active IN_PROGRESS sessions
    if (effectiveStatus === 'IN_PROGRESS') {
      return res.status(422).json({
        success: false,
        message: 'Retake requests cannot be created for active in-progress sessions',
      });
    }

    if (effectiveStatus !== 'COMPLETED' && effectiveStatus !== 'EXPIRED') {
      return res.status(422).json({
        success: false,
        message: 'Retake requests can only be created for completed or expired sessions',
      });
    }

    const skillId = session.skillId;
    const targetLevel = session.targetLevel;

    const existingPending = await prisma.retakeRequest.findFirst({
      where: {
        profileId,
        skillId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending retake request for this skill',
      });
    }

    const retakeRequest = await prisma.retakeRequest.create({
      data: {
        profileId,
        skillId,
        sessionId,
        targetLevel,
        reasonType,
        reason,
        evidenceNote: evidenceNote || null,
      },
      select: {
        id: true,
        profileId: true,
        skillId: true,
        sessionId: true,
        targetLevel: true,
        reasonType: true,
        reason: true,
        evidenceNote: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: retakeRequest,
    });
  } catch (err) {
    next(err);
  }
}

async function listRetakeRequests(req, res, next) {
  try {
    const profileId = req.profile.id;

    const requests = await prisma.retakeRequest.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        skillId: true,
        sessionId: true,
        targetLevel: true,
        reasonType: true,
        reason: true,
        evidenceNote: true,
        status: true,
        reviewedAt: true,
        reviewNote: true,
        consumedAt: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: requests,
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
  createRetakeRequest: asyncHandler(createRetakeRequest),
  listRetakeRequests: asyncHandler(listRetakeRequests),
};