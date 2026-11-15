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
  listRetakeRequests,
  updateRetakeRequest,
  listUsers,
  updateUserStatus,
  createSkill,
  listSkillsAdmin,
  updateSkill,
  listQuestions,
  createQuestion,
  updateQuestion,
  updateQuestionActive,
  createQuestionsBulk,
  getQuestionsCoverage,
} = require('../controllers/adminController');
const { adminDeleteInterviewExperience } = require('../controllers/adminInterviewExperienceController');
const {
  listJobApplicants,
  updateApplicationStatus,
  downloadApplicantResume,
} = require('../controllers/adminApplicationController');
const {
  createRoadmapTemplate,
  listRoadmapTemplates,
  getRoadmapTemplate,
  updateRoadmapTemplate,
  deleteRoadmapTemplate,
  addRoadmapStep,
  updateRoadmapStep,
  removeRoadmapStep,
} = require('../controllers/adminRoadmapController');
const {
  createCompanyValidation,
  updateCompanyValidation,
  createJobPostingValidation,
  updateJobPostingValidation,
  updateJobStatusValidation,
  addRequiredSkillValidation,
  handleValidationErrors,
} = require('../validators/adminValidators');
const {
  createRoadmapTemplateValidation,
  updateRoadmapTemplateValidation,
  createRoadmapStepValidation,
  updateRoadmapStepValidation,
} = require('../validators/adminRoadmapValidators');
const { updateApplicationStatusValidation } = require('../validators/adminApplicationValidators');
const {
  retakeRequestListQueryValidation,
  updateRetakeRequestValidation,
} = require('../validators/retakeRequestValidators');
const { userListQueryValidation, userStatusUpdateValidation } = require('../validators/adminValidators');
const { skillCreateValidation, skillUpdateValidation, skillListQueryValidation } = require('../validators/adminSkillValidators');
const { questionListQueryValidation, questionCreateValidation, questionUpdateValidation, questionActiveValidation, questionBulkValidation, questionCoverageValidation } = require('../validators/adminQuestionValidators');

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

/* ==========================================
 * Interview Experience Moderation
 * ========================================== */
router.delete('/interview-experiences/:id', adminDeleteInterviewExperience);

/* ==========================================
 * Roadmap Template routes
 * ========================================== */
router.post('/roadmap-templates', createRoadmapTemplateValidation, handleValidationErrors, createRoadmapTemplate);
router.get('/roadmap-templates', listRoadmapTemplates);
router.get('/roadmap-templates/:id', getRoadmapTemplate);
router.patch('/roadmap-templates/:id', updateRoadmapTemplateValidation, handleValidationErrors, updateRoadmapTemplate);
router.delete('/roadmap-templates/:id', deleteRoadmapTemplate);

/* ==========================================
 * Roadmap Step routes
 * ========================================== */
router.post('/roadmap-templates/:templateId/steps', createRoadmapStepValidation, handleValidationErrors, addRoadmapStep);
router.patch('/roadmap-templates/:templateId/steps/:id', updateRoadmapStepValidation, handleValidationErrors, updateRoadmapStep);
router.delete('/roadmap-templates/:templateId/steps/:id', removeRoadmapStep);

/* ==========================================
 * RetakeRequest routes (Admin)
 * ========================================== */
router.get('/retake-requests', retakeRequestListQueryValidation, handleValidationErrors, listRetakeRequests);
router.patch('/retake-requests/:id', updateRetakeRequestValidation, handleValidationErrors, updateRetakeRequest);

/* ==========================================
 * User Management routes (Admin)
 * ========================================== */
router.get('/users', userListQueryValidation, handleValidationErrors, listUsers);
router.patch('/users/:id/status', userStatusUpdateValidation, handleValidationErrors, updateUserStatus);

/* ==========================================
 * Skill Management routes (Admin)
 * ========================================== */
router.post('/skills', skillCreateValidation, handleValidationErrors, createSkill);
router.get('/skills', skillListQueryValidation, handleValidationErrors, listSkillsAdmin);
router.patch('/skills/:id', skillUpdateValidation, handleValidationErrors, updateSkill);

/* ==========================================
 * Question Management routes (Admin)
 * ========================================== */
router.get('/questions', questionListQueryValidation, handleValidationErrors, listQuestions);
router.post('/questions', questionCreateValidation, handleValidationErrors, createQuestion);
router.patch('/questions/:id', questionUpdateValidation, handleValidationErrors, updateQuestion);
router.patch('/questions/:id/active', questionActiveValidation, handleValidationErrors, updateQuestionActive);
router.post('/questions/bulk', questionBulkValidation, handleValidationErrors, createQuestionsBulk);
router.get('/questions/coverage', getQuestionsCoverage);

module.exports = router;