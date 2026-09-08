const { body, param } = require('express-validator');
const { handleValidationErrors } = require('./authValidators');

const LANGUAGE_PROFICIENCY_VALUES = ['BEGINNER', 'CONVERSATIONAL', 'FLUENT', 'NATIVE'];
const SOCIAL_PLATFORM_VALUES = ['LINKEDIN', 'GITHUB', 'PORTFOLIO', 'OTHER'];

const createEducationValidation = [
  body('institution')
    .trim()
    .notEmpty().withMessage('Institution is required')
    .isString()
    .isLength({ max: 200 }).withMessage('Institution must be at most 200 characters'),
  body('degree')
    .trim()
    .notEmpty().withMessage('Degree is required')
    .isString()
    .isLength({ max: 100 }).withMessage('Degree must be at most 100 characters'),
  body('fieldOfStudy')
    .trim()
    .notEmpty().withMessage('Field of study is required')
    .isString()
    .isLength({ max: 100 }).withMessage('Field of study must be at most 100 characters'),
  body('startYear')
    .notEmpty().withMessage('Start year is required')
    .isInt({ min: 1900, max: new Date().getFullYear() + 5 }).withMessage('Invalid start year'),
  body('endYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 5 }).withMessage('Invalid end year'),
  body('grade')
    .optional()
    .isString()
    .isLength({ max: 50 }).withMessage('Grade must be at most 50 characters'),
];

const updateEducationValidation = [
  body('institution')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 200 }).withMessage('Institution must be at most 200 characters'),
  body('degree')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 100 }).withMessage('Degree must be at most 100 characters'),
  body('fieldOfStudy')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 100 }).withMessage('Field of study must be at most 100 characters'),
  body('startYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 5 }).withMessage('Invalid start year'),
  body('endYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 5 }).withMessage('Invalid end year'),
  body('grade')
    .optional()
    .isString()
    .isLength({ max: 50 }).withMessage('Grade must be at most 50 characters'),
];

const createExperienceValidation = [
  body('company')
    .trim()
    .notEmpty().withMessage('Company is required')
    .isString()
    .isLength({ max: 200 }).withMessage('Company must be at most 200 characters'),
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isString()
    .isLength({ max: 100 }).withMessage('Title must be at most 100 characters'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid start date format'),
  body('endDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid end date format'),
  body('isCurrent')
    .optional()
    .isBoolean().withMessage('isCurrent must be a boolean'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
  body().custom((value) => {
    if (value.isCurrent === true && (value.endDate !== undefined && value.endDate !== null)) {
      throw new Error('endDate must not be provided when isCurrent is true');
    }
    if (value.isCurrent !== true && (value.endDate === undefined || value.endDate === null)) {
      throw new Error('endDate is required when isCurrent is false');
    }
    if (value.startDate && value.endDate && new Date(value.endDate) <= new Date(value.startDate)) {
      throw new Error('endDate must be after startDate');
    }
    return true;
  }),
];

// NOTE: cross-field (isCurrent/endDate/startDate) consistency check is
// intentionally NOT done here for partial updates — validators can't see
// the existing DB row, so that check is done in the updateExperience
// controller after merging incoming fields with the existing record.
const updateExperienceValidation = [
  body('company')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 200 }).withMessage('Company must be at most 200 characters'),
  body('title')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 100 }).withMessage('Title must be at most 100 characters'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  body('endDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid end date format'),
  body('isCurrent')
    .optional()
    .isBoolean().withMessage('isCurrent must be a boolean'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
];

const createSkillClaimValidation = [
  body('skillId')
    .trim()
    .notEmpty().withMessage('Skill ID is required')
    .isString()
    .isLength({ max: 50 }).withMessage('Invalid skill ID format'),
  body('selfRatedLevel')
    .notEmpty().withMessage('Self-rated level is required')
    .isInt({ min: 1, max: 5 }).withMessage('Self-rated level must be an integer between 1 and 5'),
];

const updateSkillClaimValidation = [
  body('skillId')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 50 }).withMessage('Invalid skill ID format'),
  body('selfRatedLevel')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Self-rated level must be an integer between 1 and 5'),
];

const createCertificationValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isString()
    .isLength({ max: 200 }).withMessage('Name must be at most 200 characters'),
  body('issuer')
    .trim()
    .notEmpty().withMessage('Issuer is required')
    .isString()
    .isLength({ max: 200 }).withMessage('Issuer must be at most 200 characters'),
  body('issueDate')
    .notEmpty().withMessage('Issue date is required')
    .isISO8601().withMessage('Invalid issue date format'),
  body('credentialUrl')
    .optional()
    .isURL().withMessage('Invalid credential URL'),
];

const updateCertificationValidation = [
  body('name')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 200 }).withMessage('Name must be at most 200 characters'),
  body('issuer')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 200 }).withMessage('Issuer must be at most 200 characters'),
  body('issueDate')
    .optional()
    .isISO8601().withMessage('Invalid issue date format'),
  body('credentialUrl')
    .optional()
    .isURL().withMessage('Invalid credential URL'),
];

const createProjectValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isString()
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isString()
    .isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
  body('techStack')
    .notEmpty().withMessage('Tech stack is required')
    .isArray({ max: 20 }).withMessage('Tech stack must be an array with at most 20 items'),
  body('techStack.*')
    .isString()
    .isLength({ max: 50 }).withMessage('Each tech stack item must be at most 50 characters'),
  body('link')
    .optional()
    .isURL().withMessage('Invalid project link'),
];

const updateProjectValidation = [
  body('title')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('description')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
  body('techStack')
    .optional()
    .isArray({ max: 20 }).withMessage('Tech stack must be an array with at most 20 items'),
  body('techStack.*')
    .isString()
    .isLength({ max: 50 }).withMessage('Each tech stack item must be at most 50 characters'),
  body('link')
    .optional()
    .isURL().withMessage('Invalid project link'),
];

const createPreferredRoleValidation = [
  body('roleName')
    .trim()
    .notEmpty().withMessage('Role name is required')
    .isString()
    .isLength({ max: 100 }).withMessage('Role name must be at most 100 characters'),
];

const updatePreferredRoleValidation = [
  body('roleName')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 100 }).withMessage('Role name must be at most 100 characters'),
];

const createPreferredLocationValidation = [
  body('locationName')
    .trim()
    .notEmpty().withMessage('Location name is required')
    .isString()
    .isLength({ max: 100 }).withMessage('Location name must be at most 100 characters'),
];

const updatePreferredLocationValidation = [
  body('locationName')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 100 }).withMessage('Location name must be at most 100 characters'),
];

const createLanguageKnownValidation = [
  body('language')
    .trim()
    .notEmpty().withMessage('Language is required')
    .isString()
    .isLength({ max: 50 }).withMessage('Language must be at most 50 characters'),
  body('proficiency')
    .notEmpty().withMessage('Proficiency is required')
    .isIn(LANGUAGE_PROFICIENCY_VALUES).withMessage(`Proficiency must be one of: ${LANGUAGE_PROFICIENCY_VALUES.join(', ')}`),
];

const updateLanguageKnownValidation = [
  body('language')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 50 }).withMessage('Language must be at most 50 characters'),
  body('proficiency')
    .optional()
    .isIn(LANGUAGE_PROFICIENCY_VALUES).withMessage(`Proficiency must be one of: ${LANGUAGE_PROFICIENCY_VALUES.join(', ')}`),
];

const createSocialLinkValidation = [
  body('platform')
    .notEmpty().withMessage('Platform is required')
    .isIn(SOCIAL_PLATFORM_VALUES).withMessage(`Platform must be one of: ${SOCIAL_PLATFORM_VALUES.join(', ')}`),
  body('url')
    .trim()
    .notEmpty().withMessage('URL is required')
    .isURL().withMessage('Invalid URL format'),
];

const updateSocialLinkValidation = [
  body('platform')
    .optional()
    .isIn(SOCIAL_PLATFORM_VALUES).withMessage(`Platform must be one of: ${SOCIAL_PLATFORM_VALUES.join(', ')}`),
  body('url')
    .optional()
    .trim()
    .isURL().withMessage('Invalid URL format'),
];

const createReferenceValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isString()
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
  body('relation')
    .trim()
    .notEmpty().withMessage('Relation is required')
    .isString()
    .isLength({ max: 100 }).withMessage('Relation must be at most 100 characters'),
  body('contactInfo')
    .trim()
    .notEmpty().withMessage('Contact info is required')
    .isString()
    .isLength({ max: 500 }).withMessage('Contact info must be at most 500 characters'),
];

const updateReferenceValidation = [
  body('name')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
  body('relation')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 100 }).withMessage('Relation must be at most 100 characters'),
  body('contactInfo')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 }).withMessage('Contact info must be at most 500 characters'),
];

const idParamValidation = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isString().withMessage('Invalid ID format'),
];

module.exports = {
  createEducationValidation,
  updateEducationValidation,
  createExperienceValidation,
  updateExperienceValidation,
  createSkillClaimValidation,
  updateSkillClaimValidation,
  createCertificationValidation,
  updateCertificationValidation,
  createProjectValidation,
  updateProjectValidation,
  createPreferredRoleValidation,
  updatePreferredRoleValidation,
  createPreferredLocationValidation,
  updatePreferredLocationValidation,
  createLanguageKnownValidation,
  updateLanguageKnownValidation,
  createSocialLinkValidation,
  updateSocialLinkValidation,
  createReferenceValidation,
  updateReferenceValidation,
  idParamValidation,
  handleValidationErrors,
};
