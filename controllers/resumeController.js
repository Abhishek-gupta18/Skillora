const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { prisma } = require('../config/prisma');
const { hashFileBuffer } = require('../utils/fileIntegrity');
const { isValidPdf } = require('../utils/fileValidation');

const STORAGE_DIR = process.env.RESUME_STORAGE_DIR || path.join(__dirname, '..', 'resume-storage');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function generateSafeFilename() {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${randomBytes}.pdf`;
}

async function uploadResume(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const buffer = req.file.buffer;

    if (!isValidPdf(buffer)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file: not a valid PDF',
      });
    }

    const fileHash = hashFileBuffer(buffer);
    const profileId = req.profile.id;

    const existingResume = await prisma.resume.findUnique({
      where: { profileId },
    });

    // 1. Write the NEW file to disk FIRST
    const safeFilename = generateSafeFilename();
    const filePath = path.join(STORAGE_DIR, safeFilename);
    fs.writeFileSync(filePath, buffer);

    // 2. Only after the write succeeds, upsert the DB record
    const resume = await prisma.resume.upsert({
      where: { profileId },
      create: {
        profileId,
        fileUrl: safeFilename,
        fileHash,
      },
      update: {
        fileUrl: safeFilename,
        fileHash,
        uploadedAt: new Date(),
      },
    });

    // 3. Only after both succeed, clean up the OLD file (if any)
    if (existingResume) {
      const oldFilePath = path.join(STORAGE_DIR, path.basename(existingResume.fileUrl));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        id: resume.id,
        uploadedAt: resume.uploadedAt,
      },
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

async function downloadResume(req, res) {
  try {
    const profileId = req.profile.id;

    const resume = await prisma.resume.findUnique({
      where: { profileId },
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
      });
    }

    const filePath = path.join(STORAGE_DIR, resume.fileUrl);

    if (!fs.existsSync(filePath)) {
      console.error(`Resume DB record exists but file missing on disk: profileId=${profileId}, fileUrl=${resume.fileUrl}`);
      return res.status(500).json({
        success: false,
        message: 'Resume file not found on disk',
      });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const currentHash = hashFileBuffer(fileBuffer);

    if (currentHash !== resume.fileHash) {
      console.error(`Resume file integrity check failed: profileId=${profileId}`);
      return res.status(500).json({
        success: false,
        message: 'File integrity check failed',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume.pdf"`);
    res.setHeader('Content-Length', fileBuffer.length);

    return res.send(fileBuffer);
  } catch (error) {
    console.error('Download resume error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

async function deleteResume(req, res) {
  try {
    const profileId = req.profile.id;

    const resume = await prisma.resume.findUnique({
      where: { profileId },
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
      });
    }

    const filePath = path.join(STORAGE_DIR, resume.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.resume.delete({ where: { id: resume.id } });

    return res.json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    console.error('Delete resume error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

module.exports = { uploadResume, downloadResume, deleteResume };
