const { body, validationResult } = require('express-validator');

const GENDER_VALUES = ['male', 'female', 'other', 'prefer_not_to_say'];

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const hasLetterAndNumber = (value) => /[A-Za-z]/.test(value) && /\d/.test(value);

const isValidName = (value) => /^[A-Za-z\s'-]+$/.test(value);

const isAtLeast16 = (value) => {
  const dob = new Date(value);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 16;
};

const registerValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must be at most 255 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isString()
    .isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters')
    .custom(hasLetterAndNumber).withMessage('Password must contain at least one letter and one number'),
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isString()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .custom(isValidName).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
  body('phone')
    .notEmpty().withMessage('Phone is required')
    .isString()
    .matches(phoneRegex).withMessage('Invalid phone format'),
  body('dob')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Invalid date format')
    .custom(isAtLeast16).withMessage('Must be at least 16 years old'),
  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(GENDER_VALUES).withMessage(`Gender must be one of: ${GENDER_VALUES.join(', ')}`),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isString(),
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => {
      if (err.path === 'phone') {
        return { field: 'phone', message: 'Invalid phone format' };
      }
      return { field: err.path, message: err.msg };
    });
    return res.status(422).json({ success: false, message: 'Validation failed', errors: formatted });
  }
  next();
}

module.exports = { registerValidation, loginValidation, handleValidationErrors };
