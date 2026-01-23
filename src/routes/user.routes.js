const express = require('express');
const { body } = require('express-validator');
const { createSalesPerson, getSalesPersons, deleteSalesPerson, createCustomerCare, getCustomerCares, createStudioAssistant, getStudioAssistants, createSales, getSales, deleteSales } = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation rules for creating sales person
const createSalesPersonValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Validation rules for creating customer care
const createCustomerCareValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Validation rules for creating studio assistant
const createStudioAssistantValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Validation rules for creating sales user
const createSalesValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Routes
router.post(
  '/sales-person',
  authMiddleware,
  createSalesPersonValidation,
  createSalesPerson
);
router.get('/sales-person', authMiddleware, getSalesPersons);
router.delete('/sales-person/:id', authMiddleware, deleteSalesPerson);

router.post(
  '/customer-care',
  authMiddleware,
  createCustomerCareValidation,
  createCustomerCare
);
router.get('/customer-care', authMiddleware, getCustomerCares);

router.post(
  '/studio-assistant',
  authMiddleware,
  createStudioAssistantValidation,
  createStudioAssistant
);
router.get('/studio-assistant', authMiddleware, getStudioAssistants);

router.post(
  '/sales',
  authMiddleware,
  createSalesValidation,
  createSales
);
router.get('/sales', authMiddleware, getSales);
router.delete('/sales/:id', authMiddleware, deleteSales);

module.exports = router;

