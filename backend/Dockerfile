# ==============================================================
# Tokyo Rolls — Backend Dockerfile
# Python 3.12-slim + Gunicorn
# ==============================================================

FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies (only needed for building)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements-prod.txt .
RUN pip install --no-cache-dir --user -r requirements-prod.txt


# ---- Final stage ----
FROM python:3.12-slim

WORKDIR /app

# Create non-root user
RUN addgroup --system app && adduser --system --group app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Make sure scripts in .local are in PATH
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create directories for staticfiles and media
RUN mkdir -p /app/staticfiles /app/media

# Switch to non-root user
USER app

# Expose port for Gunicorn
EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
