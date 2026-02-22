# FROM python:3.11-slim AS builder


# ENV PYTHONDONTWRITEBYTECODE=1 \
#     PYTHONUNBUFFERED=1

# WORKDIR /build


# RUN apt-get update && apt-get install -y --no-install-recommends \
#         gcc \
#         libpq-dev \
#     && rm -rf /var/lib/apt/lists/*


# COPY requirements.txt .
# RUN pip install --upgrade pip \
#     && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


# FROM python:3.11-slim AS runtime

# ENV PYTHONDONTWRITEBYTECODE=1 \
#     PYTHONUNBUFFERED=1 \
#     DJANGO_SETTINGS_MODULE=trip_planner.settings

# RUN apt-get update && apt-get install -y --no-install-recommends \
#         libpq5 \
#         curl \
#     && rm -rf /var/lib/apt/lists/*

# # Non-root user — never run app code as root inside a container
# RUN groupadd --system appgroup && \
#     useradd  --system --gid appgroup --no-create-home appuser

# WORKDIR /app

# COPY --from=builder /wheels /wheels
# RUN pip install --no-cache-dir --no-index --find-links /wheels /wheels/* \
#     && rm -rf /wheels

# COPY . .

# RUN SECRET_KEY=build-time-placeholder python manage.py collectstatic --noinput

# RUN chown -R appuser:appgroup /app

# USER appuser

# EXPOSE 8000

# # ── Health check
# # Docker / compose will mark the container unhealthy if this fails.
# HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
#     CMD curl -f http://localhost:8000/api/trip/health/ || exit 1

# # ── Entrypoint 
# # Uses the entrypoint script so migrate always runs before gunicorn starts.
# COPY --chown=appuser:appgroup entrypoint.sh /entrypoint.sh
# RUN chmod +x /entrypoint.sh
# ENTRYPOINT ["/entrypoint.sh"]


# Use slim Python image
FROM python:3.11-slim

# Prevent .pyc files
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy project
COPY . .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]