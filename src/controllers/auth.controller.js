const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    const { username, password } = req.body;

    // Find user by name
    const user = await prisma.user.findUnique({
      where: { name: username.trim() },
    });

    if (!user) {
      return errorResponse(res, 'Invalid username or password', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid username or password', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }
    );

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;

    return successResponse(
      res,
      {
        user: userWithoutPassword,
        token,
      },
      'Login successful',
      200
    );
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Get current user profile
 */
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, { user }, 'User profile retrieved successfully', 200);
  } catch (error) {
    console.error('Get me error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

module.exports = {
  login,
  getMe,
};

