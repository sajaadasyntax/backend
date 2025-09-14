#!/bin/bash

# WaterGB Nginx Configuration Update Script
# This script updates nginx configuration to support 5MB uploads

echo "🌊 WaterGB Nginx Configuration Update"
echo "====================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Backup existing nginx configuration
echo "📋 Backing up existing nginx configuration..."
if [ -f /etc/nginx/sites-available/default ]; then
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created"
else
    echo "⚠️  No existing configuration found"
fi

# Update nginx configuration
echo "🔧 Updating nginx configuration..."
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    server_name gwsudan.xyz www.gwsudan.xyz;

    # Increase client max body size to 5MB
    client_max_body_size 5M;

    # Increase buffer sizes for large requests
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;

    # Increase timeouts for large uploads
    client_body_timeout 60s;
    client_header_timeout 60s;
    send_timeout 60s;

    # Proxy settings
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase proxy buffer sizes
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Custom 413 error page
    error_page 413 @413;
    location @413 {
        return 413 '{"error": "Request entity too large", "message": "File size exceeds 5MB limit"}';
        add_header Content-Type application/json;
    }

    access_log /var/log/nginx/gwsudan.access.log;
    error_log /var/log/nginx/gwsudan.error.log;

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/gwsudan.xyz/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/gwsudan.xyz/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.gwsudan.xyz) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = gwsudan.xyz) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name gwsudan.xyz www.gwsudan.xyz;
    return 404; # managed by Certbot
}
EOF

echo "✅ Nginx configuration updated"

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx
if [ $? -eq 0 ]; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx"
    exit 1
fi

echo ""
echo "🎉 Nginx configuration updated successfully!"
echo ""
echo "📋 Changes made:"
echo "   • client_max_body_size: 5M"
echo "   • Increased buffer sizes"
echo "   • Increased timeouts"
echo "   • Added custom 413 error page"
echo ""
echo "🔍 To verify the changes:"
echo "   sudo nginx -t"
echo "   sudo systemctl status nginx"
echo ""
