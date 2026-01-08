const express = require('express');
const { body } = require('express-validator');
const {
  createSessionTime,
  getSessionTimes,
  updateSessionTime,
  deleteSessionTime,
} = require('../controllers/sessionTime.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation rules for creating/updating session times
const sessionTimeValidation = [
  body('time')
    .notEmpty()
    .withMessage('Time is required')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format (24-hour)'),
];

// Routes
router.post('/', authMiddleware, sessionTimeValidation, createSessionTime);
router.get('/', authMiddleware, getSessionTimes);
router.put('/:id', authMiddleware, sessionTimeValidation, updateSessionTime);
router.delete('/:id', authMiddleware, deleteSessionTime);

module.exports = router;

