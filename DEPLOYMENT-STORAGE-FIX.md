# Fix: Consent Form Signature 500 Error on Live Server

## Problem
The consent-form-signature API endpoint works on localhost but fails with a 500 Internal Server Error on the live server. This is because the `storage/signatures` directory either doesn't exist or doesn't have proper write permissions.

## Error Message
```
POST https://portelapi.portraitplacestudios.co.uk/api/bookings/{id}/consent-form-signature 500
{success: false, message: "Internal server error"}
```

## Solution

### Option 1: Using the Setup Script (Recommended)

SSH into your live server and run:

```bash
cd /path/to/your/backend
npm run setup:storage
```

This will:
- Create the storage directories if they don't exist
- Verify write permissions
- Show any permission errors that need to be fixed

### Option 2: Using the Shell Script

SSH into your live server and run:

```bash
cd /path/to/your/backend
bash scripts/fix-storage-permissions.sh
```

### Option 3: Manual Steps

If the scripts don't work, manually run these commands on your live server:

```bash
# Navigate to backend directory
cd /path/to/your/backend

# Create directories
mkdir -p storage/signatures

# Set permissions (755 = owner can read/write/execute, others can read/execute)
chmod -R 755 storage/

# Create .gitkeep files to preserve directory structure
touch storage/.gitkeep
touch storage/signatures/.gitkeep

# Verify permissions
ls -la storage/
ls -la storage/signatures/
```

### Option 4: If Running with PM2 or as a Service

If your Node.js app runs under a specific user (e.g., `www-data`, `node`, etc.), you may need to change ownership:

```bash
# Replace 'youruser' with the actual user running your Node.js process
# You can find this by running: ps aux | grep node
sudo chown -R youruser:youruser storage/
sudo chmod -R 755 storage/
```

Common service users:
- **PM2**: Usually runs as the user who started PM2
- **systemd service**: Check your service file for the `User=` directive
- **Docker**: Usually runs as root or the user specified in Dockerfile

## Verification

After running any of the above solutions:

1. **Check the server logs** for more detailed error messages (we've improved error logging)
2. **Test the endpoint** by trying to save a consent form signature again
3. **Check server logs** at: `/path/to/your/backend/logs` or wherever your logs are stored

## Improved Error Logging

We've updated the code to provide better error messages. After deploying these changes, if the error persists, check your server logs. You'll now see specific error messages like:
- "Cannot create storage directory: Permission denied"
- "Cannot write file: EACCES: permission denied"

This will help identify the exact issue.

## Prevention for Future Deployments

To prevent this issue in future deployments:

1. **Using Git**: The `.gitkeep` files ensure the directory structure is preserved
   ```bash
   git add storage/.gitkeep storage/signatures/.gitkeep
   git commit -m "Preserve storage directory structure"
   ```

2. **Add to Deployment Script**: Include the setup script in your deployment process
   ```bash
   npm run setup:storage
   ```

3. **Docker**: If using Docker, add this to your Dockerfile:
   ```dockerfile
   # Create storage directories and set permissions
   RUN mkdir -p /app/storage/signatures && \
       chmod -R 755 /app/storage
   ```

4. **PM2 Ecosystem File**: Add to your `ecosystem.config.js`:
   ```javascript
   module.exports = {
     apps: [{
       name: "portrait-studio-api",
       script: "./src/server.js",
       post_deploy: "npm run setup:storage && pm2 reload ecosystem.config.js"
     }]
   }
   ```

## Quick Checklist

- [ ] SSH into live server
- [ ] Navigate to backend directory
- [ ] Run one of the fix options above
- [ ] Verify directories exist: `ls -la storage/signatures/`
- [ ] Check permissions show `drwxr-xr-x` or similar
- [ ] Test consent form signature feature
- [ ] Monitor server logs for any new errors

## Common Permission Values

- **755**: Owner can read/write/execute, group and others can read/execute (RECOMMENDED)
- **775**: Owner and group can read/write/execute, others can read/execute
- **777**: Everyone can read/write/execute (NOT RECOMMENDED for security reasons)

## Still Having Issues?

If you're still seeing errors after trying these solutions:

1. Check your server's error logs for the specific error message
2. Verify the Node.js process user: `ps aux | grep node`
3. Check available disk space: `df -h`
4. Verify SELinux isn't blocking file creation: `getenforce` (if enabled, you may need to adjust policies)
5. Contact your hosting provider if you don't have sufficient permissions

## Contact

For additional support, check the server logs at `/var/log/` or your application's log directory.

