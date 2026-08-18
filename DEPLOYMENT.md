# 🚀 Linux Server Deployment Guide (Nginx, PM2, MySQL & PNPM Monorepo)

This guide walks you through deploying the **Contact Management System** on a Linux server (Ubuntu 22.04/24.04 LTS or Debian 11/12) using **Nginx** as the reverse proxy and web server, **PM2** as the Node.js process manager, **MySQL 8** with stored functions, and **pnpm / Turborepo**.

---

## 🏗️ Architecture Overview

```
                        ┌───────────────────────────────┐
                        │      Internet / Clients       │
                        └───────────────┬───────────────┘
                                        │ HTTPS (Port 443)
                                        ▼
                        ┌───────────────────────────────┐
                        │         Nginx Server          │
                        ├───────────────────────────────┤
                        │  /        ──► apps/web/dist     │ (SPA Static Files)
                        │  /uploads ──► apps/api/uploads  │ (Static Images)
                        │  /api     ──► localhost:5000  │ (Express Proxy)
                        └───────────────┬───────────────┘
                                        │ Reverse Proxy (Port 5000)
                                        ▼
                        ┌───────────────────────────────┐
                        │       PM2 Process Manager     │
                        │    (Node.js / Express Server) │
                        └───────────────┬───────────────┘
                                        │ Prisma ORM
                                        ▼
                        ┌───────────────────────────────┐
                        │        MySQL 8 Database       │
                        │  (with encryptId / decryptId) │
                        └───────────────────────────────┘
```

---

## 1. 📋 Server Prerequisites

Connect to your server via SSH and update packages:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential
```

### Install Node.js (v20+ LTS) & PNPM
```bash
# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v   # Should be v20.x or higher
npm -v

# Install PNPM globally
sudo npm install -g pnpm pm2
pnpm -v
pm2 -v
```

### Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Install & Configure MySQL 8
```bash
sudo apt install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql
```

---

## 2. 🗄️ MySQL Database & Function Permissions

Log into MySQL as root:
```bash
sudo mysql
```

Run the following SQL commands to create the database, user, and enable function creation:
```sql
-- 1. Create database
CREATE DATABASE IF NOT EXISTS contact_management_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Create dedicated application user
CREATE USER IF NOT EXISTS 'cms_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';

-- 3. Grant privileges
GRANT ALL PRIVILEGES ON contact_management_db.* TO 'cms_user'@'localhost';

-- 4. IMPORTANT: Enable function creation privileges (required for encryptId / decryptId stored functions)
SET GLOBAL log_bin_trust_function_creators = 1;

FLUSH PRIVILEGES;
EXIT;
```

> [!TIP]
> To persist `log_bin_trust_function_creators = 1` across MySQL server restarts, add it to `/etc/mysql/mysql.conf.d/mysqld.cnf`:
> ```ini
> [mysqld]
> log_bin_trust_function_creators = 1
> ```

---

## 3. 📂 Deploying Application Code

### Clone Repository
```bash
sudo mkdir -p /var/www/contact-management-system
sudo chown -R $USER:$USER /var/www/contact-management-system

git clone https://github.com/MeghalKPSSK/ContactManagementSystem.git /var/www/contact-management-system
cd /var/www/contact-management-system
```

### Configure Environment Variables
Create the production environment configuration in `apps/api/.env`:
```bash
nano apps/api/.env
```

Paste your production credentials:
```env
# Server
PORT=5000
NODE_ENV=production

# Database Connection
DB_HOST=localhost
DB_PORT=3306
DB_USER=cms_user
DB_PASSWORD=YourStrongPassword123!
DB_NAME=contact_management_db

# Prisma Database URL
DATABASE_URL="mysql://cms_user:YourStrongPassword123!@localhost:3306/contact_management_db"

# AES Encryption Key
ZC_ID_ENCRYPT_DECRYPT_KEY="9A48BCDA1014786E"
```

Also update the frontend runtime configuration in `apps/web/public/config.json` if using a custom domain:
```json
{
    "apiUrl": "/api",
    "appVersion": "1.5.0",
    "appName": "CMS"
}
```

---

## 4. ⚙️ Install Dependencies, Migrate Database & Build

Run the following inside `/var/www/contact-management-system`:
```bash
# 1. Install all dependencies across monorepo workspaces
pnpm install

# 2. Generate Prisma Client
pnpm db:generate

# 3. Push schema to database and automatically register encryptId / decryptId stored functions
pnpm db:push

# 4. Build the client application (creates apps/web/dist)
pnpm build
```

---

## 5. 🚀 Starting the Backend with PM2

The project includes an `ecosystem.config.cjs` preconfigured for production cluster mode:

```bash
# Start backend using PM2 ecosystem file
pm2 start ecosystem.config.cjs --env production

# Save current PM2 process list
pm2 save

# Setup PM2 to auto-start on system boot
pm2 startup
# (Copy and run the command printed by pm2 startup if prompted)
```

### Useful PM2 Commands:
```bash
pm2 status                  # Check process status and memory
pm2 logs cms-api         # View real-time application logs
pm2 reload cms-api       # Zero-downtime reload
pm2 restart cms-api      # Hard restart
```

---

## 6. 🌐 Configuring Nginx

Create a new Nginx server configuration:
```bash
sudo nano /etc/nginx/sites-available/cms
```

Paste the following configuration (replace `yourdomain.com` with your actual domain or server IP):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com; # Or server IP

    # Client Single Page App (Static files)
    root /var/www/contact-management-system/apps/web/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Uploads directory
    location /uploads/ {
        alias /var/www/contact-management-system/apps/api/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # API Reverse Proxy to Express Server
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Max body size for avatar/file uploads
        client_max_body_size 20M;
    }

    # SPA routing - fallback to index.html for client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Enable Site & Test Nginx:
```bash
# Enable the site configuration
sudo ln -sf /etc/nginx/sites-available/cms /etc/nginx/sites-enabled/

# Remove default site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 7. 🔒 SSL / HTTPS with Let's Encrypt (Certbot)

To secure your site with a free SSL certificate:
```bash
sudo apt install -y certbot python3-certbot-nginx

# Obtain and configure SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 8. 🛡️ Firewall Configuration (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 9. 🔄 Zero-Downtime Update Script (`deploy.sh`)

Create an automated update script in `/var/www/contact-management-system/deploy.sh`:

```bash
cat << 'EOF' > /var/www/contact-management-system/deploy.sh
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
pnpm install

# 3. Apply database migrations & update stored functions
pnpm db:push

# 4. Rebuild frontend
pnpm build

# 5. Reload PM2 backend with zero downtime
pm2 reload ecosystem.config.cjs --env production

echo "✅ Deployment completed successfully!"
EOF

chmod +x /var/www/contact-management-system/deploy.sh
```

Whenever you have new changes to deploy, simply run:
```bash
./deploy.sh
```
