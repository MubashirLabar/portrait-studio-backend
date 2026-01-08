const express = require('express');
const { body } = require('express-validator');
const {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  allocateStudioNumber,
  saveConsentFormSignature,
} = require('../controllers/booking.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation rules for creating bookings (all fields required)
const createBookingValidation = [
  body('customerName')
    .notEmpty()
    .withMessage('Customer name is required')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Customer name cannot be empty'),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 11) {
        throw new Error('Phone number must be exactly 11 digits');
      }
      return true;
    }),
  body('emergencyPhoneNumber')
    .optional()
    .custom((value) => {
      if (value && value.trim()) {
        const digits = value.replace(/\D/g, '');
        if (digits.length !== 11) {
          throw new Error('Emergency phone number must be exactly 11 digits');
        }
      }
      return true;
    }),
  body('photoshootType')
    .notEmpty()
    .withMessage('Photoshoot type is required')
    .isIn(['children', 'family', 'couple', 'maternity'])
    .withMessage('Invalid photoshoot type'),
  body('sessionDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      // If status is TBC, sessionDate can be null/empty
      if (req.body.status === 'TBC' && (!value || value === null || value === '')) {
        return true;
      }
      // Otherwise, sessionDate is required
      if (!value || value === null || value === '') {
        throw new Error('Session date is required');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Session date must be in YYYY-MM-DD format');
      }
      return true;
    }),
  body('sessionTime')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      // If status is TBC, sessionTime can be null/empty
      if (req.body.status === 'TBC' && (!value || value === null || value === '')) {
        return true;
      }
      // Otherwise, sessionTime is required
      if (!value || value === null || value === '') {
        throw new Error('Session time is required');
      }
      if (!/^\d{2}:\d{2}$/.test(value)) {
        throw new Error('Session time must be in HH:MM format');
      }
      return true;
    }),
  body('specialRequestDate')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // Allow null/empty values
      if (!value || value === null || value === '') {
        return true;
      }
      // If provided, validate format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Special request date must be in YYYY-MM-DD format');
      }
      return true;
    }),
  body('specialRequestTime')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // Allow null/empty values
      if (!value || value === null || value === '') {
        return true;
      }
      // If provided, validate format
      if (!/^\d{2}:\d{2}$/.test(value)) {
        throw new Error('Special request time must be in HH:MM format');
      }
      return true;
    }),
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['cash', 'card', 'not-paid'])
    .withMessage('Invalid payment method'),
  body('status')
    .optional()
    .isIn(['BOOKED', 'CONFIRMED', 'TBC', 'CANCELLED', 'NO_ANSWER', 'WLMK'])
    .withMessage('Invalid status'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('locationId').optional().isUUID().withMessage('Invalid location ID'),
];

// Validation rules for updating bookings (all fields optional)
const updateBookingValidation = [
  body('customerName')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Customer name cannot be empty'),
  body('phoneNumber')
    .optional()
    .custom((value) => {
      if (value) {
        const digits = value.replace(/\D/g, '');
        if (digits.length !== 11) {
          throw new Error('Phone number must be exactly 11 digits');
        }
      }
      return true;
    }),
  body('emergencyPhoneNumber')
    .optional()
    .custom((value) => {
      if (value && value.trim()) {
        const digits = value.replace(/\D/g, '');
        if (digits.length !== 11) {
          throw new Error('Emergency phone number must be exactly 11 digits');
        }
      }
      return true;
    }),
  body('photoshootType')
    .optional()
    .isIn(['children', 'family', 'couple', 'maternity'])
    .withMessage('Invalid photoshoot type'),
  body('sessionDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Session date must be in YYYY-MM-DD format'),
  body('sessionTime')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('Session time must be in HH:MM format'),
  body('specialRequestDate')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Special request date must be in YYYY-MM-DD format'),
  body('specialRequestTime')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('Special request time must be in HH:MM format'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'not-paid'])
    .withMessage('Invalid payment method'),
  body('status')
    .optional()
    .isIn(['BOOKED', 'CONFIRMED', 'TBC', 'CANCELLED', 'NO_ANSWER', 'WLMK'])
    .withMessage('Invalid status'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('studioNotes').optional().isString().withMessage('Studio notes must be a string'),
  body('locationId').optional().isUUID().withMessage('Invalid location ID'),
];

// Routes
router.post('/', authMiddleware, createBookingValidation, createBooking);
router.get('/', authMiddleware, getBookings);
router.get('/:id', authMiddleware, getBookingById);
router.put('/:id', authMiddleware, updateBookingValidation, updateBooking);
router.delete('/:id', authMiddleware, deleteBooking);
router.post('/:id/allocate-studio-number', authMiddleware, allocateStudioNumber);
router.post('/:id/consent-form-signature', authMiddleware, saveConsentFormSignature);

module.exports = router;

