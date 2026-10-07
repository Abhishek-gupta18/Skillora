const { body, check } = require('express-validator');
const { handleValidationErrors } = require('../validators/authValidators');

const ROADMAP_STEP_TYPES = ['STUDY', 'PRACTICE_CHECKPOINT'];
const RESOURCE_TYPES = ['VIDEO', 'ARTICLE', 'COURSE', 'DOCUMENTATION', 'OTHER'];

const createRoadmapTemplateValidation = [
  body('skillId')
    .notEmpty().withMessage('skillId is required')
    .isString().withMessage('Invalid skill ID format'),
  body('targetLevel')
    .isInt({ min: 1, max: 5 }).withMessage('targetLevel must be an integer between 1 and 5'),
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
];

const updateRoadmapTemplateValidation = [
  body('skillId')
    .optional()
    .notEmpty().withMessage('skillId is required')
    .isString().withMessage('Invalid skill ID format'),
  body('targetLevel')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('targetLevel must be an integer between 1 and 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
];

const createRoadmapStepValidation = [
  body('stepOrder')
    .isInt({ min: 1 }).withMessage('stepOrder must be a positive integer'),
  body('type')
    .isIn(ROADMAP_STEP_TYPES).withMessage(`type must be one of: ${ROADMAP_STEP_TYPES.join(', ')}`),
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
  body('resourceUrl')
    .optional()
    .isURL().withMessage('resourceUrl must be a valid URL'),
  body('resourceType')
    .optional()
    .isIn(RESOURCE_TYPES).withMessage(`resourceType must be one of: ${RESOURCE_TYPES.join(', ')}`),
  body('practiceQuestionCount')
    .optional()
    .isInt({ min: 1 }).withMessage('practiceQuestionCount must be a positive integer'),
  body()
    .custom((value, { req }) => {
      const { type, resourceUrl, practiceQuestionCount } = req.body;
      if (type === 'STUDY' && (!resourceUrl || resourceUrl.trim() === '')) {
        throw new Error('resourceUrl is required when type is STUDY');
      }
      if (type === 'PRACTICE_CHECKPOINT' && practiceQuestionCount === undefined) {
        throw new Error('practiceQuestionCount is required when type is PRACTICE_CHECKPOINT');
      }
      return true;
    }),
];

const updateRoadmapStepValidation = [
  body('stepOrder')
    .optional()
    .isInt({ min: 1 }).withMessage('stepOrder must be a positive integer'),
  body('type')
    .optional()
    .isIn(ROADMAP_STEP_TYPES).withMessage(`type must be one of: ${ROADMAP_STEP_TYPES.join(', ')}`),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
  body('resourceUrl')
    .optional()
    .isURL().withMessage('resourceUrl must be a valid URL'),
  body('resourceType')
    .optional()
    .isIn(RESOURCE_TYPES).withMessage(`resourceType must be one of: ${RESOURCE_TYPES.join(', ')}`),
  body('practiceQuestionCount')
    .optional()
    .isInt({ min: 1 }).withMessage('practiceQuestionCount must be a positive integer'),
  // NOTE: Cross-field type check (STUDY requires resourceUrl, PRACTICE_CHECKPOINT
  // requires practiceQuestionCount) is intentionally OMITTED on PATCH updates.
  // This follows the established pattern in this codebase (e.g., updateJobPostingValidation
  // omits the salaryMin<=salaryMax cross-check). Controllers may enforce on merge if desired.
];

module.exports = {
  createRoadmapTemplateValidation,
  updateRoadmapTemplateValidation,
  createRoadmapStepValidation,
  updateRoadmapStepValidation,
  handleValidationErrors,
};