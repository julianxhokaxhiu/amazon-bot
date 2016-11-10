#!/bin/bash
set -e

if [[ "$*" == npm*start* ]]; then
  chown -R app "$NODE_CONTENT"

  set -- gosu app "$@"
fi

exec "$@"