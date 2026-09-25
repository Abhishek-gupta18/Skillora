const { body } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const updateApplicationStatusValidation = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED'])
    .withMessage('Status must be one of: UNDER_REVIEW, SHORTLISTED, REJECTED, HIRED'),
];

module.exports = { updateApplicationStatusValidation, handleValidationErrors };