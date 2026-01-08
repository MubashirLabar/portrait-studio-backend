const express = require('express');
const { body } = require('express-validator');
const { login, getMe } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

console.log('✅ Auth routes file loaded');

// Validation rules
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Routes
router.post('/login', loginValidation, login);
router.get('/me', authMiddleware, getMe);

module.exports = router;

