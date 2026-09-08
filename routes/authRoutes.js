const express = require('express');
const { authLimiter } = require('../middleware/rateLimiters');
const { registerValidation, loginValidation, handleValidationErrors } = require('../validators/authValidators');
const { register, login } = require('../controllers/authController');

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

module.exports = router;
