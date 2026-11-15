const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { attachProfile } = require('../middleware/profileMiddleware');
const { retakeRequestLimiter } = require('../middleware/rateLimiters');
const {
  startSession,
  getSessionQuestions,
  submitAnswer,
  completeSession,
  createRetakeRequest,
  listRetakeRequests,
} = require('../controllers/assessmentController');
const {
  startSessionValidation,
  submitAnswerValidation,
  handleValidationErrors,
} = require('../validators/assessmentValidators');
const {
  createRetakeRequestValidation,
  retakeRequestListQueryValidation,
} = require('../validators/retakeRequestValidators');

const router = express.Router();

router.use(authenticate);
router.use(attachProfile);

router.post('/start', startSessionValidation, handleValidationErrors, startSession);
router.get('/:sessionId/questions', getSessionQuestions);
router.post('/:sessionId/answers', submitAnswerValidation, handleValidationErrors, submitAnswer);
router.post('/:sessionId/complete', completeSession);

router.post('/retake-requests', retakeRequestLimiter, createRetakeRequestValidation, handleValidationErrors, createRetakeRequest);
router.get('/retake-requests', retakeRequestListQueryValidation, handleValidationErrors, listRetakeRequests);

module.exports = router;