# Deployment

## Components

| Service | Image / command | Notes |
|---------|-----------------|-------|
| `api` | `docker/api/Dockerfile` target `app`, php-fpm | stateless, scale horizontally |
| `api-nginx` | nginx with `docker/nginx/api.conf` | TLS terminates at the load balancer |
| `worker` | same image, `php artisan queue:work` | scale by queue depth |
| `scheduler` | same image, `php artisan schedule:work` | exactly one replica |
| `migrate` | same image, `migrate --force && rbac:sync` | run once per release, before rollout |
| `web` | `docker/web/Dockerfile` (Next.js standalone) | stateless |
| PostgreSQL 16 | managed service recommended | PITR backups, encryption at rest |
| Redis 7 | managed service | queues, cache, rate limits |
| S3-compatible storage | private bucket | documents and generated PDFs |

## Required configuration

API: `APP_KEY`, `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`,
`FRONTEND_URL`, `DB_*`, `REDIS_*`, `AWS_*` (documents), `LOG_STACK=json`,
`LOG_JSON_STREAM=php://stderr`, `SANCTUM_EXPIRATION`. Later phases add
`XERO_CLIENT_ID/SECRET`, `QBO_CLIENT_ID/SECRET`.

Web: `API_URL` (internal URL of the API), `SESSION_SECRET` (≥ 32 chars, random).

**Never set `DEMO_MODE=true` in production.** The demo seeder refuses to run in
production regardless.

## Release procedure

1. Build images from a tagged commit (CI green).
2. Run the `migrate` job (migrations + `rbac:sync`).
3. Roll out `api`, `worker`, `web`; restart `scheduler`.
4. Check `GET /api/v1/health` (database, redis) and the web `/login` page.

## Operations

- Logs: JSON on stderr, with `correlation_id`, `organization_id`, `user_id`.
- Audit logs are append-only by trigger. Retention and archival are policy
  decisions for the operator; archival must copy, never delete in place.
- Backups: database PITR plus object storage versioning.

## Status

The Dockerfiles and `docker-compose.yml` are written and `docker compose config`
validates. The images were not built in the Phase 1 environment (no Docker
daemon available); the first CI or local build is the verification step.
