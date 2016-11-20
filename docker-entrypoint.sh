#!/bin/bash
set -e

if [[ "$*" == pm2-docker*process.json* ]]; then
  # fix permissions
  gosu root chown -R app:app "$APP_CONTENT"

  # Install production dependencies
  npm install --production

  # Run the application as app user
  set -- gosu app "$@"
fi

exec "$@"