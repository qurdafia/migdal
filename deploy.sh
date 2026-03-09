#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 INITIATING MIGDAL PRODUCTION DEPLOYMENT..."

echo "------------------------------------------------"
echo "💾 STEP 1: Backing up the PostgreSQL database..."
# Creates a backups folder if it doesn't exist yet
mkdir -p db_backups

# Dumps the database into a timestamped SQL file
podman-compose -f docker-compose.prod.yml exec -T -e PGPASSWORD="PasswordMigdal2026!" db pg_dump -U migdal_user migdal_prod > db_backups/migdal_backup_$(date +%Y%m%d_%H%M%S).sql
# podman-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres postgres > db_backups/migdal_backup_$(date +%Y%m%d_%H%M%S).sql
echo "✅ Backup successfully saved in the db_backups/ directory!"

echo "🧹 STEP 1.5: Cleaning up backups older than 30 days..."
# Finds and deletes any .sql files in the backup folder older than 30 days
find db_backups/ -type f -name "*.sql" -mtime +30 -exec rm {} \;
echo "✅ Old backups cleaned up!"

echo "------------------------------------------------"
echo "📦 STEP 2: Pulling latest code from GitHub..."
git reset --hard origin/main
git pull origin main

echo "------------------------------------------------"
echo "🛑 STEP 3: Spinning down current production stack..."
podman-compose -f docker-compose.prod.yml down

echo "------------------------------------------------"
echo "🧹 STEP 4: Vaporizing old Web and Nginx images..."
podman rmi localhost/migdal_web:latest localhost/migdal_nginx:latest || true
podman image prune -f

echo "------------------------------------------------"
echo "🏗️ STEP 5: Building fresh images from scratch (No Cache)..."
podman-compose -f docker-compose.prod.yml build --no-cache

echo "------------------------------------------------"
echo "🟢 STEP 6: Spinning up new production stack..."
podman-compose --env-file .env.prod -f docker-compose.prod.yml up -d

echo "------------------------------------------------"
echo "⏳ Waiting 5 seconds for the database to accept connections..."
sleep 5

echo "------------------------------------------------"
echo "🗄️ STEP 7: Applying database migrations..."
podman-compose -f docker-compose.prod.yml exec web python manage.py makemigrations
podman-compose -f docker-compose.prod.yml exec web python manage.py migrate

echo "------------------------------------------------"
echo "🎨 STEP 8: Collecting static files for Nginx..."
podman-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput

echo "------------------------------------------------"
echo "✅ DEPLOYMENT COMPLETE! Migdal is live on the fresh code."