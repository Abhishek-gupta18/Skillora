const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { attachProfile } = require('../middleware/profileMiddleware');
const {
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
} = require('../validators/profileListValidators');
const {
  listEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  listExperience,
  createExperience,
  updateExperience,
  deleteExperience,
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  listCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listPreferredRoles,
  createPreferredRole,
  updatePreferredRole,
  deletePreferredRole,
  listPreferredLocations,
  createPreferredLocation,
  updatePreferredLocation,
  deletePreferredLocation,
  listLanguages,
  createLanguage,
  updateLanguage,
  deleteLanguage,
  listSocialLinks,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  listReferences,
  createReference,
  updateReference,
  deleteReference,
} = require('../controllers/profileListController');

const router = express.Router();

router.use(authenticate);
router.use(attachProfile);

router.get('/education', listEducation);
router.post('/education', createEducationValidation, handleValidationErrors, createEducation);
router.patch('/education/:id', idParamValidation, handleValidationErrors, updateEducationValidation, handleValidationErrors, updateEducation);
router.delete('/education/:id', idParamValidation, handleValidationErrors, deleteEducation);

router.get('/experience', listExperience);
router.post('/experience', createExperienceValidation, handleValidationErrors, createExperience);
router.patch('/experience/:id', idParamValidation, handleValidationErrors, updateExperienceValidation, handleValidationErrors, updateExperience);
router.delete('/experience/:id', idParamValidation, handleValidationErrors, deleteExperience);

router.get('/skills', listSkills);
router.post('/skills', createSkillClaimValidation, handleValidationErrors, createSkill);
router.patch('/skills/:id', idParamValidation, handleValidationErrors, updateSkillClaimValidation, handleValidationErrors, updateSkill);
router.delete('/skills/:id', idParamValidation, handleValidationErrors, deleteSkill);

router.get('/certifications', listCertifications);
router.post('/certifications', createCertificationValidation, handleValidationErrors, createCertification);
router.patch('/certifications/:id', idParamValidation, handleValidationErrors, updateCertificationValidation, handleValidationErrors, updateCertification);
router.delete('/certifications/:id', idParamValidation, handleValidationErrors, deleteCertification);

router.get('/projects', listProjects);
router.post('/projects', createProjectValidation, handleValidationErrors, createProject);
router.patch('/projects/:id', idParamValidation, handleValidationErrors, updateProjectValidation, handleValidationErrors, updateProject);
router.delete('/projects/:id', idParamValidation, handleValidationErrors, deleteProject);

router.get('/preferred-roles', listPreferredRoles);
router.post('/preferred-roles', createPreferredRoleValidation, handleValidationErrors, createPreferredRole);
router.patch('/preferred-roles/:id', idParamValidation, handleValidationErrors, updatePreferredRoleValidation, handleValidationErrors, updatePreferredRole);
router.delete('/preferred-roles/:id', idParamValidation, handleValidationErrors, deletePreferredRole);

router.get('/preferred-locations', listPreferredLocations);
router.post('/preferred-locations', createPreferredLocationValidation, handleValidationErrors, createPreferredLocation);
router.patch('/preferred-locations/:id', idParamValidation, handleValidationErrors, updatePreferredLocationValidation, handleValidationErrors, updatePreferredLocation);
router.delete('/preferred-locations/:id', idParamValidation, handleValidationErrors, deletePreferredLocation);

router.get('/languages', listLanguages);
router.post('/languages', createLanguageKnownValidation, handleValidationErrors, createLanguage);
router.patch('/languages/:id', idParamValidation, handleValidationErrors, updateLanguageKnownValidation, handleValidationErrors, updateLanguage);
router.delete('/languages/:id', idParamValidation, handleValidationErrors, deleteLanguage);

router.get('/social-links', listSocialLinks);
router.post('/social-links', createSocialLinkValidation, handleValidationErrors, createSocialLink);
router.patch('/social-links/:id', idParamValidation, handleValidationErrors, updateSocialLinkValidation, handleValidationErrors, updateSocialLink);
router.delete('/social-links/:id', idParamValidation, handleValidationErrors, deleteSocialLink);

router.get('/references', listReferences);
router.post('/references', createReferenceValidation, handleValidationErrors, createReference);
router.patch('/references/:id', idParamValidation, handleValidationErrors, updateReferenceValidation, handleValidationErrors, updateReference);
router.delete('/references/:id', idParamValidation, handleValidationErrors, deleteReference);

module.exports = router;
