#!/bin/sh
# Vercel build command (vercel.json). Production deploys migrate the database
# before building, so new code never goes live ahead of its schema: a failed
# migration fails the deploy and the previous one stays live.
#
# Preview deploys never migrate: they share the production DATABASE_URL.
set -e

if [ "$VERCEL_ENV" = "production" ]; then
	pnpm db:migrate
else
	echo "Skipping database migrations (VERCEL_ENV=${VERCEL_ENV:-unset})"
fi

pnpm build
