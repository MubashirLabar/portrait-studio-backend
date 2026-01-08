const express = require('express');
const { body } = require('express-validator');
const {
  createSpecialRequestTime,
  getSpecialRequestTimes,
  updateSpecialRequestTime,
  deleteSpecialRequestTime,
} = require('../controllers/specialRequestTime.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation rules for creating/updating special request times
const specialRequestTimeValidation = [
  body('time')
    .notEmpty()
    .withMessage('Time is required')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format (24-hour)'),
];

// Routes
router.post('/', authMiddleware, specialRequestTimeValidation, createSpecialRequestTime);
router.get('/', authMiddleware, getSpecialRequestTimes);
router.put('/:id', authMiddleware, specialRequestTimeValidation, updateSpecialRequestTime);
router.delete('/:id', authMiddleware, deleteSpecialRequestTime);

module.exports = router;

