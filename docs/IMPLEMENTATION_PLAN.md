# Implementation plan

Incremental, phase-gated. A phase is complete only when tests, type checks,
linting and migrations pass and the apps start. Status legend:
✅ done · 🟡 in progress · ⬜ not started.

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Foundation | ✅ |
| 2 | Client management | ⬜ |
| 3 | Accounting abstraction | ⬜ |
| 4 | Tax engine | ⬜ |
| 5 | Threshold engine + VAT/non-VAT | ⬜ |
| 6 | Working papers | ⬜ |
| 7 | Form engine + PDF | ⬜ |
| 8 | Review workflow | ⬜ |
| 9 | Reporting | ⬜ |
| 10 | Security + QA hardening | ⬜ |
| 11 | Demo environment | ⬜ |

## Phase 1: Foundation ✅

Backend
- Laravel 13 / PHP 8.4, PostgreSQL, Redis, Pest.
- Layered folders (`Domain`, `Application`, `Infrastructure`, `Http`).
- UUID primary keys; `organizations`, memberships, users.
- Tenant context resolved from the authenticated membership; `BelongsToOrganization`
  global scope that fails closed.
- RBAC: permission catalogue (from the spec), seven system roles, `Gate::before`
  permission resolution per membership.
- Sanctum token auth: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`,
  `GET /api/v1/me`, `POST /api/v1/me/organization` (switch tenant).
- Append-only `audit_logs` (DB trigger), `AuditLogger`, correlation-ID middleware,
  login/logout/tenant-switch audited.
- Consistent JSON error envelope; no stack traces outside debug.
- Security headers middleware, login rate limiting.
- Tests: auth, tenant isolation, RBAC matrix, audit append-only.

Frontend
- Next.js 16 App Router, Tailwind v4, design tokens (light/dark).
- shadcn primitives + ReUI components vendored (copy-and-own) via
  `scripts/vendor-reui.mjs`.
- BFF: login server action, encrypted httpOnly session cookie, `/api/bff/*`
  proxy with Origin check; `proxy.ts` route guard.
- AppShell (Sidebar, TopBar, ClientSwitcher placeholder, Cmd/Ctrl+K command
  palette), PageHeader, StatusBadge, EmptyState, ErrorState, LoadingState.
- Every primary route from the IA exists with a real empty state that says what
  unlocks it (no fabricated metrics).
- Tests: Vitest + RTL for shared components.

Infrastructure
- `docker-compose.yml`: postgres, redis, minio, api (php-fpm + nginx), worker,
  scheduler, web.

## Phase 2: Client management
- `clients`, `taxpayer_profiles`, `tax_registration_statuses` (effective-dated,
  source, document), `documents`, `registration_documents`, `client_user`.
- Actions: CreateClient, UpdateTaxpayerProfile, ChangeRegistrationStatus
  (requires effective date + reason + document; audited), UploadDocument
  (S3, SHA-256, signed URLs).
- API: `/api/v1/clients`, `/api/v1/tax-profiles`, `/api/v1/audit`.
- UI: clients Data Grid, client workspace header + tabs, Tax Profile workspace
  with prominent VAT status + source + history timeline, audit timeline.
- Users & roles settings pages.

## Phase 3: Accounting abstraction
- `AccountingProvider` interface; `XeroProvider`, `QuickBooksProvider` (OAuth2,
  encrypted tokens, refresh, retry/backoff, webhook entry points);
  `SimulatorProvider` reading `fixtures/` and labelled **Simulator** everywhere.
- Sync jobs, sync runs/errors, raw tables, per-provider normalisers, canonical
  ledger, normalisation logs.
- UI: integration cards, sync centre, accounting explorer (ReUI Data Grid with
  server-side filtering/pagination).
- Tests: Xero and QBO normalisation fixtures produce identical canonical output.

## Phase 4: Tax engine
- Jurisdictions, tax types, rule sets, versions (publish-once), rules (DSL JSON),
  classifications, mappings, thresholds.
- DSL evaluator (conditions + arithmetic) over decimals; no code execution.
- Calculation runs, results, lines, traces; rule resolution by period.
- Rule admin UI: draft, test, diff versions, publish.

## Phase 5: Threshold engine
- Threshold monitor, `threshold_evaluations`, advisory exceptions, notifications.
- **Critical acceptance test** (see `docs/TESTING.md`).

## Phase 6: Working papers
- Template registry, generators, versioning, CSV/XLSX export, linking to runs.

## Phase 7: Form engine
- Definitions, versions, sections, fields, mappings, instances, provenance.
- Deterministic HTML→PDF renderer (headless Chromium via Browsershot or
  Gotenberg container), document hashing, S3 storage.
- Form review UI (navigation / preview / provenance panel), overrides with reason.

## Phase 8: Review workflow
- Tax period state machine, exceptions lifecycle, adjustments, approval,
  finalisation, immutability (new version on change).

## Phase 9: Reporting
- Report read models and CSV/XLSX/PDF exports; dashboard metrics from real data.

## Phase 10: Security + QA
- Policy coverage audit, tenant-isolation fuzz tests, rate limits, MFA (TOTP),
  performance tests with 100k+ journal lines, Playwright end-to-end.

## Phase 11: Demo environment
- `DEMO_MODE` seeders: "Demo Accounting Firm", four fictional taxpayers
  (VAT, NON-VAT, approaching, crossing) with simulator fixtures; screening
  scenario; placeholder form definition clearly marked as non-official.

## Open domain inputs (blocking later phases, not Phase 1-3)

See `docs/PHILIPPINE_TAX_IMPLEMENTATION.md`. Rates, thresholds, look-back
windows, classifications, BIR form schemas and golden expected values must be
supplied by the domain expert.
