const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

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
};