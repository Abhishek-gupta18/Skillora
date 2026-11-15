const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../validators/authValidators');

/**
 * skillCreateValidation — POST /admin/skills
 * name: required, 2-100 chars, unique (enforced by DB)
 * category: required, 1-50 chars
 */
const skillCreateValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isLength({ min: 1, max: 50 }).withMessage('Category must be between 1 and 50 characters'),
];

/**
 * skillUpdateValidation — PATCH /admin/skills/:id
 * All fields optional, but at least one must be provided
 */
const skillUpdateValidation = [
  param('id').isString().notEmpty().withMessage('Skill ID is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Category must be between 1 and 50 characters'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  body().custom((value, { req }) => {
    const { name, category, isActive } = req.body;
    if (name === undefined && category === undefined && isActive === undefined) {
      throw new Error('At least one field must be provided for update');
    }
    return true;
  }),
];

/**
 * skillListQueryValidation — GET /admin/skills query params
 */
const skillListQueryValidation = [
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
];

module.exports = {
  skillCreateValidation,
  skillUpdateValidation,
  skillListQueryValidation,
  handleValidationErrors,
};