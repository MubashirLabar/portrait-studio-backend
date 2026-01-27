const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const locationRoutes = require('./location.routes');
const bookingRoutes = require('./booking.routes');
const sessionTimeRoutes = require('./sessionTime.routes');
const specialRequestTimeRoutes = require('./specialRequestTime.routes');
const collectionDateRoutes = require('./collectionDate.routes');
const settingsRoutes = require('./settings.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/locations', locationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/session-times', sessionTimeRoutes);
router.use('/special-request-times', specialRequestTimeRoutes);
router.use('/collection-dates', collectionDateRoutes);
router.use('/settings', settingsRoutes);

console.log('✅ Auth routes mounted at /api/auth');
console.log('✅ User routes mounted at /api/users');
console.log('✅ Location routes mounted at /api/locations');
console.log('✅ Booking routes mounted at /api/bookings');
console.log('✅ Session time routes mounted at /api/session-times');
console.log('✅ Special request time routes mounted at /api/special-request-times');
console.log('✅ Collection date routes mounted at /api/collection-dates');
console.log('✅ Settings routes mounted at /api/settings');

// Example route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    version: '1.0.0'
  });
});

module.exports = router;

