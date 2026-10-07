const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

async function createRoadmapTemplate(req, res, next) {
  try {
    const { skillId, targetLevel, title, description } = req.body;

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });
    if (!skill) {
      return res.status(404).json({ success: false, message: 'Skill not found' });
    }

    try {
      const result = await prisma.roadmapTemplate.create({
        data: {
          skillId,
          targetLevel,
          title,
          description: description ?? null,
        },
      });
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'A roadmap for this skill and level already exists',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function listRoadmapTemplates(req, res, next) {
  try {
    const templates = await prisma.roadmapTemplate.findMany({
      include: {
        skill: true,
      },
    });
    return res.status(200).json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
}

async function getRoadmapTemplate(req, res, next) {
  try {
    const template = await prisma.roadmapTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        skill: true,
      },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Roadmap template not found' });
    }
    return res.status(200).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
}

async function updateRoadmapTemplate(req, res, next) {
  try {
    const template = await prisma.roadmapTemplate.findUnique({
      where: { id: req.params.id },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Roadmap template not found' });
    }

    if (req.body.skillId !== undefined) {
      const skill = await prisma.skill.findUnique({
        where: { id: req.body.skillId },
      });
      if (!skill) {
        return res.status(404).json({ success: false, message: 'Skill not found' });
      }
    }

    const data = {};
    if (req.body.skillId !== undefined) data.skillId = req.body.skillId;
    if (req.body.targetLevel !== undefined) data.targetLevel = req.body.targetLevel;
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.description !== undefined) data.description = req.body.description;

    try {
      const result = await prisma.roadmapTemplate.update({
        where: { id: req.params.id },
        data,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'A roadmap for this skill and level already exists',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function deleteRoadmapTemplate(req, res, next) {
  try {
    const template = await prisma.roadmapTemplate.findUnique({
      where: { id: req.params.id },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Roadmap template not found' });
    }

    try {
      await prisma.roadmapTemplate.delete({
        where: { id: req.params.id },
      });
      return res.status(200).json({ success: true, message: 'Roadmap template deleted' });
    } catch (err) {
      if (err.code === 'P2003') {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete a roadmap template that candidates are following',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function addRoadmapStep(req, res, next) {
  try {
    const { templateId } = req.params;
    const { stepOrder, type, title, description, resourceUrl, resourceType, practiceQuestionCount } = req.body;

    const template = await prisma.roadmapTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Roadmap template not found' });
    }

    try {
      const result = await prisma.roadmapStep.create({
        data: {
          roadmapTemplateId: templateId,
          stepOrder,
          type,
          title,
          description: description ?? null,
          resourceUrl: resourceUrl ?? null,
          resourceType: resourceType ?? null,
          practiceQuestionCount: practiceQuestionCount ?? null,
        },
      });
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'A step with this order already exists for this roadmap',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function updateRoadmapStep(req, res, next) {
  try {
    const { templateId, id } = req.params;

    const step = await prisma.roadmapStep.findFirst({
      where: {
        id,
        roadmapTemplateId: templateId,
      },
    });
    if (!step) {
      return res.status(404).json({ success: false, message: 'Roadmap step not found' });
    }

    const data = {};
    if (req.body.stepOrder !== undefined) data.stepOrder = req.body.stepOrder;
    if (req.body.type !== undefined) data.type = req.body.type;
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.resourceUrl !== undefined) data.resourceUrl = req.body.resourceUrl;
    if (req.body.resourceType !== undefined) data.resourceType = req.body.resourceType;
    if (req.body.practiceQuestionCount !== undefined) data.practiceQuestionCount = req.body.practiceQuestionCount;

    try {
      const result = await prisma.roadmapStep.update({
        where: { id },
        data,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'A step with this order already exists for this roadmap',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function removeRoadmapStep(req, res, next) {
  try {
    const { templateId, id } = req.params;

    const step = await prisma.roadmapStep.findFirst({
      where: {
        id,
        roadmapTemplateId: templateId,
      },
    });
    if (!step) {
      return res.status(404).json({ success: false, message: 'Roadmap step not found' });
    }

    try {
      await prisma.roadmapStep.delete({
        where: { id },
      });
      return res.status(200).json({ success: true, message: 'Roadmap step removed' });
    } catch (err) {
      if (err.code === 'P2003') {
        return res.status(409).json({
          success: false,
          message: 'Cannot remove a step that candidates have progress on',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRoadmapTemplate,
  listRoadmapTemplates,
  getRoadmapTemplate,
  updateRoadmapTemplate,
  deleteRoadmapTemplate,
  addRoadmapStep,
  updateRoadmapStep,
  removeRoadmapStep,
};