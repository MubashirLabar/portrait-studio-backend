const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Create a new sales person (admin only)
 */
const createSalesPerson = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    // Ensure only admin can create sales persons
    if (req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can create sales persons', 403);
    }

    const { name, password } = req.body;

    // Check if user with name already exists
    const existingUser = await prisma.user.findUnique({
      where: { name: name.trim() },
    });

    if (existingUser) {
      return errorResponse(res, 'User with this name already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create sales person user
    const salesPerson = await prisma.user.create({
      data: {
        name: name.trim(),
        email: null,
        password: hashedPassword,
        role: 'SALES_PERSON',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(
      res,
      { user: salesPerson },
      'Sales person created successfully',
      201
    );
  } catch (error) {
    console.error('Create sales person error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Get all sales persons (admin only)
 */
const getSalesPersons = async (req, res) => {
  try {
    // Ensure only admin can view sales persons
    if (req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can view sales persons', 403);
    }

    const salesPersons = await prisma.user.findMany({
      where: {
        role: 'SALES_PERSON',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return successResponse(
      res,
      { salesPersons },
      'Sales persons retrieved successfully',
      200
    );
  } catch (error) {
    console.error('Get sales persons error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Create a new customer care user (admin only)
 */
const createCustomerCare = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    // Ensure only admin can create customer care users
    if (req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can create customer care users', 403);
    }

    const { name, password } = req.body;

    // Check if user with name already exists
    const existingUser = await prisma.user.findUnique({
      where: { name: name.trim() },
    });

    if (existingUser) {
      return errorResponse(res, 'User with this name already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create customer care user
    const customerCare = await prisma.user.create({
      data: {
        name: name.trim(),
        email: null,
        password: hashedPassword,
        role: 'CUSTOMER_SERVICE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(
      res,
      { user: customerCare },
      'Customer care user created successfully',
      201
    );
  } catch (error) {
    console.error('Create customer care error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Get all customer care users (admin only)
 */
const getCustomerCares = async (req, res) => {
  try {
    // Ensure only admin can view customer care users
    if (req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can view customer care users', 403);
    }

    const customerCares = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER_SERVICE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return successResponse(
      res,
      { customerCares },
      'Customer care users retrieved successfully',
      200
    );
  } catch (error) {
    console.error('Get customer care users error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Create a new studio assistant (admin only)
 */
const createStudioAssistant = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    // Ensure only admin can create studio assistants
    if (req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can create studio assistants', 403);
    }

    const { name, password } = req.body;

    // Check if user with name already exists
    const existingUser = await prisma.user.findUnique({
      where: { name: name.trim() },
    });

    if (existingUser) {
      return errorResponse(res, 'User with this name already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create studio assistant user
    const studioAssistant = await prisma.user.create({
      data: {
        name: name.trim(),
        email: null,
        password: hashedPassword,
        role: 'STUDIO',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(
      res,
      { user: studioAssistant },
      'Studio assistant created successfully',
      201
    );
  } catch (error) {
    console.error('Create studio assistant error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Get all studio assistants (admin only)
 */
const getStudioAssistants = async (req, res) => {
  try {
    // Ensure only admin can view studio assistants
    if (req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can view studio assistants', 403);
    }

    const studioAssistants = await prisma.user.findMany({
      where: {
        role: 'STUDIO',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return successResponse(
      res,
      { studioAssistants },
      'Studio assistants retrieved successfully',
      200
    );
  } catch (error) {
    console.error('Get studio assistants error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

module.exports = {
  createSalesPerson,
  getSalesPersons,
  createCustomerCare,
  getCustomerCares,
  createStudioAssistant,
  getStudioAssistants,
};

