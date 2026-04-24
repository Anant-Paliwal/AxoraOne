#!/bin/bash
# Production startup script for Axora Backend

# Use Gunicorn with Uvicorn workers for ASGI support
exec gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:${PORT:-8000} \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
