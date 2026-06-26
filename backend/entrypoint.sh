#!/bin/bash
# ==============================================================
# Tokyo Rolls — Backend Entrypoint
# Runs migrations, collectstatic, populates DB if empty, starts Gunicorn
# ==============================================================

set -e

# Ensure data directory exists for SQLite
mkdir -p /app/data

echo "→ Running migrations..."
python manage.py migrate --noinput

echo "→ Collecting static files..."
python manage.py collectstatic --noinput --clear

# Check if DB has any products; if not, populate sample data
PRODUCT_COUNT=$(python -c "
import django; import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from api.models import Product
print(Product.objects.count())
")

if [ "$PRODUCT_COUNT" -eq 0 ]; then
    echo "→ Database is empty — populating sample data..."
    python populate_db.py
else
    echo "→ Database already has $PRODUCT_COUNT products — skipping populate."
fi

echo "→ Starting Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
