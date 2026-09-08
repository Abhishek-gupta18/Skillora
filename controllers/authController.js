const { prisma } = require('../config/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { encrypt } = require('../utils/encryption');
const jwt = require('jsonwebtoken');
const { Prisma } = require('@prisma/client');

// A syntactically valid bcrypt hash (12 rounds) used only for timing-attack
// mitigation on login when no user is found — never a real password.
const DUMMY_HASH = '$2b$12$ylZoDNuY77EA7/iIuta0turJ4.T63RJRCxzID2kOostRdZjJ7M45O';

async function register(req, res, next) {
  try {
    const { email, password, name, phone, dob, gender } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.warn('Registration attempt with existing email:', email);
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
        console.warn('Race condition: duplicate email registration attempt:', email);
        return res.status(409).json({ success: false, message: 'Registration failed' });
      }
      throw err;
    }

    const token = jwt.sign(
      { id: result.id, type: 'candidate' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

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

    const token = jwt.sign(
      { id: user.id, type: 'candidate' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

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

module.exports = { register, login };
