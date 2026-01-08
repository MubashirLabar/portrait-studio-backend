const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Create a new session time (admin only)
 */
const createSessionTime = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    // Ensure only admin can create session times
    if (req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can create session times', 403);
    }

    const { time } = req.body;

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return errorResponse(res, 'Time must be in HH:MM format (24-hour)', 400);
    }

    // Check if session time already exists
    const existingSessionTime = await prisma.sessionTime.findUnique({
      where: { time },
    });

    if (existingSessionTime) {
      return errorResponse(res, 'Session time already exists', 400);
    }

    // Create session time
    const sessionTime = await prisma.sessionTime.create({
      data: {
        time: time.trim(),
      },
    });

    return successResponse(
      res,
      { sessionTime },
      'Session time created successfully',
      201
    );
  } catch (error) {
    console.error('Create session time error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Get all session times (all authenticated users can view)
 */
const getSessionTimes = async (req, res) => {
  try {
    const sessionTimes = await prisma.sessionTime.findMany({
      orderBy: {
        time: 'asc',
      },
    });

    return successResponse(
      res,
      { sessionTimes },
      'Session times retrieved successfully',
      200
    );
  } catch (error) {
    console.error('Get session times error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Update a session time (admin only)
 */
const updateSessionTime = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can update session times', 403);
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

    // Check if session time exists
    const existingSessionTime = await prisma.sessionTime.findUnique({
      where: { id },
    });

    if (!existingSessionTime) {
      return errorResponse(res, 'Session time not found', 404);
    }

    // Check if another session time with the same time already exists
    const duplicateSessionTime = await prisma.sessionTime.findUnique({
      where: { time },
    });

    if (duplicateSessionTime && duplicateSessionTime.id !== id) {
      return errorResponse(res, 'Session time already exists', 400);
    }

    // Update session time
    const updatedSessionTime = await prisma.sessionTime.update({
      where: { id },
      data: {
        time: time.trim(),
      },
    });

    return successResponse(
      res,
      { sessionTime: updatedSessionTime },
      'Session time updated successfully',
      200
    );
  } catch (error) {
    console.error('Update session time error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Delete a session time (admin only)
 */
const deleteSessionTime = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return errorResponse(res, 'Only admin can delete session times', 403);
    }

    const { id } = req.params;

    // Check if session time exists
    const existingSessionTime = await prisma.sessionTime.findUnique({
      where: { id },
    });

    if (!existingSessionTime) {
      return errorResponse(res, 'Session time not found', 404);
    }

    await prisma.sessionTime.delete({
      where: { id },
    });

    return successResponse(res, null, 'Session time deleted successfully', 200);
  } catch (error) {
    console.error('Delete session time error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

module.exports = {
  createSessionTime,
  getSessionTimes,
  updateSessionTime,
  deleteSessionTime,
};

