# ==============================================================
# Tokyo Rolls — Backend Dockerfile
# Python 3.12-slim + Gunicorn (single-stage)
# ==============================================================

FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies (system-wide)
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy application code
COPY . .

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create directories for staticfiles and media
RUN mkdir -p /app/staticfiles /app/media

# Expose port for Gunicorn
EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]

# Expose port for Gunicorn
EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
