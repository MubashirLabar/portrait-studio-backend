#!/bin/bash

# Script to fix storage directory permissions on live server
# Run this from the backend directory: bash scripts/fix-storage-permissions.sh

echo "Fixing storage directory permissions..."
echo ""

# Create directories if they don't exist
mkdir -p storage/signatures

# Set appropriate permissions
# 755 = owner can read/write/execute, group and others can read/execute
chmod -R 755 storage/

# Create .gitkeep files to preserve directory structure in git
touch storage/.gitkeep
touch storage/signatures/.gitkeep

echo "✓ Storage directories created"
echo "✓ Permissions set to 755"
echo "✓ .gitkeep files created"
echo ""
echo "Verifying permissions..."
ls -la storage/
echo ""
ls -la storage/signatures/
echo ""
echo "Done! The consent form signature feature should now work."

