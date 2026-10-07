const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { attachProfile } = require('../middleware/profileMiddleware');
const {
  basicInfoValidation,
  photoHeadlineValidation,
  addressValidation,
  careerSummaryValidation,
  salaryExpectationValidation,
  availabilityValidation,
  privacyConsentValidation,
  handleValidationErrors,
} = require('../validators/profileValidators');
const {
  getFullProfile,
  upsertBasicInfo,
  upsertPhotoHeadline,
  upsertAddress,
  upsertCareerSummary,
  upsertSalaryExpectation,
  upsertAvailability,
  upsertPrivacyConsent,
  getDashboard,
} = require('../controllers/profileController');
const { getJobMatches } = require('../controllers/eligibilityController');
const { listMyApplications, withdrawApplication } = require('../controllers/applicationController');
const {
  requestRoadmap,
  listMyRoadmaps,
  getMyRoadmap,
  updateStepProgress,
  abandonRoadmap,
} = require('../controllers/roadmapController');
const {
  requestRoadmapValidation,
  updateStepProgressValidation,
} = require('../validators/roadmapValidators');

const router = express.Router();

router.use(authenticate);
router.use(attachProfile);

router.get('/me', getFullProfile);
router.get('/me/dashboard', getDashboard);
router.get('/me/job-matches', getJobMatches);
router.get('/me/applications', listMyApplications);
router.patch('/me/applications/:id/withdraw', withdrawApplication);

router.patch(
  '/me/basic-info',
  basicInfoValidation,
  handleValidationErrors,
  upsertBasicInfo
);

router.patch(
  '/me/photo-headline',
  photoHeadlineValidation,
  handleValidationErrors,
  upsertPhotoHeadline
);

router.patch(
  '/me/address',
  addressValidation,
  handleValidationErrors,
  upsertAddress
);

router.patch(
  '/me/career-summary',
  careerSummaryValidation,
  handleValidationErrors,
  upsertCareerSummary
);

router.patch(
  '/me/salary-expectation',
  salaryExpectationValidation,
  handleValidationErrors,
  upsertSalaryExpectation
);

router.patch(
  '/me/availability',
  availabilityValidation,
  handleValidationErrors,
  upsertAvailability
);

router.patch(
  '/me/privacy-consent',
  privacyConsentValidation,
  handleValidationErrors,
  upsertPrivacyConsent
);

router.post('/me/roadmaps', requestRoadmapValidation, handleValidationErrors, requestRoadmap);
router.get('/me/roadmaps', listMyRoadmaps);
router.get('/me/roadmaps/:assignmentId', getMyRoadmap);
router.patch('/me/roadmaps/:assignmentId/steps/:stepId', updateStepProgressValidation, handleValidationErrors, updateStepProgress);
router.patch('/me/roadmaps/:assignmentId/abandon', abandonRoadmap);

module.exports = router;
