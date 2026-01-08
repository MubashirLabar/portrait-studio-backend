const { validationResult } = require("express-validator");
const prisma = require("../config/database");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Create collection dates for a location (admin only)
 */
const createCollectionDates = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    // Ensure only admin can create collection dates
    if (req.user.role !== "ADMIN") {
      return errorResponse(res, "Only admin can create collection dates", 403);
    }

    const { locationId, dates } = req.body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return errorResponse(res, "At least one date must be provided", 400);
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const invalidDates = dates.filter((date) => !dateRegex.test(date));
    if (invalidDates.length > 0) {
      return errorResponse(
        res,
        "Invalid date format. Dates must be in YYYY-MM-DD format",
        400
      );
    }

    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!existingLocation) {
      return errorResponse(res, "Location not found", 404);
    }

    // Create collection dates (ignore duplicates due to unique constraint)
    const createdDates = [];
    const errors_ = [];

    for (const date of dates) {
      try {
        const collectionDate = await prisma.collectionDate.create({
          data: {
            locationId: locationId,
            date: date,
          },
        });
        createdDates.push(collectionDate);
      } catch (error) {
        // Ignore duplicate errors (unique constraint violation)
        if (error.code !== "P2002") {
          errors_.push(`Failed to create date ${date}: ${error.message}`);
        }
      }
    }

    // Get all collection dates for this location
    const allCollectionDates = await prisma.collectionDate.findMany({
      where: { locationId },
      orderBy: { date: "asc" },
    });

    return successResponse(
      res,
      {
        collectionDates: allCollectionDates,
        created: createdDates.length,
      },
      `Successfully created ${createdDates.length} collection date(s)`,
      201
    );
  } catch (error) {
    console.error("Create collection dates error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

/**
 * Get all collection dates (admin and studio users)
 */
const getCollectionDates = async (req, res) => {
  try {
    // Allow admin and studio users to view collection dates
    if (req.user.role !== "ADMIN" && req.user.role !== "STUDIO") {
      return errorResponse(res, "You do not have permission to view collection dates", 403);
    }

    const { locationId } = req.query;

    // Build where clause
    const where = {};
    if (locationId) {
      where.locationId = locationId;
    }

    // Get all collection dates
    const collectionDates = await prisma.collectionDate.findMany({
      where,
      orderBy: [
        { locationId: "asc" },
        { date: "asc" },
      ],
    });

    // Group by location
    const locationsMap = new Map();
    
    for (const collectionDate of collectionDates) {
      if (!locationsMap.has(collectionDate.locationId)) {
        locationsMap.set(collectionDate.locationId, []);
      }
      locationsMap.get(collectionDate.locationId).push(collectionDate.date);
    }

    // Get location details
    const locationIds = Array.from(locationsMap.keys());
    const locations = await prisma.location.findMany({
      where: {
        id: { in: locationIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Create response with location details
    const result = locations.map((location) => ({
      locationId: location.id,
      locationName: location.name,
      dates: locationsMap.get(location.id) || [],
    }));

    return successResponse(
      res,
      { collectionDates: result },
      "Collection dates retrieved successfully",
      200
    );
  } catch (error) {
    console.error("Get collection dates error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

/**
 * Update collection dates for a location (admin only)
 * This replaces all dates for the location
 */
const updateCollectionDates = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    // Ensure only admin can update collection dates
    if (req.user.role !== "ADMIN") {
      return errorResponse(res, "Only admin can update collection dates", 403);
    }

    const { locationId } = req.params;
    const { dates } = req.body;

    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!existingLocation) {
      return errorResponse(res, "Location not found", 404);
    }

    // Validate date format (YYYY-MM-DD)
    if (dates && Array.isArray(dates) && dates.length > 0) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const invalidDates = dates.filter((date) => !dateRegex.test(date));
      if (invalidDates.length > 0) {
        return errorResponse(
          res,
          "Invalid date format. Dates must be in YYYY-MM-DD format",
          400
        );
      }
    }

    // Delete all existing collection dates for this location
    await prisma.collectionDate.deleteMany({
      where: { locationId },
    });

    // Create new collection dates if provided
    if (dates && Array.isArray(dates) && dates.length > 0) {
      await prisma.collectionDate.createMany({
        data: dates.map((date) => ({
          locationId,
          date,
        })),
        skipDuplicates: true,
      });
    }

    // Get updated collection dates
    const updatedCollectionDates = await prisma.collectionDate.findMany({
      where: { locationId },
      orderBy: { date: "asc" },
    });

    return successResponse(
      res,
      {
        collectionDates: updatedCollectionDates.map((cd) => cd.date),
      },
      "Collection dates updated successfully",
      200
    );
  } catch (error) {
    console.error("Update collection dates error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

/**
 * Delete collection dates for a location (admin only)
 */
const deleteCollectionDates = async (req, res) => {
  try {
    // Ensure only admin can delete collection dates
    if (req.user.role !== "ADMIN") {
      return errorResponse(res, "Only admin can delete collection dates", 403);
    }

    const { locationId } = req.params;

    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!existingLocation) {
      return errorResponse(res, "Location not found", 404);
    }

    // Delete all collection dates for this location
    await prisma.collectionDate.deleteMany({
      where: { locationId },
    });

    return successResponse(
      res,
      {},
      "Collection dates deleted successfully",
      200
    );
  } catch (error) {
    console.error("Delete collection dates error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  createCollectionDates,
  getCollectionDates,
  updateCollectionDates,
  deleteCollectionDates,
};

