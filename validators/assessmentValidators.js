const { body } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const startSessionValidation = [
  body('skillId')
    .trim()
    .notEmpty().withMessage('skillId is required')
    .isString(),
];

const submitAnswerValidation = [
  body('questionId')
    .trim()
    .notEmpty().withMessage('questionId is required')
    .isString(),
  body('selectedOptionIndex')
    .notEmpty().withMessage('selectedOptionIndex is required')
    .isInt({ min: 0 }).withMessage('selectedOptionIndex must be a non-negative integer'),
];

module.exports = {
  startSessionValidation,
  submitAnswerValidation,
  handleValidationErrors,
};