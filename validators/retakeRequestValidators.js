const { body, query, param, validationResult } = require('express-validator');

const retakeReasonTypeValues = ['SYSTEM_FAILURE', 'OTHER_VALID_REASON'];
const retakeRequestStatusValues = ['PENDING', 'APPROVED', 'REJECTED'];

const createRetakeRequestValidation = [
  body('sessionId')
    .trim()
    .notEmpty().withMessage('sessionId is required')
    .isString(),
  body('reasonType')
    .notEmpty().withMessage('reasonType is required')
    .isIn(retakeReasonTypeValues).withMessage(`reasonType must be one of: ${retakeReasonTypeValues.join(', ')}`),
  body('reason')
    .trim()
    .notEmpty().withMessage('reason is required')
    .isString()
    .isLength({ min: 20, max: 1000 }).withMessage('reason must be between 20 and 1000 characters'),
  body('evidenceNote')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 1000 }).withMessage('evidenceNote must be at most 1000 characters'),
];

const retakeRequestListQueryValidation = [
  query('status')
    .optional()
    .trim()
    .isIn(retakeRequestStatusValues).withMessage(`status must be one of: ${retakeRequestStatusValues.join(', ')}`),
  query('page')
    .optional()
    .toInt()
    .isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .toInt()
    .isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
];

const updateRetakeRequestValidation = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isString().withMessage('Invalid ID format'),
  body('status')
    .notEmpty().withMessage('status is required')
    .isIn(['APPROVED', 'REJECTED']).withMessage('status must be APPROVED or REJECTED'),
  body('reviewNote')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 1000 }).withMessage('reviewNote must be at most 1000 characters'),
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors: formatted });
  }
  next();
}

module.exports = {
  createRetakeRequestValidation,
  retakeRequestListQueryValidation,
  updateRetakeRequestValidation,
  handleValidationErrors,
};