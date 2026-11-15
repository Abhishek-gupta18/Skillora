const { prisma } = require('../config/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { encrypt } = require('../utils/encryption');
const { signToken } = require('../utils/jwt');
const { Prisma } = require('@prisma/client');
const { calculateProfileCompletion } = require('../services/profileCompletionService');

const DUMMY_HASH = '$2b$12$ylZoDNuY77EA7/iIuta0turJ4.T63RJRCxzID2kOostRdZjJ7M45O';

async function register(req, res, next) {
  try {
    const { email, password, name, phone, dob, gender } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.warn('Registration attempt with existing email (id masked)');
      return res.status(409).json({ success: false, message: 'Registration failed' });
    }

    const passwordHash = await hashPassword(password);
    const encryptedPhone = encrypt(phone);

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            role: 'CANDIDATE',
          },
        });

        const profile = await tx.profile.create({
          data: {
            userId: user.id,
          },
        });

        await tx.basicInfo.create({
          data: {
            profileId: profile.id,
            name,
            dob: new Date(dob),
            gender,
            phone: encryptedPhone,
          },
        });

        await tx.privacyConsent.create({
          data: {
            profileId: profile.id,
            profileVisibility: 'PRIVATE',
            dataSharingConsent: false,
            consentTimestamp: null,
          },
        });

        return user;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        console.warn('Race condition: duplicate email registration attempt (id masked)');
        return res.status(409).json({ success: false, message: 'Registration failed' });
      }
      throw err;
    }

    const token = signToken({ id: result.id, tv: result.tokenVersion });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: result.id, email: result.email, role: result.role },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await comparePassword(password, DUMMY_HASH);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }

    const token = signToken({ id: user.id, tv: user.tokenVersion });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      include: {
        basicInfo: true,
        photoHeadline: true,
        address: true,
        educationEntries: true,
        experienceEntries: true,
        skillClaims: true,
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

    if (!profile) {
      // User exists but has no profile (e.g., ADMIN) - return 200 with profile: null
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            status: req.user.status,
          },
          profile: null,
          profileCompletionPercent: null,
        },
      });
    }

    const { completionPercent } = calculateProfileCompletion(profile);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          status: req.user.status,
        },
        profile: {
          id: profile.id,
          name: profile.basicInfo?.name ?? null,
        },
        profileCompletionPercent,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, passwordHash: true, tokenVersion: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'currentPassword', message: 'Current password is incorrect' }],
      });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: { increment: 1 },
      },
    });

    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, tokenVersion: true },
    });

    const token = signToken({ id: freshUser.id, tv: freshUser.tokenVersion });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: freshUser.id, email: user.email, role: req.user.role },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function logoutAll(req, res, next) {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    return res.status(200).json({ success: true, message: 'Logged out from all devices' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe, changePassword, logoutAll };