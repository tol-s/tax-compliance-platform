# Security

The platform processes financial and tax data for multiple firms. Controls are
listed with their implementation status.

## Authentication ✅

- Laravel Sanctum personal access tokens, **expiring** (`SANCTUM_EXPIRATION`,
  default 480 minutes), revoked on logout.
- Tokens live only on the Next.js server: the BFF stores the token inside an
  **encrypted** (JWE `dir` + A256GCM) **httpOnly**, `SameSite=Lax`, `Secure`
  (in production) cookie. Browser JavaScript never sees an API credential.
- Passwords hashed with bcrypt (Laravel `hashed` cast).
- Login rate limited: 5/min per email+IP, 30/min per IP. Failures are audited
  with a SHA-256 of the email, never the email or password.
- Constant-time behaviour for unknown emails (dummy hash check); identical
  error for unknown email and wrong password.
- **MFA-ready**: `users.mfa_secret` (encrypted cast) and `mfa_enabled_at`
  exist; TOTP enrolment and enforcement are scheduled for Phase 10.

## Authorisation ✅

- RBAC: permission catalogue (`App\Domain\Identity\Enums\Permission`) and
  system roles (`SystemRole`), synchronised to the database by `rbac:sync`.
- `Gate::before` resolves permission abilities through the user's **active
  membership in the current tenant**. No tenant, suspended membership, or a role
  from another organisation all resolve to *deny*.
- Segregation of duties: preparers cannot approve; reviewers cannot run
  calculations.
- ✅ Client-level visibility: roles without `sees_all_clients` only see
  assigned clients (`client_user`); others' clients answer 404.
- UI hides what a user cannot do, but **the API re-checks every action**.

## Tenant isolation ✅

- `organization_id` on every tenant-owned row; `BelongsToOrganization` global
  scope **fails closed** (throws without a tenant context) and overwrites any
  caller-supplied `organization_id` on create; cross-tenant moves are refused.
- Tenant is resolved from the authenticated membership, never from input
  (tested with spoofed query parameters and headers).
- Future option: PostgreSQL row-level security as a second layer.

## Transport, headers, CSRF ✅

- API: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
  restrictive CSP for JSON, HSTS on HTTPS, `Cache-Control: no-store` for
  authenticated responses.
- Web: `nosniff`, `DENY` framing, referrer policy, permissions policy, no
  `X-Powered-By`.
- CSRF: server actions have Next.js origin checks; the BFF rejects mutating
  requests whose `Origin` is not the app's own origin; cookies are `SameSite=Lax`.
- BFF forwards only an allow-list of request/response headers (no cookies to
  the API, no `Set-Cookie` back), rejects path traversal.

## Data protection

- ✅ Encrypted casts for secrets (MFA secret now; OAuth tokens in Phase 3).
- ✅ Audit snapshots redact passwords, tokens and secrets (recursive).
- ✅ Error responses never include stack traces, SQL or internal messages;
  each carries a correlation ID linking to server logs.
- ✅ Structured JSON logs; policy: no TINs, amounts, tokens or personal data in logs.
- ✅ Taxpayer identifiers encrypted at rest, matched through an HMAC blind
  index (`BLIND_INDEX_KEY`; keep it stable, changing it requires re-indexing),
  masked in audit rows and for users without `tax_profile.view`.
- ✅ Documents on a private disk under random keys, type/size validated,
  SHA-256 recorded, served only through the authorised endpoint (proxied by the
  BFF), every download audited.
- ✅ New members get a random temporary password shown once to the
  administrator; it is never logged or written to the audit trail.

## Secrets

- Only environment variables; `.env` files are git-ignored; `.env.example`
  files contain no secrets.
- `APP_KEY` rotation supported via `APP_PREVIOUS_KEYS`.

## Demo safety ✅

- Demo data seeds only with `DEMO_MODE=true` **and** a non-production
  environment; the demo organisation is flagged `is_demo` and the UI shows a
  persistent "staging data" banner.

## Reporting a vulnerability

Report privately to the platform operator's security contact; do not open a
public issue.
