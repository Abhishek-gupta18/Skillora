const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../validators/authValidators');

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

/**
 * questionListQueryValidation — GET /admin/questions query params
 */
const questionListQueryValidation = [
  query('skillId').optional().isString().withMessage('Invalid skillId'),
  query('difficulty').optional().isIn(DIFFICULTIES).withMessage('Invalid difficulty'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
];

/**
 * questionCreateValidation — POST /admin/questions
 */
const questionCreateValidation = [
  body('skillId').notEmpty().withMessage('skillId is required').isString(),
  body('difficulty').isIn(DIFFICULTIES).withMessage('difficulty must be EASY, MEDIUM, or HARD'),
  body('promptText').trim().notEmpty().withMessage('promptText is required').isLength({ max: 5000 }).withMessage('promptText too long'),
  body('options')
    .isArray({ min: 2, max: 6 }).withMessage('Options must be an array of 2-6 strings'),
  body('options.*').isString().isLength({ min: 1, max: 300 }).withMessage('Each option must be 1-300 characters'),
  body('correctOptionIndex')
    .toInt()
    .isInt({ min: 0 }).withMessage('correctOptionIndex must be a non-negative integer'),
  // Custom validator to check correctOptionIndex against options array length
  body('correctOptionIndex').custom((value, { req }) => {
    const options = req.body.options;
    if (Array.isArray(options) && (value < 0 || value >= options.length)) {
      throw new Error('correctOptionIndex out of bounds');
    }
    return true;
  }),
];

/**
 * questionUpdateValidation — PATCH /admin/questions/:id
 * All fields optional, but at least one must be provided
 */
const questionUpdateValidation = [
  param('id').isString().notEmpty().withMessage('Question ID is required'),
  body('skillId').optional().isString().withMessage('Invalid skillId'),
  body('difficulty').optional().isIn(DIFFICULTIES).withMessage('Invalid difficulty'),
  body('promptText').optional().trim().isLength({ min: 1, max: 5000 }).withMessage('promptText too long'),
  body('options')
    .optional()
    .isArray({ min: 2, max: 6 }).withMessage('Options must be an array of 2-6 strings'),
  body('options.*').optional().isString().isLength({ min: 1, max: 300 }).withMessage('Each option must be 1-300 characters'),
  body('correctOptionIndex')
    .optional()
    .toInt()
    .isInt({ min: 0 }).withMessage('correctOptionIndex must be a non-negative integer'),
  // Custom validator to check correctOptionIndex against options array length if options provided
  body('correctOptionIndex').custom((value, { req }) => {
    const options = req.body.options;
    if (Array.isArray(options) && (value < 0 || value >= options.length)) {
      throw new Error('correctOptionIndex out of bounds');
    }
    return true;
  }),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body().custom((value, { req }) => {
    const { skillId, difficulty, promptText, options, correctOptionIndex, isActive } = req.body;
    if (
      skillId === undefined &&
      difficulty === undefined &&
      promptText === undefined &&
      options === undefined &&
      correctOptionIndex === undefined &&
      isActive === undefined
    ) {
      throw new Error('At least one field must be provided for update');
    }
    return true;
  }),
];

/**
 * questionActiveValidation — PATCH /admin/questions/:id/active
 */
const questionActiveValidation = [
  param('id').isString().notEmpty().withMessage('Question ID is required'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
];

/**
 * questionBulkValidation — POST /admin/questions/bulk
 */
const questionBulkValidation = [
  body('skillId').notEmpty().withMessage('skillId is required').isString(),
  body('difficulty').isIn(DIFFICULTIES).withMessage('difficulty must be EASY, MEDIUM, or HARD'),
  body('questions')
    .isArray({ min: 1, max: 100 }).withMessage('questions must be an array of 1-100 items'),
  body('questions.*.promptText')
    .trim()
    .notEmpty()
    .withMessage('promptText is required')
    .isLength({ max: 5000 })
    .withMessage('promptText too long'),
  body('questions.*.options')
    .isArray({ min: 2, max: 6 })
    .withMessage('Options must be an array of 2-6 strings'),
  body('questions.*.options.*')
    .isString()
    .isLength({ min: 1, max: 300 })
    .withMessage('Each option must be 1-300 characters'),
  body('questions.*.correctOptionIndex')
    .toInt()
    .isInt({ min: 0 })
    .withMessage('correctOptionIndex must be a non-negative integer'),
];

const questionCoverageValidation = [];

module.exports = {
  questionListQueryValidation,
  questionCreateValidation,
  questionUpdateValidation,
  questionActiveValidation,
  questionBulkValidation,
  questionCoverageValidation,
  handleValidationErrors,
};