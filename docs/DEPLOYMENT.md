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

## Vercel deployment (serverless)

Two Vercel projects deploy from this repository:

| Project | Root directory | Runtime |
|---------|----------------|---------|
| Web | `apps/web` | Next.js (native) |
| API | `apps/api` | `vercel-php@0.8.0` (PHP 8.4), entrypoint `api/index.php`, config `apps/api/vercel.json` |

Serverless adaptations (all driven by `VERCEL=1` and `apps/api/vercel.json`):

- Writable paths (`storage/`, framework caches, compiled views) move to `/tmp`.
- Logs go to stderr as JSON (Vercel runtime logs).
- Cache uses the **database** store, so login rate limits hold across function
  instances; queues run synchronously; there is no Redis dependency, and the
  health check only probes Redis where it is configured.
- `api/index.php` presents requests as hitting `public/index.php` at the web
  root, otherwise `/api` would be treated as the base path.

Required API environment variables: `APP_KEY`, `BLIND_INDEX_KEY`,
`DB_URL` (PostgreSQL, SSL; the database must allow the `btree_gist` extension),
`FRONTEND_URL`. Web: `API_URL` (the API's production URL), `SESSION_SECRET`,
and `API_PROTECTION_BYPASS` when the API project is behind Vercel
Authentication.

### Current deployment (team "Tegnol")

| Project | Production URL | Access |
|---------|----------------|--------|
| `tax-compliance-web` | https://tax-compliance-web-tegnol.vercel.app | Public (the app has its own sign-in) |
| `tax-compliance-api` | https://tax-compliance-api.vercel.app | Vercel Authentication; the web server passes a protection-bypass secret |

Both projects deploy on every push to the production branch. The web app pins
its framework in `apps/web/vercel.json`. The API refuses cross-origin browser
access (CORS closed) because only the BFF calls it.

**Documents on Vercel.** The function filesystem is ephemeral. Until an
S3-compatible bucket is configured (`DOCUMENTS_DISK=s3` plus `AWS_*`), uploaded
certificates are stored in `/tmp` and will disappear when the instance is
recycled. Configure a bucket before relying on document storage.

**Migrations** are run from a trusted machine against `DB_URL`
(`php artisan migrate --force && php artisan rbac:sync`), never from a public
endpoint.

**Demo data** can be seeded into a dedicated demo database with
`APP_ENV=staging DEMO_MODE=true DEMO_PASSWORD=<private> php artisan db:seed --class=DemoSeeder`.
Never use the public default password on an internet-facing deployment.

## Status

The Dockerfiles and `docker-compose.yml` are written and `docker compose config`
validates. The images were not built in the Phase 1 environment (no Docker
daemon available); the first CI or local build is the verification step.
