const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { listSkills } = require('../controllers/skillController');

const router = express.Router();

// Master skill data is read-only reference data — any authenticated user
// (candidate claiming skills, admin attaching required skills) can list it.
router.use(authenticate);

router.get('/', listSkills);

module.exports = router;
