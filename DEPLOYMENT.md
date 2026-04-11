# Hosting Configuration

## For production deployment:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Copy static assets:**
   ```bash
   cp -r public dist/
   cp -r views dist/
   ```

3. **Start production server:**
   ```bash
   npm run start:prod
   ```

4. **Or use PM2:**
   ```bash
   pm2 start dist/main.js --name exel-tool
   ```

## Static files access:
- Files in `public/` are served from root: `/logoWavebear.jpg`
- Make sure your hosting serves both the app and static files

## Environment variables needed:
- DB_HOST
- DB_PORT
- DB_USERNAME
- DB_PASSWORD
- DB_DATABASE
- JWT_SECRET
- JWT_EXPIRATION
