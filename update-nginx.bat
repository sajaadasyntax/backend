@echo off
REM WaterGB Nginx Configuration Update Script for Windows
REM This script helps you update nginx configuration to support 5MB uploads

echo 🌊 WaterGB Nginx Configuration Update
echo =====================================

echo.
echo 📋 Instructions to update nginx configuration:
echo.
echo 1. Connect to your server via SSH
echo 2. Run the following commands as root (or with sudo):
echo.
echo    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
echo    sudo nano /etc/nginx/sites-available/default
echo.
echo 3. Replace the contents with the configuration below:
echo.
echo ==========================================
echo server {
echo     server_name gwsudan.xyz www.gwsudan.xyz;
echo.
echo     # Increase client max body size to 5MB
echo     client_max_body_size 5M;
echo.
echo     # Increase buffer sizes for large requests
echo     client_body_buffer_size 128k;
echo     client_header_buffer_size 1k;
echo     large_client_header_buffers 4 4k;
echo.
echo     # Increase timeouts for large uploads
echo     client_body_timeout 60s;
echo     client_header_timeout 60s;
echo     send_timeout 60s;
echo.
echo     # Proxy settings
echo     proxy_connect_timeout 60s;
echo     proxy_send_timeout 60s;
echo     proxy_read_timeout 60s;
echo.
echo     location / {
echo         proxy_pass http://localhost:3000;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection 'upgrade';
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo         proxy_cache_bypass $http_upgrade;
echo         
echo         # Increase proxy buffer sizes
echo         proxy_buffering on;
echo         proxy_buffer_size 4k;
echo         proxy_buffers 8 4k;
echo         proxy_busy_buffers_size 8k;
echo     }
echo.
echo     # Health check endpoint
echo     location /health {
echo         proxy_pass http://localhost:3000/health;
echo         proxy_http_version 1.1;
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo     }
echo.
echo     # Custom 413 error page
echo     error_page 413 @413;
echo     location @413 {
echo         return 413 '{"error": "Request entity too large", "message": "File size exceeds 5MB limit"}';
echo         add_header Content-Type application/json;
echo     }
echo.
echo     access_log /var/log/nginx/gwsudan.access.log;
echo     error_log /var/log/nginx/gwsudan.error.log;
echo.
echo     listen 443 ssl; # managed by Certbot
echo     ssl_certificate /etc/letsencrypt/live/gwsudan.xyz/fullchain.pem; # managed by Certbot
echo     ssl_certificate_key /etc/letsencrypt/live/gwsudan.xyz/privkey.pem; # managed by Certbot
echo     include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
echo     ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
echo }
echo.
echo server {
echo     if ($host = www.gwsudan.xyz) {
echo         return 301 https://$host$request_uri;
echo     } # managed by Certbot
echo.
echo     if ($host = gwsudan.xyz) {
echo         return 301 https://$host$request_uri;
echo     } # managed by Certbot
echo.
echo     listen 80;
echo     server_name gwsudan.xyz www.gwsudan.xyz;
echo     return 404; # managed by Certbot
echo }
echo ==========================================
echo.
echo 4. Test the configuration:
echo    sudo nginx -t
echo.
echo 5. Reload nginx:
echo    sudo systemctl reload nginx
echo.
echo 6. Verify the changes:
echo    sudo systemctl status nginx
echo.
echo 📋 Key changes made:
echo    • client_max_body_size: 5M
echo    • Increased buffer sizes
echo    • Increased timeouts
echo    • Added custom 413 error page
echo.
echo ✅ After updating nginx, your server will accept requests up to 5MB!
echo.
pause
