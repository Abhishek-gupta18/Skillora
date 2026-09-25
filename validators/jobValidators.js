const { query } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const listJobsValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query must be at most 100 characters'),
  query('employmentType')
    .optional()
    .isIn(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'])
    .withMessage('employmentType must be one of: FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT'),
  query('experienceLevel')
    .optional()
    .isIn(['ENTRY', 'MID', 'SENIOR', 'LEAD'])
    .withMessage('experienceLevel must be one of: ENTRY, MID, SENIOR, LEAD'),
  query('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be at most 200 characters'),
  query('isRemote')
    .optional()
    .isBoolean().withMessage('isRemote must be a boolean')
    .toBoolean(),
];

module.exports = { listJobsValidation, handleValidationErrors };