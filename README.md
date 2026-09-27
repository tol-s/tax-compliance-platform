# Tax Compliance Platform

A multi-tenant SaaS platform for accounting firms: it ingests accounting data
from Xero and QuickBooks Online, normalises it into a canonical ledger,
applies versioned, jurisdiction-specific tax rules, produces traceable
calculations, working papers and populated official forms, and keeps an
append-only audit trail of everything.

The first jurisdiction is **the Philippines**, delivered as a module on a
jurisdiction-agnostic core. **No Philippine tax law is encoded yet**: rates,
thresholds, classifications and BIR form schemas are supplied by the client's
domain expert (see `docs/PHILIPPINE_TAX_IMPLEMENTATION.md`).

## Status

Phase 1 (foundation) is complete. See `docs/IMPLEMENTATION_PLAN.md`.

| Area | State |
|------|-------|
| Multi-tenancy (fail-closed tenant scope) | ✅ |
| Token auth via Next.js BFF, encrypted httpOnly session | ✅ |
| RBAC: 20 permissions, 7 system roles | ✅ |
| Append-only audit log (DB trigger), correlation IDs | ✅ |
| Design system, ReUI/shadcn components, app shell, Cmd/Ctrl+K | ✅ |
| All IA routes with honest empty states (no fabricated data) | ✅ |
| Clients, integrations, tax engine, forms, workflow | Phases 2-11 |

## Repository layout

```
apps/api     Laravel 13 (PHP 8.4) REST API: /api/v1
apps/web     Next.js 16 App Router frontend + BFF
docs/        Architecture, database, engines, security, testing
fixtures/    Accounting and golden tax fixtures
docker/      Dockerfiles and nginx config
```

## Quick start (local, without Docker)

Requirements: PHP 8.4 (pdo_pgsql, redis, intl, bcmath), Composer, Node 22, pnpm,
PostgreSQL 16, Redis 7.

```bash
# API
cd apps/api
cp .env.example .env && php artisan key:generate
composer install
php artisan migrate --seed            # permission catalogue + system roles
DEMO_MODE=true php artisan db:seed --class=DemoSeeder   # optional, fictional demo firm
php artisan serve --port=8000

# Web
cd apps/web
cp .env.example .env.local            # set SESSION_SECRET (openssl rand -base64 48)
pnpm install
pnpm dev                              # http://localhost:3000
```

Demo users (only when seeded with `DEMO_MODE=true`): `owner@demo.test`,
`admin@demo.test`, `tax-manager@demo.test`, `tax-preparer@demo.test`,
`reviewer@demo.test`, `accountant@demo.test`, `read-only@demo.test`; password
`demo-password`.

For a real organisation: `php artisan organization:create "Firm name" --owner-email=... --owner-name=...`.

## With Docker

```bash
cp .env.example .env    # set APP_KEY and SESSION_SECRET
docker compose up -d postgres redis minio
docker compose run --rm migrate
docker compose up -d
```

## Checks

```bash
cd apps/api && composer lint && composer test          # Pint, Pest (PostgreSQL)
cd apps/web && pnpm typecheck && pnpm lint && pnpm test && pnpm build
cd apps/web && pnpm test:e2e                            # Playwright, needs API + demo seed
```

## Documentation

`docs/ARCHITECTURE.md` · `docs/DATABASE.md` · `docs/IMPLEMENTATION_PLAN.md` ·
`docs/UI_ARCHITECTURE.md` · `docs/TAX_ENGINE.md` · `docs/ACCOUNTING_INTEGRATIONS.md` ·
`docs/FORM_ENGINE.md` · `docs/AUDITABILITY.md` · `docs/SECURITY.md` ·
`docs/DEVELOPMENT.md` · `docs/DEPLOYMENT.md` · `docs/TESTING.md` ·
`docs/PHILIPPINE_TAX_IMPLEMENTATION.md`
