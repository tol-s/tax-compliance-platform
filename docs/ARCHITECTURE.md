# Architecture

This document is the architecture proposal for the platform. It describes the
target design; `docs/IMPLEMENTATION_PLAN.md` tracks what is built.

## 1. What this system is

A multi-tenant **tax-compliance platform**. The Philippines is the first
jurisdiction, delivered as a *module* on top of a jurisdiction-agnostic core.
Nothing in the core knows what VAT, percentage tax or a BIR form is; it knows
about taxpayers, registrations, rule sets, formulas, calculations, working
papers, form definitions, exceptions and audit events.

The litmus test for every design decision:

> Could we add a second jurisdiction (or a second tax type in the Philippines)
> by adding configuration, a rule pack, form definitions and fixtures, without
> editing ingestion, tenancy, audit, calculation or document code?

## 2. Guiding principles

1. **Domain input is never invented.** Philippine rates, thresholds, form
   fields and legal rules are supplied by the client's domain expert. Until
   then the system carries explicit `DOMAIN_INPUT_REQUIRED` markers that are
   visible in code, in the rule admin UI and in calculation output.
2. **Registered status is data, not inference.** A taxpayer's VAT status comes
   from their registration record (e.g. BIR Certificate of Registration). The
   engine reads it; it never writes it. Observed economic activity and threshold
   conditions are separate concepts that can only raise advisories.
3. **Every number is explainable.** Each calculated amount carries a trace back
   through formula, rule version, classification, canonical record and the raw
   provider payload.
4. **History is immutable.** Published rule versions, finalised calculations,
   generated forms and audit events are never mutated. Change means a new
   version.
5. **Provider data never leaks into tax logic.** Xero and QuickBooks payloads
   stop at the normalisation boundary.
6. **Tenant context is server-derived.** `organization_id` is never accepted
   from the client.
7. **Decimal arithmetic only.** Money is `NUMERIC(20,4)` in PostgreSQL and
   arbitrary-precision decimals in PHP (`brick/math`). No floats anywhere in the
   calculation path.

## 3. System context

```
                    ┌──────────────────────────┐
  Browser  ───────▶ │  apps/web  (Next.js BFF) │  httpOnly session cookie
                    │  RSC pages + /api/bff/*   │  (API token never in JS)
                    └────────────┬─────────────┘
                                 │ Bearer token (server-to-server)
                    ┌────────────▼─────────────┐
                    │  apps/api  (Laravel)      │
                    │  REST /api/v1             │
                    ├───────────────────────────┤
                    │  Queue workers (Redis)    │──▶ Xero / QBO APIs
                    │  Scheduler                │
                    └──┬──────────┬─────────┬───┘
                       │          │         │
                  PostgreSQL    Redis     S3-compatible storage
                  (system of    (queues,  (registration docs,
                   record)      cache,     generated PDFs,
                                locks)     working paper exports)
```

### Why a Backend-for-Frontend

The Next.js server holds the Laravel API token in an encrypted httpOnly cookie
and proxies API calls. Consequences:

- no API credential is readable by browser JavaScript (XSS cannot exfiltrate it);
- the Laravel API stays a clean, stateless, token-authenticated REST API that a
  future e-filing worker, CLI or partner integration can use unchanged;
- CSRF is handled at one choke point (Origin check on mutating BFF requests plus
  `SameSite=Lax` cookies), rather than coordinating Sanctum SPA cookies across
  two origins.

## 4. Bounded contexts

The prompt lists fourteen areas (A to N). They map to these backend modules:

| # | Context | Responsibility | Depends on |
|---|---------|----------------|------------|
| A, N | **Tenancy** | Organisations, memberships, tenant context, isolation | none |
| M | **Identity & Access** | Users, auth, roles, permissions, client assignments | Tenancy |
| J | **Audit** | Append-only audit events, correlation IDs | Tenancy |
| D | **Clients / Taxpayers** | Taxpayer profile, registration history, documents | Tenancy, Audit |
| B | **Accounting Integrations** | Provider connections, OAuth, sync runs, raw records | Tenancy |
| C | **Canonical Ledger** | Normalised accounts, journals, invoices, bills, lineage | Integrations |
| E | **Tax Rules** | Jurisdictions, tax types, rule sets, versions, DSL, thresholds, classifications | none (pure config) |
| F | **Calculation** | Calculation runs, results, traces, adjustments, threshold monitoring | Ledger, Rules, Clients |
| G | **Working Papers** | Generated schedules linked to calculations | Calculation |
| H | **Forms** | Form definitions, versions, mappings, instances, provenance | Calculation, Working Papers |
| I | **Compliance Workflow** | Tax periods, state machine, exceptions, review, approval | Calculation, Forms |
| L | **Documents** | Deterministic PDF rendering, object storage, signed URLs | Forms |
| K | **Reporting** | Read models and exports | all (read-only) |

Dependencies point one way. The Tax Rules context has **no** dependency on
accounting providers or on any jurisdiction; jurisdictions are data plus an
optional PHP *jurisdiction pack* (see §7).

## 5. Backend layering (apps/api)

```
app/
  Domain/            Pure domain: entities (Eloquent models), value objects,
    <Context>/       enums, domain services, domain events, repository-free
                     rules. No HTTP, no provider SDKs.
  Application/       Use cases ("actions"): orchestrate domain + infra,
    <Context>/       own transactions, emit audit events, dispatch jobs.
  Infrastructure/    Adapters: Xero/QBO clients, PDF renderer, storage,
    <Concern>/       encryption, provider simulator.
  Http/              Thin controllers, FormRequests, API Resources,
                     middleware. Controllers call one action and return a
                     resource. No tax logic.
  Jurisdictions/     Jurisdiction packs (Philippines first): rule-pack
    Philippines/     loaders, form-definition seeds, fixtures wiring.
```

Rules of thumb:

- Controllers: validate (FormRequest), authorise (Policy), call an Action,
  return a Resource.
- Actions: one public `handle()` / `__invoke()`; wrap writes in a DB transaction;
  record audit events inside the same transaction.
- Long work (sync, normalise, classify, calculate, generate) runs in queued
  jobs that call the same Actions, so behaviour is identical in tests.

## 6. Data flow: from ledger to filed form

```
Provider API ─▶ Provider Adapter ─▶ raw_* tables (verbatim JSONB payload)
                                          │
                              Normaliser (per provider, deterministic)
                                          ▼
                         Canonical ledger (accounts, journal_lines, ...)
                                          │  source_provider / source_record_id /
                                          │  source_payload_hash on every row
                                          ▼
                 Classifier (tax_mappings: account → classification)
                                          ▼
Taxpayer registration ─▶ Rule resolver (jurisdiction, tax type, period →
 (vat_status etc.)        applicable published rule versions)
                                          ▼
                         Calculation engine (DSL evaluator, decimal maths)
                           → calculation_results / lines / traces
                           → threshold monitor → advisory exceptions
                                          ▼
                         Working paper generator (versioned, linked)
                                          ▼
                         Form engine (form version + field mappings)
                           → form_instances / form_values (+ provenance)
                                          ▼
                         PDF renderer → documents (hash, S3 key)
```

Each arrow is a separate, idempotent, re-runnable step keyed by
`(taxpayer, tax_period, run)`, so any step can be retried after a failure.

## 7. How a jurisdiction plugs in

A jurisdiction is delivered as:

1. **Data**: `tax_jurisdictions`, `tax_types`, `tax_rule_sets`,
   `tax_rule_versions` (DSL JSON), `tax_thresholds`, `tax_classifications`,
   default `tax_mappings`, `form_definitions` / `form_versions` / fields /
   mappings. Loaded from version-controlled rule packs
   (`apps/api/app/Jurisdictions/<Code>/rule-packs/*.json`) through an import
   command that creates *draft* versions for human publication.
2. **Registration schema**: which registration attributes matter
   (for PH: `vat_status` with `VAT_REGISTERED` / `NON_VAT`) and which
   calculation *path* each value selects. Paths are rule-set selectors, not
   `if` statements in services.
3. **Fixtures**: `fixtures/<jurisdiction>/scenario-*` golden tests.
4. **Optional code**: a `JurisdictionPack` class may register extra DSL
   functions or form renderers. It may not bypass the rule engine.

Nothing about the Philippines is hard-coded in the core. See
`docs/PHILIPPINE_TAX_IMPLEMENTATION.md` for what the PH module needs from the
domain expert.

## 8. The VAT / non-VAT decision (core acceptance behaviour)

Three separate concepts, stored separately:

| Concept | Where it lives | Who can change it |
|---------|----------------|-------------------|
| **Registered status** | `tax_registration_statuses` (effective-dated, with `status_source`, `source_document_id`, `last_verified_at`) | A human with `tax_profile.edit`, with reason, effective date and supporting document; audited |
| **Observed economic activity** | Derived per calculation run from canonical ledger (e.g. gross receipts for the look-back window defined by rule) | Nobody; it is computed |
| **Advisory threshold condition** | `threshold_evaluations` + an `exceptions` row of type `THRESHOLD_ADVISORY` | Computed; resolved by a reviewer |

The calculation engine selects its path from the **registered status effective
for the period**. The threshold monitor runs afterwards and can only create an
advisory exception, notify reviewers and write an audit event:
*"Threshold exception detected; taxpayer registration status unchanged."*
There is no code path from the calculation or threshold modules to the
registration write model; this is enforced by module boundaries and by the
critical acceptance test (`docs/TESTING.md` §Critical).

## 9. Multi-tenancy

- Shared database, shared schema, `organization_id` on every tenant-owned row.
- `TenantContext` (request-scoped singleton) is resolved from the authenticated
  user's active membership, never from input.
- `BelongsToOrganization` trait adds a global scope filtering by the current
  tenant and fills `organization_id` on create. Creating a tenant-owned record
  with no tenant context throws.
- Policies additionally check the record's `organization_id` against the
  context (defence in depth), and client-level assignments restrict preparers
  to their clients.
- Queue jobs carry `organization_id` explicitly and re-establish the context
  before running.
- Future hardening option: PostgreSQL row-level security using a
  `SET app.organization_id` per connection. The schema is designed to allow it.

## 10. Auditability

See `docs/AUDITABILITY.md`. Summary: `audit_logs` is append-only (a PostgreSQL
trigger rejects `UPDATE` and `DELETE`), every row carries actor, organisation,
entity, before/after, IP, user agent and a correlation ID shared with
structured logs and queued jobs.

## 11. Cross-cutting

- **Errors**: consistent JSON envelope
  `{ "error": { "code", "message", "correlation_id", "details" } }`; stack
  traces never reach clients.
- **Observability**: JSON logs with request ID, organisation, user, client,
  tax period, calculation ID, job ID, provider, duration, status. Sensitive
  values (TINs, amounts, tokens) are not logged.
- **Secrets**: environment only; OAuth tokens encrypted at rest with Laravel's
  encrypter (key rotation supported via `APP_PREVIOUS_KEYS`).
- **Performance**: server-side pagination/filtering everywhere; incremental
  sync; indexed tenant and period columns; virtualised grids.

## 12. Repository layout

```
apps/
  api/                  Laravel 13, PHP 8.4
    app/{Domain,Application,Infrastructure,Http,Jurisdictions}
    database/{migrations,seeders,factories}
    routes/api.php      /api/v1/*
    tests/{Unit,Feature,Golden}
  web/                  Next.js 16 App Router, React 19, TypeScript
    app/                routes (see docs/UI_ARCHITECTURE.md)
    components/ui       shadcn primitives (copy-and-own, vendored)
    components/reui     ReUI components (copy-and-own, vendored)
    components/app      platform components (AppShell, StatusBadge, ...)
    features/           feature modules (clients, integrations, ...)
    lib/                api client, auth/session, utils
    hooks/  types/
    scripts/vendor-reui.mjs
docs/                   architecture and domain documentation
fixtures/               accounting + golden tax fixtures (per jurisdiction)
docker/                 Dockerfiles, nginx, compose support files
docker-compose.yml
```
