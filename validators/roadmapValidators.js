const { body } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const requestRoadmapValidation = [
  body('skillId')
    .trim()
    .notEmpty().withMessage('skillId is required')
    .isString().withMessage('skillId must be a string'),
];

const updateStepProgressValidation = [
  body('isCompleted')
    .custom((value) => typeof value === 'boolean')
    .withMessage('isCompleted must be a boolean (true or false)'),
];

module.exports = {
  requestRoadmapValidation,
  updateStepProgressValidation,
  handleValidationErrors,
};