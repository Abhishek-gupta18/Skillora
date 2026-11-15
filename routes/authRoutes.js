const express = require('express');
const { authLimiter } = require('../middleware/rateLimiters');
const { registerValidation, loginValidation, changePasswordValidation, handleValidationErrors } = require('../validators/authValidators');
const { register, login, getMe, changePassword, logoutAll } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { matchedData } = require('express-validator');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  registerValidation,
  handleValidationErrors,
  register
);

router.post(
  '/login',
  authLimiter,
  loginValidation,
  handleValidationErrors,
  login
);

router.get(
  '/me',
  authenticate,
  getMe
);

router.post(
  '/change-password',
  authenticate,
  authLimiter,
  changePasswordValidation,
  handleValidationErrors,
  changePassword
);

router.post(
  '/logout-all',
  authenticate,
  logoutAll
);

module.exports = router;