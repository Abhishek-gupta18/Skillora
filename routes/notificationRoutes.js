const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { notificationListQueryValidation, notificationReadValidation, notificationReadAllValidation, handleValidationErrors } = require('../validators/notificationValidators');
const { listNotifications, markNotificationRead, markAllNotificationsRead } = require('../controllers/notificationController');

const router = express.Router();

// All routes require authentication (user must be logged in)
// No attachProfile needed - we use req.user.id from authenticate

router.get(
  '/',
  notificationListQueryValidation,
  handleValidationErrors,
  listNotifications
);

router.patch(
  '/:id/read',
  notificationReadValidation,
  handleValidationErrors,
  markNotificationRead
);

router.post(
  '/read-all',
  notificationReadAllValidation,
  handleValidationErrors,
  markAllNotificationsRead
);

module.exports = router;