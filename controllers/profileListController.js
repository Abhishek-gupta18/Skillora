const { prisma } = require('../config/prisma');
const { encrypt, decrypt } = require('../utils/encryption');
const { asyncHandler } = require('../middleware/errorHandler');
const { Prisma } = require('@prisma/client');

const listEducation = asyncHandler(async (req, res) => {
  const entries = await prisma.educationEntry.findMany({
    where: { profileId: req.profile.id },
    orderBy: { startYear: 'desc' },
  });
  return res.status(200).json({ success: true, data: entries });
});

const createEducation = asyncHandler(async (req, res) => {
  const { institution, degree, fieldOfStudy, startYear, endYear, grade } = req.body;
  const profileId = req.profile.id;

  const entry = await prisma.educationEntry.create({
    data: {
      profileId,
      institution,
      degree,
      fieldOfStudy,
      startYear,
      endYear,
      grade,
    },
  });

  return res.status(201).json({ success: true, data: entry });
});

const updateEducation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { institution, degree, fieldOfStudy, startYear, endYear, grade } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.educationEntry.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const data = {};
  if (institution !== undefined) data.institution = institution;
  if (degree !== undefined) data.degree = degree;
  if (fieldOfStudy !== undefined) data.fieldOfStudy = fieldOfStudy;
  if (startYear !== undefined) data.startYear = startYear;
  if (endYear !== undefined) data.endYear = endYear;
  if (grade !== undefined) data.grade = grade;

  const updated = await prisma.educationEntry.update({
    where: { id },
    data,
  });

  return res.status(200).json({ success: true, data: updated });
});

const deleteEducation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  const existing = await prisma.educationEntry.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  await prisma.educationEntry.delete({ where: { id } });

  return res.status(200).json({ success: true, message: 'Deleted' });
});

const listExperience = asyncHandler(async (req, res) => {
  const entries = await prisma.experienceEntry.findMany({
    where: { profileId: req.profile.id },
    orderBy: { startDate: 'desc' },
  });
  return res.status(200).json({ success: true, data: entries });
});

const createExperience = asyncHandler(async (req, res) => {
  const { company, title, startDate, endDate, isCurrent, description } = req.body;
  const profileId = req.profile.id;

  const entry = await prisma.experienceEntry.create({
    data: {
      profileId,
      company,
      title,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isCurrent: isCurrent ?? false,
      description,
    },
  });

  return res.status(201).json({ success: true, data: entry });
});

const updateExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { company, title, startDate, endDate, isCurrent, description } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.experienceEntry.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const mergedIsCurrent = isCurrent !== undefined ? isCurrent : existing.isCurrent;
  const mergedEndDate = endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate;
  const mergedStartDate = startDate !== undefined ? new Date(startDate) : existing.startDate;

  if (mergedIsCurrent === true && mergedEndDate !== null) {
    return res.status(422).json({ success: false, message: 'endDate must not be provided when isCurrent is true' });
  }
  if (mergedIsCurrent !== true && mergedEndDate === null) {
    return res.status(422).json({ success: false, message: 'endDate is required when isCurrent is false' });
  }
  if (mergedEndDate && new Date(mergedEndDate) <= new Date(mergedStartDate)) {
    return res.status(422).json({ success: false, message: 'endDate must be after startDate' });
  }

  const data = {};
  if (company !== undefined) data.company = company;
  if (title !== undefined) data.title = title;
  if (startDate !== undefined) data.startDate = mergedStartDate;
  if (endDate !== undefined) data.endDate = mergedEndDate;
  if (isCurrent !== undefined) data.isCurrent = isCurrent;
  if (description !== undefined) data.description = description;

  const updated = await prisma.experienceEntry.update({
    where: { id },
    data,
  });

  return res.status(200).json({ success: true, data: updated });
});

const deleteExperience = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  const existing = await prisma.experienceEntry.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  await prisma.experienceEntry.delete({ where: { id } });

  return res.status(200).json({ success: true, message: 'Deleted' });
});

const listSkills = asyncHandler(async (req, res) => {
  const entries = await prisma.skillClaim.findMany({
    where: { profileId: req.profile.id },
    include: { skill: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.status(200).json({ success: true, data: entries });
});

const createSkill = asyncHandler(async (req, res) => {
  const { skillId, selfRatedLevel } = req.body;
  const profileId = req.profile.id;

  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!skill) {
    return res.status(422).json({ success: false, message: 'Invalid skill' });
  }

  try {
    const entry = await prisma.skillClaim.create({
      data: {
        profileId,
        skillId,
        selfRatedLevel,
      },
    });
    return res.status(201).json({ success: true, data: entry });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Skill already claimed' });
    }
    throw err;
  }
});

const updateSkill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { skillId, selfRatedLevel } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.skillClaim.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const data = {};
  if (selfRatedLevel !== undefined) data.selfRatedLevel = selfRatedLevel;

  if (skillId !== undefined) {
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      return res.status(422).json({ success: false, message: 'Invalid skill' });
    }
    data.skillId = skillId;
  }

  try {
    const updated = await prisma.skillClaim.update({
      where: { id },
      data,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Skill already claimed' });
    }
    throw err;
  }
});

const deleteSkill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  const existing = await prisma.skillClaim.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  await prisma.skillClaim.delete({ where: { id } });

  return res.status(200).json({ success: true, message: 'Deleted' });
});

const listCertifications = asyncHandler(async (req, res) => {
  const entries = await prisma.certification.findMany({
    where: { profileId: req.profile.id },
    orderBy: { issueDate: 'desc' },
  });
  return res.status(200).json({ success: true, data: entries });
});

const createCertification = asyncHandler(async (req, res) => {
  const { name, issuer, issueDate, credentialUrl } = req.body;
  const profileId = req.profile.id;

  const entry = await prisma.certification.create({
    data: {
      profileId,
      name,
      issuer,
      issueDate: new Date(issueDate),
      credentialUrl,
    },
  });

  return res.status(201).json({ success: true, data: entry });
});

const updateCertification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, issuer, issueDate, credentialUrl } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.certification.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (issuer !== undefined) data.issuer = issuer;
  if (issueDate !== undefined) data.issueDate = new Date(issueDate);
  if (credentialUrl !== undefined) data.credentialUrl = credentialUrl;

  const updated = await prisma.certification.update({
    where: { id },
    data,
  });

  return res.status(200).json({ success: true, data: updated });
});

const deleteCertification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  const existing = await prisma.certification.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  await prisma.certification.delete({ where: { id } });

  return res.status(200).json({ success: true, message: 'Deleted' });
});

const listProjects = asyncHandler(async (req, res) => {
  const entries = await prisma.project.findMany({
    where: { profileId: req.profile.id },
    orderBy: { createdAt: 'desc' },
  });
  return res.status(200).json({ success: true, data: entries });
});

const createProject = asyncHandler(async (req, res) => {
  const { title, description, techStack, link } = req.body;
  const profileId = req.profile.id;

  const entry = await prisma.project.create({
    data: {
      profileId,
      title,
      description,
      techStack,
      link,
    },
  });

  return res.status(201).json({ success: true, data: entry });
});

const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, techStack, link } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.project.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (techStack !== undefined) data.techStack = techStack;
  if (link !== undefined) data.link = link;

  const updated = await prisma.project.update({
    where: { id },
    data,
  });

  return res.status(200).json({ success: true, data: updated });
});

const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  const existing = await prisma.project.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  await prisma.project.delete({ where: { id } });

  return res.status(200).json({ success: true, message: 'Deleted' });
});

const listPreferredRoles = asyncHandler(async (req, res) => {
  const entries = await prisma.preferredRole.findMany({
    where: { profileId: req.profile.id },
    orderBy: { createdAt: 'desc' },
  });
  return res.status(200).json({ success: true, data: entries });
});

const createPreferredRole = asyncHandler(async (req, res) => {
  const { roleName } = req.body;
  const profileId = req.profile.id;

  try {
    const entry = await prisma.preferredRole.create({
      data: { profileId, roleName },
    });
    return res.status(201).json({ success: true, data: entry });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Role already added' });
    }
    throw err;
  }
});

const updatePreferredRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { roleName } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.preferredRole.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  try {
    const updated = await prisma.preferredRole.update({
      where: { id },
      data: { roleName },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Role already added' });
    }
    throw err;
  }
});

const deletePreferredRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  const existing = await prisma.preferredRole.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  await prisma.preferredRole.delete({ where: { id } });

  return res.status(200).json({ success: true, message: 'Deleted' });
});

const listPreferredLocations = asyncHandler(async (req, res) => {
  const entries = await prisma.preferredLocation.findMany({
    where: { profileId: req.profile.id },
    orderBy: { createdAt: 'desc' },
  });
  return res.status(200).json({ success: true, data: entries });
});

const createPreferredLocation = asyncHandler(async (req, res) => {
  const { locationName } = req.body;
  const profileId = req.profile.id;

  try {
    const entry = await prisma.preferredLocation.create({
      data: { profileId, locationName },
    });
    return res.status(201).json({ success: true, data: entry });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Location already added' });
    }
    throw err;
  }
});

const updatePreferredLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { locationName } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.preferredLocation.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  try {
    const updated = await prisma.preferredLocation.update({
      where: { id },
      data: { locationName },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Location already added' });
    }
    throw err;
  }
});

const deletePreferredLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  const existing = await prisma.preferredLocation.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  await prisma.preferredLocation.delete({ where: { id } });

  return res.status(200).json({ success: true, message: 'Deleted' });
});

const listLanguages = asyncHandler(async (req, res) => {
  const entries = await prisma.languageKnown.findMany({
    where: { profileId: req.profile.id },
    orderBy: { createdAt: 'desc' },
  });
  return res.status(200).json({ success: true, data: entries });
});

const createLanguage = asyncHandler(async (req, res) => {
  const { language, proficiency } = req.body;
  const profileId = req.profile.id;

  try {
    const entry = await prisma.languageKnown.create({
      data: { profileId, language, proficiency },
    });
    return res.status(201).json({ success: true, data: entry });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Language already added' });
    }
    throw err;
  }
});

const updateLanguage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { language, proficiency } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.languageKnown.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const data = {};
  if (language !== undefined) data.language = language;
  if (proficiency !== undefined) data.proficiency = proficiency;

  try {
    const updated = await prisma.languageKnown.update({
      where: { id },
      data,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Language already added' });
    }
    throw err;
  }
});

const deleteLanguage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  const existing = await prisma.languageKnown.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  await prisma.languageKnown.delete({ where: { id } });

  return res.status(200).json({ success: true, message: 'Deleted' });
});

const listSocialLinks = asyncHandler(async (req, res) => {
  const entries = await prisma.socialLink.findMany({
    where: { profileId: req.profile.id },
    orderBy: { createdAt: 'desc' },
  });
  return res.status(200).json({ success: true, data: entries });
});

const createSocialLink = asyncHandler(async (req, res) => {
  const { platform, url } = req.body;
  const profileId = req.profile.id;

  try {
    const entry = await prisma.socialLink.create({
      data: { profileId, platform, url },
    });
    return res.status(201).json({ success: true, data: entry });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Social link for this platform already exists — update it instead' });
    }
    throw err;
  }
});

const updateSocialLink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { platform, url } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.socialLink.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const data = {};
  if (platform !== undefined) data.platform = platform;
  if (url !== undefined) data.url = url;

  try {
    const updated = await prisma.socialLink.update({
      where: { id },
      data,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Social link for this platform already exists — update it instead' });
    }
    throw err;
  }
});

const deleteSocialLink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  const existing = await prisma.socialLink.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  await prisma.socialLink.delete({ where: { id } });

  return res.status(200).json({ success: true, message: 'Deleted' });
});

const listReferences = asyncHandler(async (req, res) => {
  const entries = await prisma.reference.findMany({
    where: { profileId: req.profile.id },
    orderBy: { createdAt: 'desc' },
  });

  for (const ref of entries) {
    if (ref.contactInfo) {
      try {
        ref.contactInfo = decrypt(ref.contactInfo);
      } catch (err) {
        console.error('Failed to decrypt reference contactInfo:', err.message);
        ref.contactInfo = null;
      }
    }
  }

  return res.status(200).json({ success: true, data: entries });
});

const createReference = asyncHandler(async (req, res) => {
  const { name, relation, contactInfo } = req.body;
  const profileId = req.profile.id;

  const encryptedContactInfo = encrypt(contactInfo);

  const entry = await prisma.reference.create({
    data: {
      profileId,
      name,
      relation,
      contactInfo: encryptedContactInfo,
    },
  });

  entry.contactInfo = contactInfo;

  return res.status(201).json({ success: true, data: entry });
});

const updateReference = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, relation, contactInfo } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.reference.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (relation !== undefined) data.relation = relation;
  if (contactInfo !== undefined) data.contactInfo = encrypt(contactInfo);

  const updated = await prisma.reference.update({
    where: { id },
    data,
  });

  if (updated.contactInfo) {
    try {
      updated.contactInfo = decrypt(updated.contactInfo);
    } catch (err) {
      console.error('Failed to decrypt reference contactInfo:', err.message);
      updated.contactInfo = null;
    }
  }

  return res.status(200).json({ success: true, data: updated });
});

const deleteReference = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profileId = req.profile.id;

  const existing = await prisma.reference.findFirst({
    where: { id, profileId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  await prisma.reference.delete({ where: { id } });

  return res.status(200).json({ success: true, message: 'Deleted' });
});

module.exports = {
  listEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  listExperience,
  createExperience,
  updateExperience,
  deleteExperience,
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  listCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listPreferredRoles,
  createPreferredRole,
  updatePreferredRole,
  deletePreferredRole,
  listPreferredLocations,
  createPreferredLocation,
  updatePreferredLocation,
  deletePreferredLocation,
  listLanguages,
  createLanguage,
  updateLanguage,
  deleteLanguage,
  listSocialLinks,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  listReferences,
  createReference,
  updateReference,
  deleteReference,
};
