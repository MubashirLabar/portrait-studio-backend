const prisma = require('../config/database');

// Example controller functions
const exampleFunction = async (req, res, next) => {
  try {
    // Example: Get all users
    // const users = await prisma.user.findMany();
    
    res.json({
      success: true,
      message: 'Example controller working!',
      data: []
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exampleFunction
};

