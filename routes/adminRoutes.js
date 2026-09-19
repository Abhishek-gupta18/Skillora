const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
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
} = require('../controllers/adminController');
const {
  createCompanyValidation,
  updateCompanyValidation,
  createJobPostingValidation,
  updateJobPostingValidation,
  updateJobStatusValidation,
  addRequiredSkillValidation,
  handleValidationErrors,
} = require('../validators/adminValidators');

const router = express.Router();

// ALL routes in this file require authentication + ADMIN role
router.use(authenticate);
router.use(requireRole(['ADMIN']));

/* ==========================================
 * Company routes
 * ========================================== */
router.post('/companies', createCompanyValidation, handleValidationErrors, createCompany);
router.get('/companies', listCompanies);
router.get('/companies/:id', getCompany);
router.patch('/companies/:id', updateCompanyValidation, handleValidationErrors, updateCompany);

/* ==========================================
 * JobPosting routes
 * ========================================== */
router.post('/jobs', createJobPostingValidation, handleValidationErrors, createJobPosting);
router.get('/jobs', listJobPostings);
router.get('/jobs/:id', getJobPosting);
router.patch('/jobs/:id', updateJobPostingValidation, handleValidationErrors, updateJobPosting);
router.patch('/jobs/:id/status', updateJobStatusValidation, handleValidationErrors, updateJobStatus);
router.delete('/jobs/:id', deleteJobPosting);

/* ==========================================
 * JobRequiredSkill routes
 * ========================================== */
router.post('/jobs/:jobId/required-skills', addRequiredSkillValidation, handleValidationErrors, addRequiredSkill);
router.delete('/jobs/:jobId/required-skills/:skillReqId', removeRequiredSkill);

module.exports = router;