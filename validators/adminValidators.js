const { body, param, check } = require('express-validator');
const { handleValidationErrors } = require('../validators/authValidators');

/**
 * createCompanyValidation — all fields required unless marked optional
 * 
 * name: trim, 2-200 chars
 * description: optional, max 5000 chars
 * website: optional, valid URL
 * industry: optional, max 100 chars
 * logoUrl: optional, valid URL
 */
const createCompanyValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description must be at most 5000 characters'),
  body('website')
    .optional()
    .isURL().withMessage('Website must be a valid URL'),
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Industry must be at most 100 characters'),
  body('logoUrl')
    .optional()
    .isURL().withMessage('Logo URL must be a valid URL'),
];

/**
 * updateCompanyValidation — same fields, all optional (PATCH)
 */
const updateCompanyValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description must be at most 5000 characters'),
  body('website')
    .optional()
    .isURL().withMessage('Website must be a valid URL'),
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Industry must be at most 100 characters'),
  body('logoUrl')
    .optional()
    .isURL().withMessage('Logo URL must be a valid URL'),
];

/**
 * createJobPostingValidation — all required unless noted
 * 
 * companyId: required, non-empty string (existence checked in controller)
 * title: trim, 2-200 chars
 * description: required, max 10000 chars
 * employmentType: required, isIn ['FULL_TIME','PART_TIME','INTERNSHIP','CONTRACT']
 * experienceLevel: required, isIn ['ENTRY','MID','SENIOR','LEAD']
 * location: required, max 200 chars
 * isRemote: optional, boolean (default handled by Prisma)
 * salaryMin: optional, isInt min 0
 * salaryMax: optional, isInt min 0
 * currency: optional, matches /^[A-Z]{3}$/
 * closesAt: optional, isISO8601
 * cross-check: if BOTH salaryMin and salaryMax provided, salaryMin <= salaryMax
 */
const createJobPostingValidation = [
  body('companyId')
    .notEmpty().withMessage('companyId is required'),
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('description')
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 10000 }).withMessage('Description must be at most 10000 characters'),
  body('employmentType')
    .isIn(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'])
    .withMessage('employmentType must be one of: FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT'),
  body('experienceLevel')
    .isIn(['ENTRY', 'MID', 'SENIOR', 'LEAD'])
    .withMessage('experienceLevel must be one of: ENTRY, MID, SENIOR, LEAD'),
  body('location')
    .trim()
    .notEmpty().withMessage('Location is required')
    .isLength({ max: 200 }).withMessage('Location must be at most 200 characters'),
  body('isRemote')
    .optional()
    .isBoolean().withMessage('isRemote must be a boolean'),
  body('salaryMin')
    .optional()
    .isInt({ min: 0 }).withMessage('salaryMin must be a non-negative integer'),
  body('salaryMax')
    .optional()
    .isInt({ min: 0 }).withMessage('salaryMax must be a non-negative integer'),
  body('currency')
    .optional()
    .matches(/^[A-Z]{3}$/).withMessage('Currency must be a 3-letter uppercase ISO 4217 code'),
  body('closesAt')
    .optional()
    .isISO8601().withMessage('closesAt must be a valid ISO8601 date'),
  body()
    .custom((value, { req }) => {
      const { salaryMin, salaryMax } = req.body;
      if (salaryMin !== undefined && salaryMax !== undefined) {
        if (salaryMin > salaryMax) {
          throw new Error('salaryMin must be less than or equal to salaryMax');
        }
      }
      return true;
    }),
];

/**
 * updateJobPostingValidation — same fields, all optional, WITHOUT the
 * cross-field salary check (that goes in the controller on merge,
 * same established pattern as upsertSalaryExpectation)
 */
const updateJobPostingValidation = [
  body('companyId')
    .optional()
    .notEmpty().withMessage('companyId is required'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 10000 }).withMessage('Description must be at most 10000 characters'),
  body('employmentType')
    .optional()
    .isIn(['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT'])
    .withMessage('employmentType must be one of: FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT'),
  body('experienceLevel')
    .optional()
    .isIn(['ENTRY', 'MID', 'SENIOR', 'LEAD'])
    .withMessage('experienceLevel must be one of: ENTRY, MID, SENIOR, LEAD'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be at most 200 characters'),
  body('isRemote')
    .optional()
    .isBoolean().withMessage('isRemote must be a boolean'),
  body('salaryMin')
    .optional()
    .isInt({ min: 0 }).withMessage('salaryMin must be a non-negative integer'),
  body('salaryMax')
    .optional()
    .isInt({ min: 0 }).withMessage('salaryMax must be a non-negative integer'),
  body('currency')
    .optional()
    .matches(/^[A-Z]{3}$/).withMessage('Currency must be a 3-letter uppercase ISO 4217 code'),
  body('closesAt')
    .optional()
    .isISO8601().withMessage('closesAt must be a valid ISO8601 date'),
];

/**
 * updateJobStatusValidation
 */
const updateJobStatusValidation = [
  body('status')
    .isIn(['DRAFT', 'OPEN', 'CLOSED'])
    .withMessage('status must be one of: DRAFT, OPEN, CLOSED'),
];

/**
 * addRequiredSkillValidation
 */
const addRequiredSkillValidation = [
  body('skillId')
    .notEmpty().withMessage('skillId is required')
    .isString().withMessage('Invalid skill ID format'),
  body('minimumLevel')
    .isInt({ min: 1, max: 5 }).withMessage('minimumLevel must be an integer between 1 and 5'),
  body('isRequired')
    .optional()
    .isBoolean().withMessage('isRequired must be a boolean'),
];

module.exports = {
  createCompanyValidation,
  updateCompanyValidation,
  createJobPostingValidation,
  updateJobPostingValidation,
  updateJobStatusValidation,
  addRequiredSkillValidation,
  handleValidationErrors,
};