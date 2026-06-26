#!/bin/bash
# ==============================================================
# Tokyo Rolls — Backend Entrypoint
# Runs migrations, collectstatic, populates DB if empty, starts Gunicorn
# ==============================================================

set -e

echo "→ Running migrations..."
python manage.py migrate --noinput

echo "→ Collecting static files..."
python manage.py collectstatic --noinput --clear

# Check if DB has any products; if not, populate sample data
# (run inside manage.py shell to avoid early django import issues)
echo "→ Checking if database needs seeding..."
python manage.py shell -c "
from api.models import Product
count = Product.objects.count()
print(f'Product count: {count}')
if count == 0:
    import subprocess, sys
    print('Database is empty — populating sample data...')
    subprocess.run([sys.executable, 'populate_db.py'], check=True)
"

echo "→ Starting Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
