const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { attachProfile } = require('../middleware/profileMiddleware');
const { listOpenJobs, getOpenJob } = require('../controllers/jobController');
const { getJobEligibility } = require('../controllers/eligibilityController');
const { applyToJob } = require('../controllers/applicationController');
const { listJobsValidation, handleValidationErrors } = require('../validators/jobValidators');
const { applyToJobValidation } = require('../validators/applicationValidators');

const router = express.Router();

// All routes require authentication (any authenticated user can browse)
router.use(authenticate);

router.get('/', listJobsValidation, handleValidationErrors, listOpenJobs);
router.get('/:id', getOpenJob);

// Single-job eligibility requires a candidate profile — attachProfile scoped
// ONLY to this route, not the browsing routes above.
router.get('/:id/eligibility', attachProfile, getJobEligibility);

// Apply to a job — requires a candidate profile (attachProfile scoped to this route)
router.post('/:id/apply', attachProfile, applyToJobValidation, handleValidationErrors, applyToJob);

module.exports = router;