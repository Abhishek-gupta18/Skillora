const express = require('express');
const { authenticate, attachProfile } = require('../middleware/authMiddleware');
const { getDashboard } = require('../controllers/dashboardController');

const router = express.Router();

// Dashboard requires authentication + profile
router.use(authenticate);
router.use(attachProfile);

router.get('/', getDashboard);

module.exports = router;