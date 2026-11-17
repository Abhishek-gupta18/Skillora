const { query, param, body } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const notificationListQueryValidation = [
  query('unreadOnly').optional().isIn(['true', 'false']).withMessage('unreadOnly must be true or false'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
];

const notificationReadValidation = [
  param('id').isString().notEmpty().withMessage('Notification ID is required'),
];

const notificationReadAllValidation = [];

module.exports = {
  notificationListQueryValidation,
  notificationReadValidation,
  notificationReadAllValidation,
  handleValidationErrors,
};