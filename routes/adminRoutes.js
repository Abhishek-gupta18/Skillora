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
  listJobApplicants,
  updateApplicationStatus,
  downloadApplicantResume,
} = require('../controllers/adminApplicationController');
const {
  createCompanyValidation,
  updateCompanyValidation,
  createJobPostingValidation,
  updateJobPostingValidation,
  updateJobStatusValidation,
  addRequiredSkillValidation,
  handleValidationErrors,
} = require('../validators/adminValidators');
const { updateApplicationStatusValidation } = require('../validators/adminApplicationValidators');

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

/* ==========================================
 * Application Management routes (admin-side)
 * ========================================== */
// These routes are added HERE in adminRoutes.js (not a separate router file)
// to avoid the double-middleware bug: adminRoutes.js already applies
// authenticate + requireRole(['ADMIN']) globally at lines 31-32.
// Mounting a second router at the same /api/v1/admin prefix would cause
// requests that fall through adminRoutes.js to hit the second router's
// middleware chain a second time — exactly the eligibilityRoutes.js mistake.
// By keeping all admin routes in this single file, the middleware runs once.
router.get('/jobs/:jobId/applications', listJobApplicants);
router.patch('/applications/:id/status', updateApplicationStatusValidation, handleValidationErrors, updateApplicationStatus);
router.get('/applications/:id/resume', downloadApplicantResume);

module.exports = router;