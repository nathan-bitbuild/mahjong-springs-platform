#!/bin/sh
set -eu
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi
node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy
exec node server.js
