const { body } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const applyToJobValidation = [
  body('coverNote')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Cover note must be at most 2000 characters'),
];

module.exports = { applyToJobValidation, handleValidationErrors };