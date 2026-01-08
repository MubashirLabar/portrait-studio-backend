const { validationResult } = require("express-validator");
const prisma = require("../config/database");
const { successResponse, errorResponse } = require("../utils/response");
const { generateLocationCode } = require("../utils/locationCode");

/**
 * Create a new location (admin only)
 */
const createLocation = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    // Ensure only admin can create locations
    if (req.user.role !== "ADMIN") {
      return errorResponse(res, "Only admin can create locations", 403);
    }

    const { name, salesPersonIds, dates } = req.body;

    // Validate salesPersonIds is an array
    if (!Array.isArray(salesPersonIds) || salesPersonIds.length === 0) {
      return errorResponse(
        res,
        "At least one sales person must be assigned",
        400
      );
    }

    // Validate dates is an array
    if (!Array.isArray(dates) || dates.length === 0) {
      return errorResponse(res, "At least one date must be selected", 400);
    }

    // Verify all sales person IDs exist
    const salesPersons = await prisma.user.findMany({
      where: {
        id: { in: salesPersonIds },
        role: "SALES_PERSON",
      },
    });

    if (salesPersons.length !== salesPersonIds.length) {
      return errorResponse(
        res,
        "One or more sales person IDs are invalid",
        400
      );
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

    // Generate location code
    const code = generateLocationCode(name.trim());

    // Create location
    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        code: code,
        salesPersonIds: salesPersonIds,
        dates: dates,
      },
    });

    // Fetch sales person details for response
    const locationWithDetails = await prisma.location.findUnique({
      where: { id: location.id },
    });

    return successResponse(
      res,
      { location: locationWithDetails },
      "Location created successfully",
      201
    );
  } catch (error) {
    console.error("Create location error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

/**
 * Get all locations (all authenticated users can view)
 * - Admin: sees all locations
 * - Sales Person: sees only locations where they are assigned
 */
const getLocations = async (req, res) => {
  try {
    const user = req.user;
    let locations;

    // If user is sales person, only show locations assigned to them
    if (user.role === "SALES_PERSON") {
      locations = await prisma.location.findMany({
        where: {
          salesPersonIds: {
            has: user.id, // Check if user.id is in the salesPersonIds array
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Admin sees all locations
      locations = await prisma.location.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    // Enrich locations with sales person details (preserve order)
    const locationsWithDetails = await Promise.all(
      locations.map(async (location) => {
        // Fetch all sales persons
        const allSalesPersons = await prisma.user.findMany({
          where: {
            id: { in: location.salesPersonIds },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        // Create a map for quick lookup
        const salesPersonMap = new Map(
          allSalesPersons.map((sp) => [sp.id, sp])
        );

        // Preserve the order from salesPersonIds array
        const salesPersons = location.salesPersonIds
          .map((id) => salesPersonMap.get(id))
          .filter(Boolean) // Remove any undefined entries
          .map((sp) => ({
            id: sp.id,
            name: sp.name || sp.email,
            email: sp.email,
          }));

        return {
          ...location,
          salesPersons,
        };
      })
    );

    return successResponse(
      res,
      { locations: locationsWithDetails },
      "Locations retrieved successfully",
      200
    );
  } catch (error) {
    console.error("Get locations error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

/**
 * Get a single location by ID (all authenticated users can view)
 */
const getLocationById = async (req, res) => {
  try {
    // All authenticated users can view location details
    const { id } = req.params;

    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      return errorResponse(res, "Location not found", 404);
    }

    // Enrich location with sales person details (preserve order)
    const allSalesPersons = await prisma.user.findMany({
      where: {
        id: { in: location.salesPersonIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Create a map for quick lookup
    const salesPersonMap = new Map(allSalesPersons.map((sp) => [sp.id, sp]));

    // Preserve the order from salesPersonIds array
    const salesPersons = location.salesPersonIds
      .map((id) => salesPersonMap.get(id))
      .filter(Boolean) // Remove any undefined entries
      .map((sp) => ({
        id: sp.id,
        name: sp.name || sp.email,
        email: sp.email,
      }));

    const locationWithDetails = {
      ...location,
      salesPersons,
    };

    return successResponse(
      res,
      { location: locationWithDetails },
      "Location retrieved successfully",
      200
    );
  } catch (error) {
    console.error("Get location by ID error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

/**
 * Update a location (admin only)
 */
const updateLocation = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    // Ensure only admin can update locations
    if (req.user.role !== "ADMIN") {
      return errorResponse(res, "Only admin can update locations", 403);
    }

    const { id } = req.params;
    const { name, salesPersonIds, dates } = req.body;

    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      return errorResponse(res, "Location not found", 404);
    }

    // Prepare update data
    const updateData = {};

    if (name !== undefined) {
      updateData.name = name.trim();
      // Regenerate code if name changes
      updateData.code = generateLocationCode(name.trim());
    }

    if (salesPersonIds !== undefined) {
      if (!Array.isArray(salesPersonIds) || salesPersonIds.length === 0) {
        return errorResponse(
          res,
          "At least one sales person must be assigned",
          400
        );
      }

      // Verify all sales person IDs exist
      const salesPersons = await prisma.user.findMany({
        where: {
          id: { in: salesPersonIds },
          role: "SALES_PERSON",
        },
      });

      if (salesPersons.length !== salesPersonIds.length) {
        return errorResponse(
          res,
          "One or more sales person IDs are invalid",
          400
        );
      }

      updateData.salesPersonIds = salesPersonIds;
    }

    if (dates !== undefined) {
      if (!Array.isArray(dates) || dates.length === 0) {
        return errorResponse(res, "At least one date must be selected", 400);
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

      updateData.dates = dates;
    }

    // Update location
    const updatedLocation = await prisma.location.update({
      where: { id },
      data: updateData,
    });

    // Enrich location with sales person details (preserve order)
    const allSalesPersons = await prisma.user.findMany({
      where: {
        id: { in: updatedLocation.salesPersonIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Create a map for quick lookup
    const salesPersonMap = new Map(allSalesPersons.map((sp) => [sp.id, sp]));

    // Preserve the order from salesPersonIds array
    const salesPersons = updatedLocation.salesPersonIds
      .map((id) => salesPersonMap.get(id))
      .filter(Boolean) // Remove any undefined entries
      .map((sp) => ({
        id: sp.id,
        name: sp.name || sp.email,
        email: sp.email,
      }));

    const locationWithDetails = {
      ...updatedLocation,
      salesPersons,
    };

    return successResponse(
      res,
      { location: locationWithDetails },
      "Location updated successfully",
      200
    );
  } catch (error) {
    console.error("Update location error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

/**
 * Delete a location (admin only)
 */
const deleteLocation = async (req, res) => {
  try {
    // Ensure only admin can delete locations
    if (req.user.role !== "ADMIN") {
      return errorResponse(res, "Only admin can delete locations", 403);
    }

    const { id } = req.params;

    // Check if location exists
    const existingLocation = await prisma.location.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      return errorResponse(res, "Location not found", 404);
    }

    // Delete location
    await prisma.location.delete({
      where: { id },
    });

    return successResponse(res, {}, "Location deleted successfully", 200);
  } catch (error) {
    console.error("Delete location error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
};
