const express = require('express');
const { body } = require('express-validator');
const {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
} = require('../controllers/location.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation rules for creating/updating location
const locationValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Location name is required')
    .isLength({ min: 2 })
    .withMessage('Location name must be at least 2 characters'),
  body('salesPersonIds')
    .isArray({ min: 1 })
    .withMessage('At least one sales person must be assigned'),
  body('salesPersonIds.*')
    .isUUID()
    .withMessage('Invalid sales person ID format'),
  body('dates')
    .isArray({ min: 1 })
    .withMessage('At least one date must be selected'),
  body('dates.*')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Invalid date format. Dates must be in YYYY-MM-DD format'),
];

const updateLocationValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location name cannot be empty')
    .isLength({ min: 2 })
    .withMessage('Location name must be at least 2 characters'),
  body('salesPersonIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one sales person must be assigned'),
  body('salesPersonIds.*')
    .optional()
    .isUUID()
    .withMessage('Invalid sales person ID format'),
  body('dates')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one date must be selected'),
  body('dates.*')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Invalid date format. Dates must be in YYYY-MM-DD format'),
];

// Routes
router.post('/', authMiddleware, locationValidation, createLocation);
router.get('/', authMiddleware, getLocations);
router.get('/:id', authMiddleware, getLocationById);
router.put('/:id', authMiddleware, updateLocationValidation, updateLocation);
router.delete('/:id', authMiddleware, deleteLocation);

module.exports = router;

