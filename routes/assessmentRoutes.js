const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { attachProfile } = require('../middleware/profileMiddleware');
const {
  startSession,
  getSessionQuestions,
  submitAnswer,
  completeSession,
} = require('../controllers/assessmentController');
const {
  startSessionValidation,
  submitAnswerValidation,
  handleValidationErrors,
} = require('../validators/assessmentValidators');

const router = express.Router();

router.use(authenticate);
router.use(attachProfile);

router.post('/start', startSessionValidation, handleValidationErrors, startSession);
router.get('/:sessionId/questions', getSessionQuestions);
router.post('/:sessionId/answers', submitAnswerValidation, handleValidationErrors, submitAnswer);
router.post('/:sessionId/complete', completeSession);

module.exports = router;