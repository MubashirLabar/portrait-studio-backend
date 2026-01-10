const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Create a new booking
 */
const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    const {
      customerName,
      phoneNumber,
      emergencyPhoneNumber,
      photoshootType,
      sessionDate,
      sessionTime,
      specialRequestDate,
      specialRequestTime,
      paymentMethod,
      locationId,
      status,
      notes,
    } = req.body;

    // Validate phone number is exactly 11 digits
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      return errorResponse(res, 'Phone number must be exactly 11 digits', 400);
    }

    // Validate emergency phone number if provided
    if (emergencyPhoneNumber) {
      const emergencyDigits = emergencyPhoneNumber.replace(/\D/g, '');
      if (emergencyDigits.length !== 11) {
        return errorResponse(res, 'Emergency phone number must be exactly 11 digits', 400);
      }
    }

    // Get the sales person ID from the authenticated user
    const salesPersonId = req.user.id;

    // Normalize payment method: convert "not-paid" to "NOT_PAID" (enum uses underscore)
    let normalizedPaymentMethod = paymentMethod.toUpperCase();
    if (normalizedPaymentMethod === 'NOT-PAID') {
      normalizedPaymentMethod = 'NOT_PAID';
    }

    // Determine booking status (default to BOOKED if not provided)
    const bookingStatus = status && ['BOOKED', 'CONFIRMED', 'TBC', 'CANCELLED', 'NO_ANSWER', 'WLMK'].includes(status.toUpperCase())
      ? status.toUpperCase()
      : 'BOOKED';

    // For TBC status, allow null dates/times
    // For other statuses, validate that date and time are provided
    if (bookingStatus !== 'TBC') {
      if (!sessionDate || !sessionTime) {
        return errorResponse(res, 'Session date and time are required for booked status', 400);
      }
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        customerName: customerName.trim(),
        phoneNumber: phoneDigits,
        emergencyPhoneNumber: emergencyPhoneNumber ? emergencyPhoneNumber.replace(/\D/g, '') : null,
        photoshootType,
        sessionDate: sessionDate || null,
        sessionTime: sessionTime || null,
        specialRequestDate: specialRequestDate || null,
        specialRequestTime: specialRequestTime || null,
        paymentMethod: normalizedPaymentMethod,
        status: bookingStatus,
        notes: notes || null,
        locationId: locationId || null,
        salesPersonId,
      },
    });

    return successResponse(
      res,
      { booking },
      'Booking created successfully',
      201
    );
  } catch (error) {
    console.error('Create booking error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Get all bookings (with optional filters)
 */
const getBookings = async (req, res) => {
  try {
    const { locationId, status, salesPersonId } = req.query;
    const user = req.user;

    // Build where clause
    const where = {};

    // Role-based filtering
    if (user.role === 'ADMIN') {
      // Admin can see all bookings, optionally filtered by sales person
      if (salesPersonId) {
        where.salesPersonId = salesPersonId;
      }
    } else if (user.role === 'SALES_PERSON') {
      // Sales persons can only see their own bookings
      where.salesPersonId = user.id;
    }
    // CUSTOMER_SERVICE and other roles can see all bookings (filtered by location if provided)

    // Filter by location if provided
    if (locationId) {
      where.locationId = locationId;
    }

    // Filter by status if provided
    if (status) {
      where.status = status.toUpperCase();
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Manually enrich bookings with location and sales person details
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        let location = null;
        let salesPerson = null;

        if (booking.locationId) {
          try {
            // Query location - code field will be included if migration has been run
            const locationData = await prisma.location.findUnique({
              where: { id: booking.locationId },
            });
            if (locationData) {
              location = {
                id: locationData.id,
                name: locationData.name,
                code: locationData.code !== undefined ? locationData.code : null,
              };
            }
          } catch (locError) {
            console.error('Error fetching location:', locError);
            location = null;
          }
        }

        if (booking.salesPersonId) {
          salesPerson = await prisma.user.findUnique({
            where: { id: booking.salesPersonId },
            select: {
              id: true,
              name: true,
              email: true,
            },
          });
        }

        return {
          ...booking,
          location,
          salesPerson,
        };
      })
    );

    return successResponse(
      res,
      { bookings: bookingsWithDetails },
      'Bookings retrieved successfully',
      200
    );
  } catch (error) {
    console.error('Get bookings error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return errorResponse(res, `Internal server error: ${error.message}`, 500);
  }
};

/**
 * Get a single booking by ID
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        salesPerson: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Check if user has permission to view this booking
    // ADMIN, CUSTOMER_SERVICE, and STUDIO can view any booking
    // Sales persons can only view their own bookings
    if (user.role !== 'ADMIN' && user.role !== 'CUSTOMER_SERVICE' && user.role !== 'STUDIO' && booking.salesPersonId !== user.id) {
      return errorResponse(res, 'You do not have permission to view this booking', 403);
    }

    return successResponse(
      res,
      { booking },
      'Booking retrieved successfully',
      200
    );
  } catch (error) {
    console.error('Get booking by ID error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Update a booking
 */
const updateBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, errors.array()[0].msg, 400);
    }

    const { id } = req.params;
    const user = req.user;

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Check if user has permission to update this booking
    // ADMIN, CUSTOMER_SERVICE, and STUDIO can update any booking
    // Sales persons can only update their own bookings
    if (user.role !== 'ADMIN' && user.role !== 'CUSTOMER_SERVICE' && user.role !== 'STUDIO' && existingBooking.salesPersonId !== user.id) {
      return errorResponse(res, 'You do not have permission to update this booking', 403);
    }

    const {
      customerName,
      phoneNumber,
      emergencyPhoneNumber,
      photoshootType,
      sessionDate,
      sessionTime,
      specialRequestDate,
      specialRequestTime,
      paymentMethod,
      status,
      locationId,
      notes,
      collectionDate,
      collectionTime,
    } = req.body;

    // Validate phone number if provided
    if (phoneNumber) {
      const phoneDigits = phoneNumber.replace(/\D/g, '');
      if (phoneDigits.length !== 11) {
        return errorResponse(res, 'Phone number must be exactly 11 digits', 400);
      }
    }

    // Validate emergency phone number if provided
    if (emergencyPhoneNumber) {
      const emergencyDigits = emergencyPhoneNumber.replace(/\D/g, '');
      if (emergencyDigits.length !== 11) {
        return errorResponse(res, 'Emergency phone number must be exactly 11 digits', 400);
      }
    }

    // Build update data
    const updateData = {};
    if (customerName) updateData.customerName = customerName.trim();
    if (phoneNumber) updateData.phoneNumber = phoneNumber.replace(/\D/g, '');
    if (emergencyPhoneNumber !== undefined) {
      updateData.emergencyPhoneNumber = emergencyPhoneNumber
        ? emergencyPhoneNumber.replace(/\D/g, '')
        : null;
    }
    if (photoshootType) updateData.photoshootType = photoshootType;
    if (sessionDate) updateData.sessionDate = sessionDate;
    if (sessionTime) updateData.sessionTime = sessionTime;
    if (specialRequestDate !== undefined) updateData.specialRequestDate = specialRequestDate || null;
    if (specialRequestTime !== undefined) updateData.specialRequestTime = specialRequestTime || null;
    if (paymentMethod) {
      // Normalize payment method: convert "not-paid" to "NOT_PAID" (enum uses underscore)
      let normalizedPaymentMethod = paymentMethod.toUpperCase();
      if (normalizedPaymentMethod === 'NOT-PAID') {
        normalizedPaymentMethod = 'NOT_PAID';
      }
      updateData.paymentMethod = normalizedPaymentMethod;
    }
    if (status) updateData.status = status.toUpperCase();
    if (notes !== undefined) updateData.notes = notes || null;
    if (req.body.studioNotes !== undefined) updateData.studioNotes = req.body.studioNotes || null;
    if (locationId !== undefined) updateData.locationId = locationId || null;
    if (collectionDate !== undefined) updateData.collectionDate = collectionDate || null;
    if (collectionTime !== undefined) updateData.collectionTime = collectionTime || null;

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
    });

    // Manually enrich updated booking with location and sales person details
    let location = null;
    let salesPerson = null;

    if (updatedBooking.locationId) {
      location = await prisma.location.findUnique({
        where: { id: updatedBooking.locationId },
        select: {
          id: true,
          name: true,
        },
      });
    }

    if (updatedBooking.salesPersonId) {
      salesPerson = await prisma.user.findUnique({
        where: { id: updatedBooking.salesPersonId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    }

    const updatedBookingWithDetails = {
      ...updatedBooking,
      location,
      salesPerson,
    };

    return successResponse(
      res,
      { booking: updatedBookingWithDetails },
      'Booking updated successfully',
      200
    );
  } catch (error) {
    console.error('Update booking error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Delete a booking
 */
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Check if user has permission to delete this booking
    if (user.role !== 'ADMIN' && existingBooking.salesPersonId !== user.id) {
      return errorResponse(res, 'You do not have permission to delete this booking', 403);
    }

    await prisma.booking.delete({
      where: { id },
    });

    return successResponse(res, null, 'Booking deleted successfully', 200);
  } catch (error) {
    console.error('Delete booking error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Allocate studio number to a booking (sequential and unique per location)
 */
const allocateStudioNumber = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Check if booking has a location
    if (!existingBooking.locationId) {
      return errorResponse(res, 'Booking must have a location assigned before allocating studio number', 400);
    }

    // Check if booking already has a studio number
    if (existingBooking.studioNumber !== null) {
      return errorResponse(res, 'Studio number already allocated to this booking', 400);
    }

    // Get location details
    const location = await prisma.location.findUnique({
      where: { id: existingBooking.locationId },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!location) {
      return errorResponse(res, 'Location not found for this booking', 404);
    }

    // Get all bookings with studio numbers for this location, ordered by studio number
    const bookingsWithStudioNumbers = await prisma.booking.findMany({
      where: {
        locationId: existingBooking.locationId,
        studioNumber: { not: null },
      },
      select: {
        studioNumber: true,
      },
      orderBy: {
        studioNumber: 'asc',
      },
    });

    // Find the next available studio number for this location (starting from 1)
    let nextStudioNumber = 1;
    
    // If there are existing studio numbers for this location, find the first gap or the next sequential number
    if (bookingsWithStudioNumbers.length > 0) {
      // Check for gaps in the sequence
      for (let i = 0; i < bookingsWithStudioNumbers.length; i++) {
        const expectedNumber = i + 1;
        if (bookingsWithStudioNumbers[i].studioNumber !== expectedNumber) {
          nextStudioNumber = expectedNumber;
          break;
        }
        nextStudioNumber = expectedNumber + 1;
      }
    }

    // Check if this studio number already exists for this location (extra safety check)
    const existingStudioNumber = await prisma.booking.findFirst({
      where: {
        locationId: existingBooking.locationId,
        studioNumber: nextStudioNumber,
        id: { not: id }, // Exclude the current booking
      },
    });

    if (existingStudioNumber) {
      // If there's a conflict, find the next available number
      const allStudioNumbers = bookingsWithStudioNumbers.map(b => b.studioNumber).sort((a, b) => a - b);
      nextStudioNumber = allStudioNumbers[allStudioNumbers.length - 1] + 1;
    }

    // Update the booking with the allocated studio number
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        studioNumber: nextStudioNumber,
      },
      select: {
        id: true,
        customerName: true,
        phoneNumber: true,
        sessionDate: true,
        sessionTime: true,
        status: true,
        studioNumber: true,
        locationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Format the studio number with location code
    const studioNumberDisplay = location.code 
      ? `${location.code}-${nextStudioNumber}` 
      : `${nextStudioNumber}`;

    return successResponse(
      res,
      { 
        booking: {
          ...updatedBooking,
          location: location,
        }
      },
      `Studio number ${studioNumberDisplay} allocated successfully`,
      200
    );
  } catch (error) {
    console.error('Allocate studio number error:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return errorResponse(res, 'Studio number conflict occurred. Please try again.', 409);
    }
    
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Save consent form signature for a booking
 */
const saveConsentFormSignature = async (req, res) => {
  try {
    const { id } = req.params;
    const { signature } = req.body; // Base64 data URL

    // Validate signature data
    if (!signature || typeof signature !== 'string') {
      return errorResponse(res, 'Signature data is required', 400);
    }

    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Delete old signature file if it exists
    if (existingBooking.signaturePath) {
      const { deleteFile } = require('../utils/fileStorage');
      deleteFile(existingBooking.signaturePath);
    }

    // Save signature image
    const { saveBase64Image } = require('../utils/fileStorage');
    const signaturePath = saveBase64Image(signature, `booking_${id}`);

    // Update booking with signature path and mark consent form as signed
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        signaturePath,
        consentFormSigned: true,
      },
      select: {
        id: true,
        customerName: true,
        phoneNumber: true,
        sessionDate: true,
        sessionTime: true,
        status: true,
        studioNumber: true,
        signaturePath: true,
        consentFormSigned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(
      res,
      { booking: updatedBooking },
      'Consent form signature saved successfully',
      200
    );
  } catch (error) {
    console.error('Save consent form signature error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Get booking statistics grouped by sales person
 * Returns sales persons with their booking counts (today or total)
 */
const getBookingsBySalesPerson = async (req, res) => {
  try {
    const { type = 'total', locationId } = req.query;
    const user = req.user;

    // Build where clause
    const where = {
      // Exclude NOT_PAID bookings
      paymentMethod: {
        not: 'NOT_PAID',
      },
    };

    // Filter by location if provided
    if (locationId) {
      where.locationId = locationId;
    }

    // Filter by date if type is 'today'
    if (type === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      where.createdAt = {
        gte: today.toISOString(),
        lt: tomorrow.toISOString(),
      };
    }

    // Role-based filtering
    if (user.role === 'SALES_PERSON') {
      // Sales persons can only see their own bookings
      where.salesPersonId = user.id;
    }
    // ADMIN and other roles can see all bookings

    // Get all bookings matching the criteria
    const bookings = await prisma.booking.findMany({
      where,
      select: {
        salesPersonId: true,
      },
    });

    // Group bookings by sales person and count
    const salesPersonCounts = {};
    
    for (const booking of bookings) {
      if (booking.salesPersonId) {
        if (!salesPersonCounts[booking.salesPersonId]) {
          salesPersonCounts[booking.salesPersonId] = 0;
        }
        salesPersonCounts[booking.salesPersonId]++;
      }
    }

    // Fetch sales person details for each unique sales person ID
    const salesPersonIds = Object.keys(salesPersonCounts);
    const salesPersons = await prisma.user.findMany({
      where: {
        id: { in: salesPersonIds },
        role: 'SALES_PERSON',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Create a map for quick lookup
    const salesPersonMap = new Map(
      salesPersons.map((sp) => [sp.id, sp])
    );

    // Build the response array with sales person details and counts
    const result = salesPersonIds
      .map((salesPersonId) => {
        const salesPerson = salesPersonMap.get(salesPersonId);
        if (!salesPerson) return null;

        return {
          id: salesPerson.id,
          salesPersonName: salesPerson.name || salesPerson.email || 'Unknown',
          salesPersonEmail: salesPerson.email,
          bookingCount: salesPersonCounts[salesPersonId],
        };
      })
      .filter((item) => item !== null)
      .sort((a, b) => b.bookingCount - a.bookingCount); // Sort by booking count descending

    return successResponse(
      res,
      { salesPersons: result },
      `${type === 'today' ? 'Today' : 'Total'} bookings retrieved successfully`,
      200
    );
  } catch (error) {
    console.error('Get bookings by sales person error:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  allocateStudioNumber,
  saveConsentFormSignature,
  getBookingsBySalesPerson,
};

