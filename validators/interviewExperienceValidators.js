const { body, query } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const ROUND_TYPES = [
  'ONLINE_ASSESSMENT',
  'TECHNICAL',
  'HR',
  'MANAGERIAL',
  'SYSTEM_DESIGN',
  'GROUP_DISCUSSION',
  'OTHER',
];

const OUTCOMES = ['SELECTED', 'REJECTED', 'PENDING', 'WITHDREW'];

const createInterviewExperienceValidation = [
  body('companyName')
    .trim()
    .notEmpty().withMessage('companyName is required')
    .isString()
    .isLength({ max: 200 }).withMessage('companyName must be at most 200 characters'),
  body('companyId')
    .optional()
    .isString().withMessage('companyId must be a string')
    .notEmpty().withMessage('companyId cannot be empty if provided'),
  body('roleTitle')
    .trim()
    .notEmpty().withMessage('roleTitle is required')
    .isString()
    .isLength({ max: 200 }).withMessage('roleTitle must be at most 200 characters'),
  body('jobPostingId')
    .optional()
    .isString().withMessage('jobPostingId must be a string')
    .notEmpty().withMessage('jobPostingId cannot be empty if provided'),
  body('outcome')
    .notEmpty().withMessage('outcome is required')
    .isIn(OUTCOMES).withMessage(`outcome must be one of: ${OUTCOMES.join(', ')}`),
  body('interviewDate')
    .optional()
    .isISO8601().withMessage('interviewDate must be a valid ISO 8601 date'),
  body('isAnonymous')
    .optional()
    .isBoolean().withMessage('isAnonymous must be a boolean'),
  body('narrative')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('narrative must be at most 5000 characters'),
  body('rounds')
    .notEmpty().withMessage('rounds is required')
    .isArray({ min: 1, max: 10 }).withMessage('rounds must have between 1 and 10 items'),
  body('rounds.*.roundOrder')
    .notEmpty().withMessage('roundOrder is required for each round')
    .isInt({ min: 1 }).withMessage('roundOrder must be an integer >= 1'),
  body('rounds.*.roundType')
    .notEmpty().withMessage('roundType is required for each round')
    .isIn(ROUND_TYPES).withMessage(`roundType must be one of: ${ROUND_TYPES.join(', ')}`),
  body('rounds.*.questionsAsked')
    .notEmpty().withMessage('questionsAsked is required for each round')
    .isArray({ max: 20 }).withMessage('questionsAsked must have at most 20 items'),
  body('rounds.*.questionsAsked.*')
    .isString().withMessage('each question must be a string')
    .isLength({ max: 500 }).withMessage('each question must be at most 500 characters'),
  body('rounds.*.notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('notes must be at most 1000 characters'),
];

const listInterviewExperiencesValidation = [
  query('companyName')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('companyName filter must be at most 200 characters'),
  query('roleTitle')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('roleTitle filter must be at most 200 characters'),
  query('outcome')
    .optional()
    .isIn(OUTCOMES).withMessage(`outcome must be one of: ${OUTCOMES.join(', ')}`),
];

module.exports = {
  createInterviewExperienceValidation,
  listInterviewExperiencesValidation,
  handleValidationErrors,
};