#!/bin/sh

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
# Note: If your folder containing settings.py and wsgi.py is named something else, 
# change 'migdal.wsgi' to match (e.g., 'migdal_platform.wsgi').
exec gunicorn migdal.wsgi:application --bind 0.0.0.0:8000 --workers 3
