const express = require('express');
const { body } = require('express-validator');
const {
  createCollectionDates,
  getCollectionDates,
  updateCollectionDates,
  deleteCollectionDates,
} = require('../controllers/collectionDate.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation rules for creating collection dates
const createCollectionDatesValidation = [
  body('locationId')
    .notEmpty()
    .withMessage('Location ID is required')
    .isUUID()
    .withMessage('Invalid location ID format'),
  body('dates')
    .isArray({ min: 1 })
    .withMessage('At least one date must be provided'),
  body('dates.*')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Invalid date format. Dates must be in YYYY-MM-DD format'),
];

// Validation rules for updating collection dates
const updateCollectionDatesValidation = [
  body('dates')
    .optional()
    .isArray()
    .withMessage('Dates must be an array'),
  body('dates.*')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Invalid date format. Dates must be in YYYY-MM-DD format'),
];

// Routes
router.post('/', authMiddleware, createCollectionDatesValidation, createCollectionDates);
router.get('/', authMiddleware, getCollectionDates);
router.put('/:locationId', authMiddleware, updateCollectionDatesValidation, updateCollectionDates);
router.delete('/:locationId', authMiddleware, deleteCollectionDates);

module.exports = router;

