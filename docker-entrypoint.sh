#!/bin/sh
set -e

# Run Prisma migrations
echo "Running database migrations..."
cd /app/apps/server
npx prisma migrate deploy

echo "Starting server..."
exec node /app/apps/server/dist/index.js
