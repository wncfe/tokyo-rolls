# ==============================================================
# Tokyo Rolls — Backend Dockerfile
# Python 3.12-slim + Gunicorn (single-stage)
# ==============================================================

FROM python:3.12-slim

WORKDIR /app

# Create non-root user
RUN addgroup --system app && adduser --system --group app

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

# Give app user ownership
RUN chown -R app:app /app

# Switch to non-root user
USER app

# Expose port for Gunicorn
EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]

# Expose port for Gunicorn
EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
