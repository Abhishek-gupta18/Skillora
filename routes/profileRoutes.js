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
} = require('../controllers/profileController');

const router = express.Router();

router.use(authenticate);
router.use(attachProfile);

router.get('/me', getFullProfile);

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

module.exports = router;
