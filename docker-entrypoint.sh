#!/bin/bash
set -e

if [[ "$*" == npm*start* ]]; then
  npm install -g --production

  chown -R app "$NODE_CONTENT"

  set -- gosu app "$@"
fi

exec "$@"