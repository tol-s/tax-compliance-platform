# Testing

## Layers

| Layer | Tool | Location | Runs against |
|-------|------|----------|--------------|
| API unit | Pest | `apps/api/tests/Unit` | no DB |
| API feature | Pest | `apps/api/tests/Feature` | **PostgreSQL** (`tax_platform_test`) |
| Golden tax scenarios | Pest | `apps/api/tests/Golden` + `fixtures/` | PostgreSQL (Phase 4+) |
| Web unit/component | Vitest + RTL | `apps/web/tests/unit` | jsdom |
| End-to-end | Playwright | `apps/web/tests/e2e` | real API + production build |

API tests use PostgreSQL, not SQLite: triggers (append-only audit), JSONB and
partial indexes are part of the behaviour under test.

## Current coverage (Phase 1)

API (52 tests): login success/failure/rate limit/logout/revocation, error
envelope, security headers, correlation IDs; tenant scope fails closed,
stamps and ignores spoofed `organization_id`, isolates reads, refuses moves,
resolves tenant from membership not input, org switching rules, suspended
memberships; RBAC matrix for all 7 roles × 20 permissions, cross-tenant role
leakage, no-tenant denial; audit append-only (UPDATE/DELETE/TRUNCATE rejected
by the database), redaction, tenant-scoped reads.

Web (23 unit tests): status language, permission-filtered navigation, session
encryption (no plaintext token, tamper/expiry rejection), BFF proxy (Origin
check, session requirement, header allow-list, bearer injection, traversal).

E2E (10): anonymous redirect, bad credentials, owner shell + demo banner +
empty states, read-only restrictions, Cmd/Ctrl+K navigation, unknown client is
not found, sign-out revocation, mobile dashboard.

## Running

```bash
# API: needs PostgreSQL with a tax_platform_test database the app role owns
cd apps/api && composer test

# Web
cd apps/web && pnpm test

# E2E: API on :8000 seeded with DEMO_MODE=true, then:
cd apps/web && pnpm build && pnpm test:e2e
# Optional: PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium to use a preinstalled browser
```

Login is rate limited per email; e2e tests use different demo users. If you
re-run repeatedly within a minute, clear the limiter with `php artisan cache:clear`.

## Critical acceptance test (Phase 5)

Must never fail:

```
Given taxpayer.vat_status = NON_VAT, source = BIR_CERTIFICATE,
      observed_revenue > configured_threshold
When  the tax calculation runs
Then  vat_status remains NON_VAT
 and  the NON_VAT rule path is used
 and  a threshold advisory exception is created
 and  an audit event records "Threshold exception detected; taxpayer registration status unchanged."
 and  no registration-status write occurs
```

## Golden tests

Each `fixtures/<jurisdiction>/scenario-NNN` holds a taxpayer profile, provider
payloads, a period and expected results. Scenarios with `DOMAIN_INPUT_REQUIRED`
markers are reported as pending, never passing. No expected tax values are
invented.

## Static analysis

`composer analyse` runs Larastan at level 6. It could not be installed in the
sandbox where Phase 1 was written (PHPStan's distribution host was blocked), so
CI runs it non-blocking until a first clean run or baseline is committed.
