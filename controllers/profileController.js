const { prisma } = require('../config/prisma');
const { encrypt, decrypt } = require('../utils/encryption');
const { asyncHandler } = require('../middleware/errorHandler');

const getFullProfile = asyncHandler(async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { id: req.profile.id },
    include: {
      basicInfo: true,
      photoHeadline: true,
      address: true,
      educationEntries: true,
      experienceEntries: true,
      skillClaims: { include: { skill: true } },
      certifications: true,
      projects: true,
      careerSummary: true,
      preferredRoles: true,
      preferredLocations: true,
      salaryExpectation: true,
      availability: true,
      languages: true,
      socialLinks: true,
      resume: true,
      references: true,
      privacyConsent: true,
    },
  });

  if (profile.basicInfo && profile.basicInfo.phone) {
    try {
      profile.basicInfo.phone = decrypt(profile.basicInfo.phone);
    } catch (err) {
      console.error('Failed to decrypt basicInfo.phone:', err.message);
      profile.basicInfo.phone = null;
    }
  }

  if (profile.references && profile.references.length > 0) {
    for (const ref of profile.references) {
      if (ref.contactInfo) {
        try {
          ref.contactInfo = decrypt(ref.contactInfo);
        } catch (err) {
          console.error('Failed to decrypt reference contactInfo:', err.message);
          ref.contactInfo = null;
        }
      }
    }
  }

  return res.status(200).json({ success: true, data: profile });
});

const upsertBasicInfo = asyncHandler(async (req, res) => {
  const { name, dob, gender, phone } = req.body;
  const profileId = req.profile.id;

  const data = {};
  if (name !== undefined) data.name = name;
  if (dob !== undefined) data.dob = new Date(dob);
  if (gender !== undefined) data.gender = gender;
  if (phone !== undefined) data.phone = encrypt(phone);

  const upserted = await prisma.basicInfo.upsert({
    where: { profileId },
    create: { profileId, ...data },
    update: data,
  });

  if (upserted.phone) {
    upserted.phone = decrypt(upserted.phone);
  }

  return res.status(200).json({ success: true, data: upserted });
});

const upsertPhotoHeadline = asyncHandler(async (req, res) => {
  const { photoUrl, headline } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.profilePhotoHeadline.findUnique({ where: { profileId } });

  if (!existing) {
    const missing = [];
    if (headline === undefined) missing.push('headline');
    if (missing.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'All fields are required to create this section for the first time',
        errors: missing.map((field) => ({ field, message: `${field} is required` })),
      });
    }
  }

  const data = {};
  if (photoUrl !== undefined) data.photoUrl = photoUrl;
  if (headline !== undefined) data.headline = headline;

  const upserted = await prisma.profilePhotoHeadline.upsert({
    where: { profileId },
    create: { profileId, ...data },
    update: data,
  });

  return res.status(200).json({ success: true, data: upserted });
});

const upsertAddress = asyncHandler(async (req, res) => {
  const { line1, line2, city, state, country, pincode } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.address.findUnique({ where: { profileId } });

  if (!existing) {
    const missing = [];
    if (line1 === undefined) missing.push('line1');
    if (city === undefined) missing.push('city');
    if (state === undefined) missing.push('state');
    if (country === undefined) missing.push('country');
    if (pincode === undefined) missing.push('pincode');
    if (missing.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'All fields are required to create this section for the first time',
        errors: missing.map((field) => ({ field, message: `${field} is required` })),
      });
    }
  }

  const data = {};
  if (line1 !== undefined) data.line1 = line1;
  if (line2 !== undefined) data.line2 = line2;
  if (city !== undefined) data.city = city;
  if (state !== undefined) data.state = state;
  if (country !== undefined) data.country = country;
  if (pincode !== undefined) data.pincode = pincode;

  const upserted = await prisma.address.upsert({
    where: { profileId },
    create: { profileId, ...data },
    update: data,
  });

  return res.status(200).json({ success: true, data: upserted });
});

const upsertCareerSummary = asyncHandler(async (req, res) => {
  const { text } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.careerSummary.findUnique({ where: { profileId } });

  if (!existing) {
    const missing = [];
    if (text === undefined) missing.push('text');
    if (missing.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'All fields are required to create this section for the first time',
        errors: missing.map((field) => ({ field, message: `${field} is required` })),
      });
    }
  }

  const data = {};
  if (text !== undefined) data.text = text;

  const upserted = await prisma.careerSummary.upsert({
    where: { profileId },
    create: { profileId, ...data },
    update: data,
  });

  return res.status(200).json({ success: true, data: upserted });
});

const upsertSalaryExpectation = asyncHandler(async (req, res) => {
  const { minAmount, maxAmount, currency } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.salaryExpectation.findUnique({ where: { profileId } });

  const mergedMin = minAmount !== undefined ? minAmount : existing?.minAmount;
  const mergedMax = maxAmount !== undefined ? maxAmount : existing?.maxAmount;

  if (mergedMin !== undefined && mergedMax !== undefined && mergedMin > mergedMax) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'minAmount', message: 'minAmount must be less than or equal to maxAmount' }],
    });
  }

  if (!existing) {
    const missing = [];
    if (minAmount === undefined) missing.push('minAmount');
    if (maxAmount === undefined) missing.push('maxAmount');
    if (currency === undefined) missing.push('currency');
    if (missing.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'All fields are required to create this section for the first time',
        errors: missing.map((field) => ({ field, message: `${field} is required` })),
      });
    }
  }

  const data = {};
  if (minAmount !== undefined) data.minAmount = minAmount;
  if (maxAmount !== undefined) data.maxAmount = maxAmount;
  if (currency !== undefined) data.currency = currency;

  const upserted = await prisma.salaryExpectation.upsert({
    where: { profileId },
    create: { profileId, ...data },
    update: data,
  });

  return res.status(200).json({ success: true, data: upserted });
});

const upsertAvailability = asyncHandler(async (req, res) => {
  const { availability } = req.body;
  const profileId = req.profile.id;

  const existing = await prisma.availabilitySetting.findUnique({ where: { profileId } });

  if (!existing) {
    const missing = [];
    if (availability === undefined) missing.push('availability');
    if (missing.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'All fields are required to create this section for the first time',
        errors: missing.map((field) => ({ field, message: `${field} is required` })),
      });
    }
  }

  const data = {};
  if (availability !== undefined) data.availability = availability;

  const upserted = await prisma.availabilitySetting.upsert({
    where: { profileId },
    create: { profileId, ...data },
    update: data,
  });

  return res.status(200).json({ success: true, data: upserted });
});

const upsertPrivacyConsent = asyncHandler(async (req, res) => {
  const { profileVisibility, dataSharingConsent } = req.body;
  const profileId = req.profile.id;

  const data = {};
  if (profileVisibility !== undefined) data.profileVisibility = profileVisibility;
  if (dataSharingConsent !== undefined) {
    data.dataSharingConsent = dataSharingConsent;
    data.consentTimestamp = new Date();
  }

  const upserted = await prisma.privacyConsent.upsert({
    where: { profileId },
    create: { profileId, ...data },
    update: data,
  });

  return res.status(200).json({ success: true, data: upserted });
});

module.exports = {
  getFullProfile,
  upsertBasicInfo,
  upsertPhotoHeadline,
  upsertAddress,
  upsertCareerSummary,
  upsertSalaryExpectation,
  upsertAvailability,
  upsertPrivacyConsent,
};
