#!/bin/bash
# ==============================================================
# Tokyo Rolls — Backend Entrypoint
# Runs migrations, collectstatic, populates DB if empty, starts Gunicorn
# ==============================================================
set -euo pipefail

echo "→ Running migrations..."
python manage.py migrate --noinput

echo "→ Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "→ Checking if database needs seeding..."
DB_NEEDS_SEED=0
python -c "
import sqlite3, os
db_path = '/app/data/db.sqlite3'
if not os.path.exists(db_path):
    print('No DB file — will populate.')
    exit(0)
conn = sqlite3.connect(db_path)
count = conn.execute('SELECT COUNT(*) FROM api_product').fetchone()[0]
conn.close()
print(f'Product count: {count}')
exit(0 if count == 0 else 1)
" 2>&1 || DB_NEEDS_SEED=1

if [ "$DB_NEEDS_SEED" -eq 0 ]; then
    echo "→ Database empty — populating sample data..."
    python populate_db.py
fi

echo "→ Starting Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers ${WEB_CONCURRENCY:-2} \
    --threads 2 \
    --timeout 120 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
