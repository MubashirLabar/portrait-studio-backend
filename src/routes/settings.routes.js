const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  getConsentFormSettings,
  updateConsentFormSettings,
} = require('../controllers/settings.controller');

const router = express.Router();

router.get('/consent-form', authMiddleware, getConsentFormSettings);
router.put('/consent-form', authMiddleware, updateConsentFormSettings);

module.exports = router;

