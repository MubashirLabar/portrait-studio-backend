const fs = require('fs');
const path = require('path');

/**
 * Ensure storage directory exists
 */
const ensureStorageDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
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
    ensureStorageDir(storageDir);

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
    const buffer = Buffer.from(base64String, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Return relative path from storage directory
    return `signatures/${finalFilename}`;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    throw new Error('Failed to save signature image');
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

