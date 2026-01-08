const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Create a new special request time (admin only)
 */
const createSpecialRequestTime = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    // Ensure only admin can create special request times
    if (req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can create special request times', 403);
    }

    const { time } = req.body;

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return errorResponse(res, 'Time must be in HH:MM format (24-hour)', 400);
    }

    // Check if special request time already exists
    const existingSpecialRequestTime = await prisma.specialRequestTime.findUnique({
      where: { time },
    });

    if (existingSpecialRequestTime) {
      return errorResponse(res, 'Special request time already exists', 400);
    }

    // Create special request time
    const specialRequestTime = await prisma.specialRequestTime.create({
      data: {
        time: time.trim(),
      },
    });

    return successResponse(
      res,
      { specialRequestTime },
      'Special request time created successfully',
      201
    );
  } catch (error) {
    console.error('Create special request time error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Get all special request times (all authenticated users can view)
 */
const getSpecialRequestTimes = async (req, res) => {
  try {
    const specialRequestTimes = await prisma.specialRequestTime.findMany({
      orderBy: {
        time: 'asc',
      },
    });

    return successResponse(
      res,
      { specialRequestTimes },
      'Special request times retrieved successfully',
      200
    );
  } catch (error) {
    console.error('Get special request times error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Update a special request time (admin only)
 */
const updateSpecialRequestTime = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can update special request times', 403);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    const { id } = req.params;
    const { time } = req.body;

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return errorResponse(res, 'Time must be in HH:MM format (24-hour)', 400);
    }

    // Check if special request time exists
    const existingSpecialRequestTime = await prisma.specialRequestTime.findUnique({
      where: { id },
    });

    if (!existingSpecialRequestTime) {
      return errorResponse(res, 'Special request time not found', 404);
    }

    // Check if another special request time with the same time already exists
    const duplicateSpecialRequestTime = await prisma.specialRequestTime.findUnique({
      where: { time },
    });

    if (duplicateSpecialRequestTime && duplicateSpecialRequestTime.id !== id) {
      return errorResponse(res, 'Special request time already exists', 400);
    }

    // Update special request time
    const updatedSpecialRequestTime = await prisma.specialRequestTime.update({
      where: { id },
      data: {
        time: time.trim(),
      },
    });

    return successResponse(
      res,
      { specialRequestTime: updatedSpecialRequestTime },
      'Special request time updated successfully',
      200
    );
  } catch (error) {
    console.error('Update special request time error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Delete a special request time (admin only)
 */
const deleteSpecialRequestTime = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can delete special request times', 403);
    }

    const { id } = req.params;

    // Check if special request time exists
    const existingSpecialRequestTime = await prisma.specialRequestTime.findUnique({
      where: { id },
    });

    if (!existingSpecialRequestTime) {
      return errorResponse(res, 'Special request time not found', 404);
    }

    await prisma.specialRequestTime.delete({
      where: { id },
    });

    return successResponse(res, null, 'Special request time deleted successfully', 200);
  } catch (error) {
    console.error('Delete special request time error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

module.exports = {
  createSpecialRequestTime,
  getSpecialRequestTimes,
  updateSpecialRequestTime,
  deleteSpecialRequestTime,
};

