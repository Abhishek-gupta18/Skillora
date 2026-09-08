const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { attachProfile } = require('../middleware/profileMiddleware');
const { uploadResumeFile, handleUploadError } = require('../middleware/uploadMiddleware');
const { uploadResume, downloadResume, deleteResume } = require('../controllers/resumeController');

const router = express.Router();

router.use(authenticate, attachProfile);

router.post(
  '/',
  uploadResumeFile,
  handleUploadError,
  uploadResume
);

router.get('/', downloadResume);

router.delete('/', deleteResume);

module.exports = router;
