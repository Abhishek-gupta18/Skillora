const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { matchedData } = require('express-validator');
const { balanceCorrectPositions, checkDistribution, getDistribution } = require('../utils/questionBalance');
const { ASSESSMENT_QUESTION_COUNT } = require('../utils/skillLevelBands');
const { prepareBulkQuestions } = require('../utils/questionBulk');

/**
 * ==========================================
 * Company Controllers
 * ==========================================
 */

/**
 * createCompany — create a new company, respond 201
 */
async function createCompany(req, res, next) {
  try {
    const { name, description, website, industry, logoUrl } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (website !== undefined) data.website = website;
    if (industry !== undefined) data.industry = industry;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    const result = await prisma.company.create({ data });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * listCompanies — findMany, respond 200
 * note: no pagination needed yet, future improvement in comment
 */
async function listCompanies(req, res, next) {
  try {
    const companies = await prisma.company.findMany();
    return res.status(200).json({ success: true, data: companies });
  } catch (err) {
    next(err);
  }
}

/**
 * getCompany — findUnique by id (from params), 404 if not found
 */
async function getCompany(req, res, next) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
    });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    return res.status(200).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

/**
 * updateCompany — findUnique by id, 404 if not found, then update
 * with only the provided fields
 */
async function updateCompany(req, res, next) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
    });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.website !== undefined) data.website = req.body.website;
    if (req.body.industry !== undefined) data.industry = req.body.industry;
    if (req.body.logoUrl !== undefined) data.logoUrl = req.body.logoUrl;

    const result = await prisma.company.update({
      where: { id: req.params.id },
      data,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * ==========================================
 * JobPosting Controllers
 * ==========================================
 */

/**
 * createJobPosting — verify companyId exists (404 "Company not found"
 * if not), create with status defaulting to DRAFT (per schema default),
 * respond 201
 */
async function createJobPosting(req, res, next) {
  try {
    // verify company exists
    const company = await prisma.company.findUnique({
      where: { id: req.body.companyId },
    });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Explicit whitelist — only include intended fields.
    // status defaults to DRAFT per schema; never accept it from client.
    // postedAt, id, createdAt, updatedAt are also excluded.
    const data = {};
    if (req.body.companyId !== undefined) data.companyId = req.body.companyId;
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.employmentType !== undefined) data.employmentType = req.body.employmentType;
    if (req.body.experienceLevel !== undefined) data.experienceLevel = req.body.experienceLevel;
    if (req.body.location !== undefined) data.location = req.body.location;
    if (req.body.isRemote !== undefined) data.isRemote = req.body.isRemote;
    if (req.body.salaryMin !== undefined) data.salaryMin = req.body.salaryMin;
    if (req.body.salaryMax !== undefined) data.salaryMax = req.body.salaryMax;
    if (req.body.currency !== undefined) data.currency = req.body.currency;
    if (req.body.closesAt !== undefined) data.closesAt = new Date(req.body.closesAt);

    const result = await prisma.jobPosting.create({ data });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * listJobPostings — findMany, optionally include company +
 * jobRequiredSkills (with skill details), respond 200
 */
async function listJobPostings(req, res, next) {
  try {
    const include = {
      company: true,
      jobRequiredSkills: {
        include: { skill: true },
      },
    };
    const postings = await prisma.jobPosting.findMany({
      include,
    });
    return res.status(200).json({ success: true, data: postings });
  } catch (err) {
    next(err);
  }
}

/**
 * getJobPosting — findUnique by id with company + jobRequiredSkills
 * (+ skill) included, 404 if not found
 */
async function getJobPosting(req, res, next) {
  try {
    const result = await prisma.jobPosting.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        jobRequiredSkills: {
          include: { skill: true },
        },
      },
    });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * updateJobPosting — findUnique by id, 404 if not found;
 * if updating salaryMin/salaryMax, merge with existing values and
 * validate min<=max in the controller before writing (same pattern
 * as upsertSalaryExpectation); apply only provided fields
 */
async function updateJobPosting(req, res, next) {
  try {
    const posting = await prisma.jobPosting.findUnique({
      where: { id: req.params.id },
    });
    if (!posting) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    // Merge incoming fields with existing values for salary
    const mergedSalaryMin = req.body.salaryMin !== undefined
      ? req.body.salaryMin
      : posting.salaryMin;
    const mergedSalaryMax = req.body.salaryMax !== undefined
      ? req.body.salaryMax
      : posting.salaryMax;

    // Validate min <= max if both are present
    if (mergedSalaryMin !== undefined && mergedSalaryMax !== undefined) {
      if (mergedSalaryMin > mergedSalaryMax) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'salaryMin', message: 'salaryMin must be less than or equal to salaryMax' }],
        });
      }
    }

    // If companyId is being updated, verify the new company exists
    if (req.body.companyId !== undefined) {
      const company = await prisma.company.findUnique({
        where: { id: req.body.companyId },
      });
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found' });
      }
    }

    // Explicit whitelist for update — only these fields may be updated.
    // status changes must ONLY happen through updateJobStatus.
    // postedAt, id, createdAt, updatedAt are excluded.
    const data = {};
    if (req.body.companyId !== undefined) data.companyId = req.body.companyId;
    if (req.body.title !== undefined) data.title = req.body.title;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.employmentType !== undefined) data.employmentType = req.body.employmentType;
    if (req.body.experienceLevel !== undefined) data.experienceLevel = req.body.experienceLevel;
    if (req.body.location !== undefined) data.location = req.body.location;
    if (req.body.isRemote !== undefined) data.isRemote = req.body.isRemote;
    if (req.body.salaryMin !== undefined) data.salaryMin = req.body.salaryMin;
    if (req.body.salaryMax !== undefined) data.salaryMax = req.body.salaryMax;
    if (req.body.currency !== undefined) data.currency = req.body.currency;
    if (req.body.closesAt !== undefined) data.closesAt = new Date(req.body.closesAt);

    const result = await prisma.jobPosting.update({
      where: { id: req.params.id },
      data,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * updateJobStatus — findUnique by id, 404 if not found.
 * Handle the DRAFT → OPEN transition specially: if the new status is
 * 'OPEN' and the current status is NOT already 'OPEN', set postedAt =
 * new Date() server-side (never accept postedAt from the client).
 * Any other status transition just updates status, postedAt is left as-is.
 */
async function updateJobStatus(req, res, next) {
  try {
    const posting = await prisma.jobPosting.findUnique({
      where: { id: req.params.id },
    });
    if (!posting) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    const { status } = req.body;

    // Handle DRAFT → OPEN transition: set postedAt server-side
    let newPostedAt = posting.postedAt;
    if (status === 'OPEN' && posting.status !== 'OPEN') {
      newPostedAt = new Date();
    } else if (status !== 'OPEN') {
      // Transitioning away from OPEN or to OPEN when already OPEN:
      // keep postedAt as-is (only set once on DRAFT→OPEN)
    }

    const result = await prisma.jobPosting.update({
      where: { id: req.params.id },
      data: {
        status,
        postedAt: newPostedAt,
      },
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * deleteJobPosting — findUnique by id, 404 if not found, delete.
 * Let the FK constraint on JobRequiredSkill fail naturally if skills
 * are still attached — do NOT cascade-delete JobRequiredSkill rows
 * silently; if Prisma throws a foreign-key constraint error, catch it
 * and respond 409 "Remove required skills from this job before deleting it"
 */
async function deleteJobPosting(req, res, next) {
  try {
    const posting = await prisma.jobPosting.findUnique({
      where: { id: req.params.id },
    });
    if (!posting) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    // Try to delete; Prisma will throw a foreign-key error if
    // JobRequiredSkill rows still reference this job
    try {
      await prisma.jobPosting.delete({
        where: { id: req.params.id },
      });
      return res.status(200).json({ success: true, message: 'Job posting deleted' });
    } catch (err) {
      // Foreign-key constraint violation from JobRequiredSkill
      if (err.code === 'P2003') {
        return res.status(409).json({
          success: false,
          message: 'Remove required skills from this job before deleting it',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * ==========================================
 * JobRequiredSkill Controllers
 * ==========================================
 */

/**
 * addRequiredSkill — verify the jobPostingId (from params) exists
 * (404 if not), verify skillId exists in Skill table (422 "Invalid
 * skill" if not), create; catch P2002 (duplicate skill on same job)
 * → 409 "This skill is already listed as a requirement for this job"
 */
async function addRequiredSkill(req, res, next) {
  try {
    const { jobId } = req.params;
    const { skillId, minimumLevel, isRequired } = req.body;

    // verify job posting exists
    const jobPosting = await prisma.jobPosting.findUnique({
      where: { id: jobId },
    });
    if (!jobPosting) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    // verify skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });
    if (!skill) {
      return res.status(422).json({ success: false, message: 'Invalid skill' });
    }

    // create the job required skill — use validated input
    try {
      const result = await prisma.jobRequiredSkill.create({
        data: {
          jobPostingId: jobId,
          skillId,
          minimumLevel,
          isRequired: isRequired ?? true,
        },
      });
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      // Prisma P2002: unique constraint violation on [jobPostingId, skillId]
      if (err.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'This skill is already listed as a requirement for this job',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * removeRequiredSkill — verify the JobRequiredSkill row exists AND
 * belongs to the jobPostingId in the URL (findFirst with BOTH conditions,
 * same ownership-style pattern used throughout the profile-list controllers),
 * 404 if not found, then delete
 */
async function removeRequiredSkill(req, res, next) {
  try {
    const { jobId, skillReqId } = req.params;

    // Find the JobRequiredSkill row that belongs to THIS job posting
    // (combined check, same pattern as profile-list ownership)
    const jobRequiredSkill = await prisma.jobRequiredSkill.findFirst({
      where: {
        id: skillReqId,
        jobPostingId: jobId,
      },
    });

    if (!jobRequiredSkill) {
      return res.status(404).json({
        success: false,
        message: 'Required skill not found for this job',
      });
    }

    await prisma.jobRequiredSkill.delete({
      where: { id: skillReqId },
    });
    return res.status(200).json({ success: true, message: 'Required skill removed' });
  } catch (err) {
    next(err);
  }
}

/**
 * ==========================================
 * RetakeRequest Controllers (Admin)
 * ==========================================
 */

/**
 * listRetakeRequests — paginated list with optional status filter
 * Uses matchedData(req) per Constraints 5.5
 */
async function listRetakeRequests(req, res, next) {
  try {
    const data = require('express-validator').matchedData(req);
    const { status, page = 1, limit = 20 } = data;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.retakeRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
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
          reviewedByUserId: true,
          reviewNote: true,
          reviewedAt: true,
          consumedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.retakeRequest.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        requests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * updateRetakeRequest — admin approves/rejects a retake request
 * Only from PENDING status. Stamps reviewedByUserId and reviewedAt.
 * Uses matchedData(req) per Constraints 5.5
 * Uses updateMany with where status:'PENDING' for atomic update.
 */
async function updateRetakeRequest(req, res, next) {
  try {
    const { id } = req.params;
    const data = matchedData(req);
    const { status, reviewNote } = data;

    const updateResult = await prisma.retakeRequest.updateMany({
      where: {
        id,
        status: 'PENDING',
      },
      data: {
        status,
        reviewNote: reviewNote || null,
        reviewedByUserId: req.user.id,
        reviewedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      const request = await prisma.retakeRequest.findUnique({
        where: { id },
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
          reviewedByUserId: true,
          reviewNote: true,
          reviewedAt: true,
          consumedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!request) {
        return res.status(404).json({ success: false, message: 'Retake request not found' });
      }

      return res.status(409).json({
        success: false,
        message: 'Only pending retake requests can be reviewed',
      });
    }

    const updated = await prisma.retakeRequest.findUnique({
      where: { id },
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
        reviewedByUserId: true,
        reviewNote: true,
        reviewedAt: true,
        consumedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * ==========================================
 * User Management Controllers (Admin)
 * ==========================================
 */

/**
 * listUsers — paginated list with optional search, role, status filters
 * Returns id, email, role, status, createdAt, name (from basicInfo)
 * NEVER returns phone, dob, or other sensitive fields
 */
async function listUsers(req, res, next) {
  try {
    const data = matchedData(req);
    const { search, role, status, page = 1, limit = 20 } = data;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { basicInfo: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              basicInfo: { select: { name: true } },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      name: u.profile?.basicInfo?.name ?? null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * updateUserStatus — admin updates user status (ACTIVE|SUSPENDED)
 * Increments tokenVersion to revoke all tokens.
 * Admin cannot suspend themselves (409).
 * Admin cannot suspend the last ACTIVE admin (409).
 */
async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const data = matchedData(req);
    const { status } = data;

    // Prevent self-suspend
    if (id === req.user.id) {
      return res.status(409).json({
        success: false,
        message: 'You cannot change your own status',
      });
    }

    // Validate status value
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'status', message: 'Status must be ACTIVE or SUSPENDED' }],
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, tokenVersion: true },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If trying to suspend an admin, check if they're the last ACTIVE admin
    if (status === 'SUSPENDED' && targetUser.role === 'ADMIN') {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      });
      if (activeAdminCount <= 1) {
        return res.status(409).json({
          success: false,
          message: 'Cannot suspend the last active admin',
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        status,
        tokenVersion: { increment: 1 },
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * ==========================================
 * Skill Controllers (Admin)
 * ==========================================
 */

/**
 * createSkill — create a new skill, respond 201
 * Unique name enforced, 409 on duplicate
 */
async function createSkill(req, res, next) {
  try {
    const data = matchedData(req);
    const { name, category } = data;

    const result = await prisma.skill.create({
      data: { name, category },
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A skill with this name already exists',
      });
    }
    next(err);
  }
}

/**
 * listSkillsAdmin — admin list of all skills with isActive filter
 * Returns all skills including inactive ones
 */
async function listSkillsAdmin(req, res, next) {
  try {
    const data = matchedData(req);
    const { isActive, page = 1, limit = 50 } = data;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.skill.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        skills,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * updateSkill — update a skill (name, category, isActive)
 * Unique name check on update, 409 on duplicate
 */
async function updateSkill(req, res, next) {
  try {
    const { id } = req.params;
    const data = matchedData(req);
    const { name, category, isActive } = data;

    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) {
      return res.status(404).json({ success: false, message: 'Skill not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    try {
      const result = await prisma.skill.update({
        where: { id },
        data: updateData,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'A skill with this name already exists',
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * ==========================================
 * Question Controllers (Admin)
 * ==========================================
 */

/**
 * listQuestions — paginated list with filters
 * Includes correctOptionIndex since admin
 */
async function listQuestions(req, res, next) {
  try {
    const data = matchedData(req);
    const { skillId, difficulty, isActive, page = 1, limit = 20 } = data;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (skillId) where.skillId = skillId;
    if (difficulty) where.difficulty = difficulty;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          skillId: true,
          promptText: true,
          options: true,
          correctOptionIndex: true,
          difficulty: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.question.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        questions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * createQuestion — create a new question
 * Validates: skill exists, difficulty valid, options 2-6 strings each 1-300 chars,
 * correctOptionIndex within bounds, no duplicate (skillId+promptText+difficulty)
 */
async function createQuestion(req, res, next) {
  try {
    const data = matchedData(req);
    const { skillId, difficulty, promptText, options, correctOptionIndex } = data;

    // Verify skill exists
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      return res.status(422).json({ success: false, message: 'Invalid skill' });
    }

    // Validate options
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'options', message: 'Options must be an array of 2-6 strings' }],
      });
    }
    for (const opt of options) {
      if (typeof opt !== 'string' || opt.length < 1 || opt.length > 300) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'options', message: 'Each option must be a string of 1-300 characters' }],
        });
      }
    }

    // Validate correctOptionIndex
    if (typeof correctOptionIndex !== 'number' || correctOptionIndex < 0 || correctOptionIndex >= options.length) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'correctOptionIndex', message: 'correctOptionIndex out of bounds' }],
      });
    }

    // Check duplicate (skillId + promptText + difficulty)
    const existing = await prisma.question.findFirst({
      where: { skillId, promptText, difficulty },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A question with this prompt, skill, and difficulty already exists',
      });
    }

    const result = await prisma.question.create({
      data: {
        skillId,
        difficulty,
        promptText,
        options,
        correctOptionIndex,
      },
      select: {
        id: true,
        skillId: true,
        promptText: true,
        options: true,
        correctOptionIndex: true,
        difficulty: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * updateQuestion — update a question (all fields optional)
 * If changing options, correctOptionIndex, skillId, difficulty, or promptText,
 * reject with 409 if question is already bound to any AssessmentSessionQuestion
 * (deactivate + create new instead)
 * If options provided without correctOptionIndex, verify existing index still valid
 * Accept string integers for correctOptionIndex via .toInt() in validators
 */
async function updateQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const data = matchedData(req);
    const { skillId, difficulty, promptText, options, correctOptionIndex, isActive } = data;

    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Check if question is bound to any session for any immutable field change
    const immutableFieldsChanged =
      skillId !== undefined ||
      difficulty !== undefined ||
      promptText !== undefined ||
      options !== undefined ||
      correctOptionIndex !== undefined;

    if (immutableFieldsChanged) {
      const boundCount = await prisma.assessmentSessionQuestion.count({
        where: { questionId: id },
      });
      if (boundCount > 0) {
        return res.status(409).json({
          success: false,
          message: 'Cannot modify skillId, difficulty, promptText, options, or correctOptionIndex of a question already bound to sessions. Deactivate and create a new one instead.',
        });
      }
    }

    // If options provided without correctOptionIndex, verify existing index still valid
    if (options !== undefined && correctOptionIndex === undefined) {
      if (question.correctOptionIndex >= options.length) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'correctOptionIndex', message: 'Existing correctOptionIndex is out of bounds for new options array' }],
        });
      }
    }

    // Validate options if provided
    if (options !== undefined) {
      if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'options', message: 'Options must be an array of 2-6 strings' }],
        });
      }
      for (const opt of options) {
        if (typeof opt !== 'string' || opt.length < 1 || opt.length > 300) {
          return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'options', message: 'Each option must be a string of 1-300 characters' }],
          });
        }
      }
    }

    // Validate correctOptionIndex if provided (validators handle .toInt())
    if (correctOptionIndex !== undefined) {
      const opts = options ?? question.options;
      if (typeof correctOptionIndex !== 'number' || correctOptionIndex < 0 || correctOptionIndex >= opts.length) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'correctOptionIndex', message: 'correctOptionIndex out of bounds' }],
        });
      }
    }

    // If skillId, difficulty or promptText changing, check for duplicate
    if (skillId !== undefined || difficulty !== undefined || promptText !== undefined) {
      const checkSkillId = skillId ?? question.skillId;
      const checkDifficulty = difficulty ?? question.difficulty;
      const checkPromptText = promptText ?? question.promptText;

      const existing = await prisma.question.findFirst({
        where: {
          skillId: checkSkillId,
          promptText: checkPromptText,
          difficulty: checkDifficulty,
          NOT: { id },
        },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A question with this prompt, skill, and difficulty already exists',
        });
      }
    }

    const updateData = {};
    if (skillId !== undefined) updateData.skillId = skillId;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (promptText !== undefined) updateData.promptText = promptText;
    if (options !== undefined) updateData.options = options;
    if (correctOptionIndex !== undefined) updateData.correctOptionIndex = correctOptionIndex;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await prisma.question.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        skillId: true,
        promptText: true,
        options: true,
        correctOptionIndex: true,
        difficulty: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * updateQuestionActive — PATCH /admin/questions/:id/active
 * Toggle isActive status
 */
async function updateQuestionActive(req, res, next) {
  try {
    const { id } = req.params;
    const data = matchedData(req);
    const { isActive } = data;

    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const result = await prisma.question.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        skillId: true,
        promptText: true,
        options: true,
        correctOptionIndex: true,
        difficulty: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * createQuestionsBulk — bulk insert questions
 * Validates all first, then inserts in one transaction (all-or-nothing)
 * Skips duplicates (skillId+promptText+difficulty) and reports { created, skipped }
 * Applies balanceCorrectPositions before insert
 * Uses prepareBulkQuestions for validation, de-duplication, balancing, and assertions
 */
async function createQuestionsBulk(req, res, next) {
  try {
    const data = matchedData(req);
    const { skillId, difficulty, questions } = data;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'questions', message: 'questions must be a non-empty array' }],
      });
    }
    if (questions.length > 100) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'questions', message: 'Maximum 100 questions per bulk insert' }],
      });
    }

    // Verify skill exists
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      return res.status(422).json({ success: false, message: 'Invalid skill' });
    }

    // Prepare and validate bulk questions using pure helper
    const seed = `${skillId}-${difficulty}-${Date.now()}`;
    let prepared;
    try {
      prepared = prepareBulkQuestions(questions, seed);
    } catch (err) {
      return res.status(422).json({
        success: false,
        message: err.message,
      });
    }

    // Check duplicates in DB (skillId + promptText + difficulty)
    const existingPrompts = await prisma.question.findMany({
      where: {
        skillId,
        difficulty,
        promptText: { in: prepared.questions.map((q) => q.promptText) },
      },
      select: { promptText: true },
    });
    const existingPromptSet = new Set(existingPrompts.map((q) => q.promptText));

    const toInsert = prepared.questions.filter((q) => !existingPromptSet.has(q.promptText));
    const skipped = prepared.skipped.map(s => ({ promptText: s.promptText, reason: s.reason }));
    for (const q of prepared.questions) {
      if (existingPromptSet.has(q.promptText)) {
        skipped.push({ promptText: q.promptText, reason: 'duplicate in DB (skillId+promptText+difficulty)' });
      }
    }

    // Insert with createMany in a transaction with timeout
    let created = [];
    if (toInsert.length > 0) {
      await prisma.$transaction(
        async (tx) => {
          const createdItems = await tx.question.createMany({
            data: toInsert.map((q) => ({
              skillId,
              difficulty,
              promptText: q.promptText,
              options: q.options,
              correctOptionIndex: q.correctOptionIndex,
              isActive: true,
            })),
          });
          // Fetch created items to return
          const createdPrompts = toInsert.map(q => q.promptText);
          created = await tx.question.findMany({
            where: { skillId, difficulty, promptText: { in: createdPrompts } },
            select: { id: true, promptText: true, correctOptionIndex: true },
          });
        },
        { maxWait: 5000, timeout: 20000 }
      );
    }

    // Report real distribution counts per index
    const distribution = getDistribution(
      prepared.questions.map(q => ({ options: q.options, correct: q.correctOptionIndex }))
    );

    return res.status(201).json({
      success: true,
      data: {
        created: created.length,
        skipped: skipped.length,
        createdItems: created,
        skippedPrompts: skipped,
        distribution,
      },
    });
  } catch (err) {
    next(err);
  }
}

const { assembleCoverage } = require('../utils/coverage');

/**
 * getQuestionsCoverage — per skill and difficulty, count of ACTIVE questions
 * and flag ready = count >= ASSESSMENT_QUESTION_COUNT * 1.5
 * Uses groupBy for efficiency and pure assembly helper
 */
async function getQuestionsCoverage(req, res, next) {
  try {
    const [activeSkills, groupedCounts] = await Promise.all([
      prisma.skill.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
      prisma.question.groupBy({
        by: ['skillId', 'difficulty'],
        where: { isActive: true },
        _count: { _all: true },
      }),
    ]);

    const coverage = assembleCoverage(activeSkills, groupedCounts);

    return res.status(200).json({ success: true, data: coverage });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCompany,
  listCompanies,
  getCompany,
  updateCompany,
  createJobPosting,
  listJobPostings,
  getJobPosting,
  updateJobPosting,
  updateJobStatus,
  deleteJobPosting,
  addRequiredSkill,
  removeRequiredSkill,
  listRetakeRequests,
  updateRetakeRequest,
  listUsers,
  updateUserStatus,
  createSkill,
  listSkillsAdmin,
  updateSkill,
  listQuestions,
  createQuestion,
  updateQuestion,
  updateQuestionActive,
  createQuestionsBulk,
  getQuestionsCoverage,
};