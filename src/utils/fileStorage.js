const fs = require('fs');
const path = require('path');

/**
 * Ensure storage directory exists
 */
const ensureStorageDir = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log('Created storage directory:', dirPath);
    }
  } catch (error) {
    console.error('Error creating directory:', dirPath, error);
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
};

/**
 * Save base64 image to file
 * @param {string} base64Data - Base64 encoded image data (data:image/png;base64,...)
 * @param {string} filename - Filename to save (without extension, will use .png)
 * @returns {string} - Relative path to saved file
 */
const saveBase64Image = (base64Data, filename) => {
  try {
    // Create storage directory if it doesn't exist
    const storageDir = path.join(__dirname, '../../storage/signatures');
    
    try {
      ensureStorageDir(storageDir);
    } catch (dirError) {
      console.error('Failed to create storage directory:', storageDir, dirError);
      throw new Error(`Cannot create storage directory: ${dirError.message}`);
    }

    // Remove data URL prefix if present
    const base64String = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;

    // Create filename with timestamp and UUID-like suffix to ensure uniqueness
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExtension = 'png';
    const finalFilename = `${filename}_${timestamp}_${randomSuffix}.${fileExtension}`;
    const filePath = path.join(storageDir, finalFilename);

    // Convert base64 to buffer and save
    try {
      const buffer = Buffer.from(base64String, 'base64');
      fs.writeFileSync(filePath, buffer);
    } catch (writeError) {
      console.error('Failed to write file:', filePath, writeError);
      throw new Error(`Cannot write file: ${writeError.message}`);
    }

    // Return relative path from storage directory
    return `signatures/${finalFilename}`;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    throw error;
  }
};

/**
 * Delete file from storage
 * @param {string} filePath - Relative path from storage directory
 */
const deleteFile = (filePath) => {
  try {
    const storageDir = path.join(__dirname, '../../storage');
    const fullPath = path.join(storageDir, filePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw error, just log it
  }
};

module.exports = {
  saveBase64Image,
  deleteFile,
  ensureStorageDir,
};

