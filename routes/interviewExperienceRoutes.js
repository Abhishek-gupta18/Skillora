const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { attachProfile } = require('../middleware/profileMiddleware');
const {
  listInterviewExperiences,
  getInterviewExperience,
  createInterviewExperience,
  deleteOwnInterviewExperience,
} = require('../controllers/interviewExperienceController');
const {
  listInterviewExperiencesValidation,
  createInterviewExperienceValidation,
  handleValidationErrors,
} = require('../validators/interviewExperienceValidators');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Browsing routes — authenticate only (no attachProfile needed)
// Same pattern as jobRoutes.js: list and detail don't need profile
router.get('/', listInterviewExperiencesValidation, handleValidationErrors, listInterviewExperiences);
router.get('/:id', getInterviewExperience);

// Create — requires candidate profile (attachProfile scoped to this route)
router.post('/', attachProfile, createInterviewExperienceValidation, handleValidationErrors, createInterviewExperience);

// Delete own — requires candidate profile (attachProfile scoped to this route)
router.delete('/:id', attachProfile, deleteOwnInterviewExperience);

module.exports = router;