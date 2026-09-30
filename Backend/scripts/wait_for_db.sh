#!/usr/bin/env bash
set -e

host="${DB_HOST:-localhost}"
port="${DB_PORT:-5432}"

echo "Esperando PostgreSQL en $host:$port..."
until pg_isready -h "$host" -p "$port" > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL disponible."
