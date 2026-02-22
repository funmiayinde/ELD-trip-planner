#!/bin/sh

set -e

echo "──────────────────────────────────────────"
echo "  ELD Trip Planner — backend starting up"
echo "──────────────────────────────────────────"

# ── 1. Wait for Postgres to be ready ─────────────────────────────────────────
# Only relevant when DATABASE_URL is set (i.e. not SQLite dev mode).
if [ -n "$DATABASE_URL" ]; then
    echo "→ Waiting for database..."
    # Extract host and port from DATABASE_URL
    # Format: postgres://user:pass@host:port/dbname
    DB_HOST=$(echo "$DATABASE_URL" | sed -e 's/.*@//' -e 's/:.*//' -e 's/\/.*//')
    DB_PORT=$(echo "$DATABASE_URL" | sed -e 's/.*@[^:]*://' -e 's/\/.*//')
    DB_PORT="${DB_PORT:-5432}"

    MAX_RETRIES=30
    RETRY=0
    until python -c "
import socket, sys
try:
    s = socket.create_connection(('$DB_HOST', $DB_PORT), timeout=2)
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
        RETRY=$((RETRY + 1))
        if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
            echo "✗ Database not reachable after $MAX_RETRIES attempts. Exiting."
            exit 1
        fi
        echo "  ... not ready yet (attempt $RETRY/$MAX_RETRIES), retrying in 2s"
        sleep 2
    done
    echo "✓ Database is reachable"
fi

echo "→ Running migrations..."
python manage.py migrate --noinput
echo "✓ Migrations complete"

echo "→ Collecting static files..."
python manage.py collectstatic --noinput --clear 2>/dev/null || true
echo "✓ Static files ready"

WORKERS="${GUNICORN_WORKERS:-2}"
PORT="${PORT:-8000}"

echo "→ Starting gunicorn on port $PORT with $WORKERS workers..."
echo "──────────────────────────────────────────"

exec gunicorn trip_planner.wsgi:application \
    --bind "0.0.0.0:${PORT}" \
    --workers "$WORKERS" \
    --worker-class sync \
    --timeout 120 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --log-level "${GUNICORN_LOG_LEVEL:-info}" \
    --access-logfile - \
    --error-logfile -
