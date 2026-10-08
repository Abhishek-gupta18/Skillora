const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { calculateRoadmapProgress } = require('../services/roadmapProgressService');

async function requestRoadmap(req, res, next) {
  const { skillId } = req.body;
  const profileId = req.profile.id;

  const session = await prisma.assessmentSession.findFirst({
    where: {
      profileId,
      skillId,
      status: 'COMPLETED',
    },
    orderBy: { completedAt: 'desc' },
  });

  if (!session || session.passed !== false) {
    return res.status(422).json({
      success: false,
      message: 'A roadmap is only available after an unsuccessful assessment for this skill.',
    });
  }

  const templateLevel = session.targetLevel;

  const template = await prisma.roadmapTemplate.findUnique({
    where: {
      skillId_targetLevel: {
        skillId,
        targetLevel: templateLevel,
      },
    },
    include: {
      steps: true,
    },
  });

  if (!template || template.steps.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No roadmap is available yet for this skill and level.',
    });
  }

  const existingAssignment = await prisma.roadmapAssignment.findUnique({
    where: {
      profileId_roadmapTemplateId: {
        profileId,
        roadmapTemplateId: template.id,
      },
    },
  });

  if (existingAssignment) {
    if (existingAssignment.status === 'ACTIVE') {
      return res.status(409).json({
        success: false,
        message: 'You are already following this roadmap',
        assignmentId: existingAssignment.id,
      });
    }
    if (existingAssignment.status === 'COMPLETED') {
      return res.status(409).json({
        success: false,
        message: 'You have already completed this roadmap',
      });
    }
    if (existingAssignment.status === 'ABANDONED') {
      const reactivated = await prisma.roadmapAssignment.update({
        where: { id: existingAssignment.id },
        data: { status: 'ACTIVE', completedAt: null },
      });
      return res.status(200).json({
        success: true,
        assignmentId: reactivated.id,
        reactivated: true,
      });
    }
  }

  try {
    const assignment = await prisma.$transaction(async (tx) => {
      const newAssignment = await tx.roadmapAssignment.create({
        data: {
          profileId,
          roadmapTemplateId: template.id,
        },
      });

      await tx.roadmapStepProgress.createMany({
        data: template.steps.map((step) => ({
          roadmapAssignmentId: newAssignment.id,
          roadmapStepId: step.id,
          isCompleted: false,
        })),
      });

      return newAssignment;
    });

    return res.status(201).json({
      success: true,
      assignmentId: assignment.id,
      templateId: template.id,
      title: template.title,
      totalSteps: template.steps.length,
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'You are already following this roadmap',
      });
    }
    throw err;
  }
}

async function listMyRoadmaps(req, res, next) {
  const profileId = req.profile.id;

  const assignments = await prisma.roadmapAssignment.findMany({
    where: { profileId },
    include: {
      roadmapTemplate: {
        select: {
          title: true,
          targetLevel: true,
          skill: {
            select: { name: true },
          },
        },
      },
      _count: {
        select: {
          stepProgress: {
            where: { isCompleted: true },
          },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  const totalStepsMap = new Map();
  const templateIds = [...new Set(assignments.map((a) => a.roadmapTemplateId))];
  const templatesWithStepCount = await prisma.roadmapTemplate.findMany({
    where: { id: { in: templateIds } },
    select: { id: true, _count: { select: { steps: true } } },
  });
  templatesWithStepCount.forEach((t) => totalStepsMap.set(t.id, t._count.steps));

  const data = assignments.map((a) => {
    const totalSteps = totalStepsMap.get(a.roadmapTemplateId) ?? 0;
    const { totalSteps: t, completedCount, progressPercent } = calculateRoadmapProgress(
      totalSteps,
      a._count.stepProgress
    );
    return {
      assignmentId: a.id,
      title: a.roadmapTemplate.title,
      skillName: a.roadmapTemplate.skill.name,
      targetLevel: a.roadmapTemplate.targetLevel,
      status: a.status,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      totalSteps: t,
      completedCount,
      progressPercent,
    };
  });

  return res.status(200).json({ success: true, data });
}

async function getMyRoadmap(req, res, next) {
  const { assignmentId } = req.params;
  const profileId = req.profile.id;

  const assignment = await prisma.roadmapAssignment.findFirst({
    where: { id: assignmentId, profileId },
    include: {
      roadmapTemplate: {
        include: {
          skill: { select: { name: true } },
          steps: { orderBy: { stepOrder: 'asc' } },
        },
      },
      stepProgress: true,
    },
  });

  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const progressMap = new Map(assignment.stepProgress.map((p) => [p.roadmapStepId, p]));

  const steps = assignment.roadmapTemplate.steps.map((step) => {
    const progress = progressMap.get(step.id);
    return {
      stepId: step.id,
      stepOrder: step.stepOrder,
      type: step.type,
      title: step.title,
      description: step.description,
      resourceUrl: step.resourceUrl,
      resourceType: step.resourceType,
      practiceQuestionCount: step.practiceQuestionCount,
      isCompleted: progress?.isCompleted ?? false,
      completedAt: progress?.completedAt ?? null,
    };
  });

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const { totalSteps: t, completedCount: c, progressPercent } = calculateRoadmapProgress(
    steps.length,
    completedCount
  );

  return res.status(200).json({
    success: true,
    assignmentId: assignment.id,
    title: assignment.roadmapTemplate.title,
    skillName: assignment.roadmapTemplate.skill.name,
    targetLevel: assignment.roadmapTemplate.targetLevel,
    status: assignment.status,
    progress: { totalSteps: t, completedCount: c, progressPercent },
    steps,
  });
}

async function updateStepProgress(req, res, next) {
  const { assignmentId, stepId } = req.params;
  const { isCompleted } = req.body;
  const profileId = req.profile.id;

  const assignment = await prisma.roadmapAssignment.findFirst({
    where: { id: assignmentId, profileId },
    include: { roadmapTemplate: { select: { id: true } } },
  });

  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  if (assignment.status === 'ABANDONED') {
    return res.status(409).json({
      success: false,
      message: 'This roadmap was abandoned. Request it again to resume.',
    });
  }

  const step = await prisma.roadmapStep.findFirst({
    where: {
      id: stepId,
      roadmapTemplateId: assignment.roadmapTemplateId,
    },
  });

  if (!step) {
    return res.status(404).json({ success: false, message: 'Step not found' });
  }

  const existingProgress = await prisma.roadmapStepProgress.findUnique({
    where: {
      roadmapAssignmentId_roadmapStepId: {
        roadmapAssignmentId: assignmentId,
        roadmapStepId: stepId,
      },
    },
  });

  const wasCompleted = existingProgress?.isCompleted === true;
  const willBeCompleted = isCompleted === true;

  let completedAt;
  if (willBeCompleted && !wasCompleted) {
    completedAt = new Date();
  } else if (!willBeCompleted) {
    completedAt = null;
  } else {
    completedAt = existingProgress.completedAt;
  }

  await prisma.roadmapStepProgress.upsert({
    where: {
      roadmapAssignmentId_roadmapStepId: {
        roadmapAssignmentId: assignmentId,
        roadmapStepId: stepId,
      },
    },
    update: { isCompleted, completedAt },
    create: { roadmapAssignmentId: assignmentId, roadmapStepId: stepId, isCompleted, completedAt },
  });

  const totalSteps = await prisma.roadmapStep.count({
    where: { roadmapTemplateId: assignment.roadmapTemplateId },
  });

  const completedCount = await prisma.roadmapStepProgress.count({
    where: { roadmapAssignmentId: assignmentId, isCompleted: true },
  });

  const { totalSteps: t, completedCount: c, progressPercent } = calculateRoadmapProgress(
    totalSteps,
    completedCount
  );

  let newStatus = assignment.status;
  let completedAtAssignment = assignment.completedAt;

  const allStepsComplete = c >= t && t > 0;
  const assignmentWasCompleted = assignment.status === 'COMPLETED';

  if (allStepsComplete && !assignmentWasCompleted) {
    newStatus = 'COMPLETED';
    completedAtAssignment = new Date();
  } else if (assignmentWasCompleted && !allStepsComplete) {
    newStatus = 'ACTIVE';
    completedAtAssignment = null;
  }

  if (newStatus !== assignment.status || completedAtAssignment !== assignment.completedAt) {
    await prisma.roadmapAssignment.update({
      where: { id: assignmentId },
      data: { status: newStatus, completedAt: completedAtAssignment },
    });
  }

  return res.status(200).json({
    success: true,
    stepId,
    isCompleted,
    assignmentStatus: newStatus,
    progress: { totalSteps: t, completedCount: c, progressPercent },
  });
}

async function abandonRoadmap(req, res, next) {
  const { assignmentId } = req.params;
  const profileId = req.profile.id;

  const assignment = await prisma.roadmapAssignment.findFirst({
    where: { id: assignmentId, profileId },
  });

  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  if (assignment.status !== 'ACTIVE') {
    return res.status(409).json({
      success: false,
      message: 'Only an active roadmap can be abandoned.',
    });
  }

  await prisma.roadmapAssignment.update({
    where: { id: assignmentId },
    data: { status: 'ABANDONED' },
  });

  return res.status(200).json({ success: true, assignmentId, status: 'ABANDONED' });
}

module.exports = {
  requestRoadmap: asyncHandler(requestRoadmap),
  listMyRoadmaps: asyncHandler(listMyRoadmaps),
  getMyRoadmap: asyncHandler(getMyRoadmap),
  updateStepProgress: asyncHandler(updateStepProgress),
  abandonRoadmap: asyncHandler(abandonRoadmap),
};