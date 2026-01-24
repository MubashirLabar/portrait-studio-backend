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

    // Debug logging to check what values are being received
    console.log('Booking creation request:', {
      sessionDate,
      sessionTime,
      specialRequestDate,
      specialRequestTime,
      status
    });

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
    // Either sessionDate/sessionTime OR specialRequestDate/specialRequestTime must be provided
    if (bookingStatus !== 'TBC') {
      // Check for regular session (both date and time must be truthy and non-empty strings)
      const hasRegularSession = sessionDate && 
                                sessionTime && 
                                typeof sessionDate === 'string' &&
                                typeof sessionTime === 'string' &&
                                sessionDate.trim() !== '' && 
                                sessionTime.trim() !== '';
      
      // Check for special request (both date and time must be truthy and non-empty strings)
      const hasSpecialRequest = specialRequestDate && 
                                specialRequestTime && 
                                typeof specialRequestDate === 'string' &&
                                typeof specialRequestTime === 'string' &&
                                specialRequestDate.trim() !== '' && 
                                specialRequestTime.trim() !== '';
      
      if (!hasRegularSession && !hasSpecialRequest) {
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
    const { locationId, status, salesPersonId, includeAllSalesPersons, page, limit, hasCollectionDate } = req.query;
    const user = req.user;

    // Validate user is authenticated
    if (!user || !user.role) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    // Pagination parameters
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 20; // Default 20 items per page
    const skip = (pageNumber - 1) * pageSize;

    // Build where clause
    const where = {};

    // Role-based filtering
    // If includeAllSalesPersons is true and locationId is provided, bypass sales person filter
    // This allows fetching all bookings for a location (e.g., for counting purposes)
    const shouldIncludeAllSalesPersons = includeAllSalesPersons === 'true' && locationId;
    
    if (user.role === 'ADMIN') {
      // Admin can see all bookings, optionally filtered by sales person
      if (salesPersonId) {
        where.salesPersonId = salesPersonId;
      }
    } else if (user.role === 'SALES_PERSON') {
      // Sales persons can only see their own bookings
      // Unless includeAllSalesPersons is true (for counting all bookings at a location)
      if (!shouldIncludeAllSalesPersons) {
        where.salesPersonId = user.id;
      }
    }
    // CUSTOMER_SERVICE, SALES and other roles can see all bookings (filtered by location if provided)

    // Filter by location if provided
    if (locationId) {
      where.locationId = locationId;
    }

    // Filter by status if provided
    if (status) {
      where.status = status.toUpperCase();
    }

    // Filter by collection date if requested
    if (hasCollectionDate === 'true') {
      where.collectionDate = {
        not: null
      };
      where.collectionTime = {
        not: null
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.booking.count({ where });

    // Get summary statistics from ALL bookings (not just current page)
    const allBookings = await prisma.booking.findMany({
      where,
      select: {
        status: true,
      },
    });

    // Calculate status counts
    const summary = allBookings.reduce(
      (acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      },
      {}
    );

    // Fetch ALL bookings first (without pagination) to sort properly
    const allBookingsForSorting = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        sessionDate: true,
        sessionTime: true,
        specialRequestDate: true,
        specialRequestTime: true,
        collectionDate: true,
        collectionTime: true,
      },
    });

    // Sort by the actual displayed date/time (with fallback logic matching frontend)
    const sortedBookingIds = allBookingsForSorting
      .sort((a, b) => {
        // If hasCollectionDate is true (Sales tab), sort by collection date/time
        // Otherwise, use specialRequest date/time if available, then session date/time
        let dateA, dateB, timeA, timeB;
        
        if (hasCollectionDate === 'true') {
          // Sales tab: sort by collection date and time
          dateA = a.collectionDate;
          dateB = b.collectionDate;
          timeA = a.collectionTime;
          timeB = b.collectionTime;
          
          // Debug: Log comparison values
          if (dateA && dateB) {
            console.log(`Comparing: ${dateA} ${timeA} vs ${dateB} ${timeB}`);
          }
        } else {
          // Other tabs: use specialRequest date/time if available, otherwise use session date/time
          dateA = a.specialRequestDate || a.sessionDate;
          dateB = b.specialRequestDate || b.sessionDate;
          timeA = a.specialRequestTime || a.sessionTime;
          timeB = b.specialRequestTime || b.sessionTime;
        }

        // Handle null dates
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1; // Move nulls to end
        if (!dateB) return -1;

        // Compare dates first
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB); // ISO date strings compare correctly
        }

        // If dates are equal, compare times
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;

        return timeA.localeCompare(timeB); // HH:MM format compares correctly
      })
      .map(b => b.id);

    // Get the IDs for the current page
    const paginatedIds = sortedBookingIds.slice(skip, skip + pageSize);

    // Debug: Log the sorted IDs order
    console.log('Sorted booking IDs for page:', paginatedIds);

    // Fetch full booking details for the current page, preserving sort order
    const bookings = await prisma.booking.findMany({
      where: {
        id: { in: paginatedIds },
      },
    });

    // Debug: Log fetched bookings order
    console.log('Fetched bookings order (before re-sort):', bookings.map(b => ({ id: b.id, collectionDate: b.collectionDate, collectionTime: b.collectionTime })));

    // Re-sort bookings to match the order of paginatedIds
    const bookingsMap = new Map(bookings.map(b => [b.id, b]));
    const sortedBookings = paginatedIds.map(id => bookingsMap.get(id)).filter(Boolean);

    // Debug: Log final sorted bookings
    console.log('Final sorted bookings:', sortedBookings.map(b => ({ id: b.id, collectionDate: b.collectionDate, collectionTime: b.collectionTime })));

    // Manually enrich bookings with location and sales person details
    const bookingsWithDetails = await Promise.all(
      sortedBookings.map(async (booking) => {
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
      { 
        bookings: bookingsWithDetails,
        pagination: {
          total: totalCount,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        },
        summary: {
          total: totalCount,
          confirmed: summary['CONFIRMED'] || 0,
          booked: summary['BOOKED'] || 0,
          tbc: summary['TBC'] || 0,
          cancelled: summary['CANCELLED'] || 0,
          noAnswer: summary['NO_ANSWER'] || 0,
          wlmk: summary['WLMK'] || 0,
          videoCall: summary['VIDEO_CALL'] || 0,
        }
      },
      'Bookings retrieved successfully',
      200
    );
  } catch (error) {
    console.error('Get bookings error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    return errorResponse(res, `Internal server error: ${errorMessage}`, 500);
  }
};

/**
 * Get a single booking by ID
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Validate user is authenticated
    if (!user || !user.role) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Check if user has permission to view this booking
    // ADMIN, CUSTOMER_SERVICE, STUDIO, and SALES can view any booking
    // Sales persons can only view their own bookings
    if (user.role !== 'ADMIN' && user.role !== 'CUSTOMER_SERVICE' && user.role !== 'STUDIO' && user.role !== 'SALES' && booking.salesPersonId !== user.id) {
      return errorResponse(res, 'You do not have permission to view this booking', 403);
    }

    // Manually enrich booking with location and sales person details
    let location = null;
    let salesPerson = null;

    if (booking.locationId) {
      try {
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
      try {
        salesPerson = await prisma.user.findUnique({
          where: { id: booking.salesPersonId },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });
      } catch (spError) {
        console.error('Error fetching sales person:', spError);
        salesPerson = null;
      }
    }

    const bookingWithDetails = {
      ...booking,
      location,
      salesPerson,
    };

    return successResponse(
      res,
      { booking: bookingWithDetails },
      'Booking retrieved successfully',
      200
    );
  } catch (error) {
    console.error('Get booking by ID error:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    return errorResponse(res, `Internal server error: ${errorMessage}`, 500);
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
    // ADMIN, CUSTOMER_SERVICE, STUDIO, and SALES can update any booking
    // Sales persons can only update their own bookings
    if (user.role !== 'ADMIN' && user.role !== 'CUSTOMER_SERVICE' && user.role !== 'STUDIO' && user.role !== 'SALES' && existingBooking.salesPersonId !== user.id) {
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
      cancellationReason,
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
    if (sessionDate !== undefined) updateData.sessionDate = sessionDate || null;
    if (sessionTime !== undefined) updateData.sessionTime = sessionTime || null;
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
    if (cancellationReason !== undefined) updateData.cancellationReason = cancellationReason || null;
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
    // ADMIN, CUSTOMER_SERVICE, STUDIO, and SALES can delete any booking
    // Sales persons can only delete their own bookings
    if (user.role !== 'ADMIN' && user.role !== 'CUSTOMER_SERVICE' && user.role !== 'STUDIO' && user.role !== 'SALES' && existingBooking.salesPersonId !== user.id) {
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

    // Update the booking with the allocated studio number and set status to CONFIRMED
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        studioNumber: nextStudioNumber,
        status: 'CONFIRMED', // Automatically set status to CONFIRMED when allocating studio number
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
    let signaturePath;
    try {
      signaturePath = saveBase64Image(signature, `booking_${id}`);
    } catch (fileError) {
      console.error('File storage error:', fileError);
      return errorResponse(res, `Failed to save signature: ${fileError.message}`, 500);
    }

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

