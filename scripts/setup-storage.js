const fs = require('fs');
const path = require('path');

/**
 * Setup script to ensure storage directories exist
 * Run this after deploying to a new server
 */

const storageDirs = [
  path.join(__dirname, '../storage'),
  path.join(__dirname, '../storage/signatures'),
];

console.log('Setting up storage directories...\n');

storageDirs.forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('✓ Created:', dir);
    } else {
      console.log('✓ Already exists:', dir);
    }

    // Check write permissions
    const testFile = path.join(dir, '.permission-test');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✓ Write permissions OK:', dir);
    } catch (err) {
      console.error('✗ No write permissions:', dir);
      console.error('  Error:', err.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Failed to create:', dir);
    console.error('  Error:', error.message);
    process.exit(1);
  }
});

console.log('\n✓ Storage setup complete!');
console.log('\nIf you see any permission errors above, you may need to:');
console.log('1. Run this script with sudo (not recommended for production)');
console.log('2. Change ownership: chown -R $USER:$USER storage/');
console.log('3. Or grant write permissions: chmod -R 755 storage/');

