const { body } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const GENDER_VALUES = ['male', 'female', 'other', 'prefer_not_to_say'];
const AVAILABILITY_VALUES = ['IMMEDIATE', 'DAYS_15', 'DAYS_30', 'DAYS_60_PLUS'];
const PROFILE_VISIBILITY_VALUES = ['PUBLIC', 'RECRUITERS_ONLY', 'PRIVATE'];

const phoneRegex = /^\+?[1-9]\d{1,14}$/;
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

const basicInfoValidation = [
  body('name')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .custom(isValidName).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
  body('dob')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .custom(isAtLeast16).withMessage('Must be at least 16 years old'),
  body('gender')
    .optional()
    .isIn(GENDER_VALUES).withMessage(`Gender must be one of: ${GENDER_VALUES.join(', ')}`),
  body('phone')
    .optional()
    .isString()
    .matches(phoneRegex).withMessage('Invalid phone format'),
];

const photoHeadlineValidation = [
  body('photoUrl')
    .optional()
    .isURL().withMessage('Invalid photo URL'),
  body('headline')
    .optional()
    .isString()
    .isLength({ max: 200 }).withMessage('Headline must be at most 200 characters'),
];

const addressValidation = [
  body('line1')
    .optional()
    .isString()
    .isLength({ max: 200 }).withMessage('Line 1 must be at most 200 characters'),
  body('line2')
    .optional()
    .isString()
    .isLength({ max: 200 }).withMessage('Line 2 must be at most 200 characters'),
  body('city')
    .optional()
    .isString()
    .isLength({ max: 100 }).withMessage('City must be at most 100 characters'),
  body('state')
    .optional()
    .isString()
    .isLength({ max: 100 }).withMessage('State must be at most 100 characters'),
  body('country')
    .optional()
    .isString()
    .isLength({ max: 100 }).withMessage('Country must be at most 100 characters'),
  body('pincode')
    .optional()
    .isString()
    .isLength({ max: 20 }).withMessage('Pincode must be at most 20 characters'),
];

const careerSummaryValidation = [
  body('text')
    .optional()
    .isString()
    .isLength({ max: 2000 }).withMessage('Career summary must be at most 2000 characters'),
];

const salaryExpectationValidation = [
  body('minAmount')
    .optional()
    .isInt({ min: 0 }).withMessage('minAmount must be a non-negative integer'),
  body('maxAmount')
    .optional()
    .isInt({ min: 0 }).withMessage('maxAmount must be a non-negative integer'),
  body('currency')
    .optional()
    .matches(/^[A-Z]{3}$/).withMessage('Currency must be a 3-letter uppercase ISO 4217 code'),
];

const availabilityValidation = [
  body('availability')
    .optional()
    .isIn(AVAILABILITY_VALUES).withMessage(`Availability must be one of: ${AVAILABILITY_VALUES.join(', ')}`),
];

const privacyConsentValidation = [
  body('profileVisibility')
    .optional()
    .isIn(PROFILE_VISIBILITY_VALUES).withMessage(`Profile visibility must be one of: ${PROFILE_VISIBILITY_VALUES.join(', ')}`),
  body('dataSharingConsent')
    .optional()
    .isBoolean().withMessage('dataSharingConsent must be a boolean'),
];

module.exports = {
  basicInfoValidation,
  photoHeadlineValidation,
  addressValidation,
  careerSummaryValidation,
  salaryExpectationValidation,
  availabilityValidation,
  privacyConsentValidation,
  handleValidationErrors,
};
