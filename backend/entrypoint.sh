#!/bin/bash
# ==============================================================
# Tokyo Rolls — Backend Entrypoint
# Runs migrations, collectstatic, populates DB if empty, starts Gunicorn
# ==============================================================

echo "→ Running migrations..."
python manage.py migrate --noinput || {
    echo "⚠️  Migrations failed!"
    exit 1
}

echo "→ Collecting static files..."
python manage.py collectstatic --noinput --clear || echo "⚠️  collectstatic had issues (non-fatal)"

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
    python populate_db.py || echo "⚠️  Populate failed (non-fatal, continuing...)"
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
