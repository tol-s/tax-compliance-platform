# Auditability and traceability

## Audit log

Table `audit_logs` (implemented in Phase 1):

| Column | Notes |
|--------|-------|
| `id` | UUIDv7 (time ordered) |
| `organization_id` | nullable only for pre-tenant events (e.g. failed login) |
| `actor_type`, `actor_id` | `user`, `system`, `job` |
| `action` | dotted verb, e.g. `auth.login`, `client.created`, `registration_status.changed`, `calculation.finalized` |
| `entity_type`, `entity_id` | subject of the action |
| `before`, `after` | JSONB snapshots of changed attributes (secrets redacted) |
| `ip`, `user_agent` | for interactive actions |
| `correlation_id` | shared with structured logs and dispatched jobs |
| `metadata` | JSONB extra context |
| `created_at` | set by the database |

**Append-only enforcement**: a PostgreSQL trigger raises on `UPDATE` or
`DELETE` of `audit_logs`, so even application bugs or ad-hoc SQL through the
app role cannot rewrite history. The Eloquent model also refuses updates and
deletes.

Writing: `App\Application\Audit\AuditLogger::record(action, entity, before, after, metadata)`.
The logger reads actor, organisation, IP, user agent and correlation ID from
the current request/job context; call sites never pass them.

Redaction: attributes listed in `AuditLogger::REDACTED` (passwords, tokens,
secrets) are replaced with `"[redacted]"` before persisting.

## Audited actions

Login (success and failure), logout, organisation switch, client create/update,
registration status changes, accounting connection/disconnection, sync runs,
classification overrides, rule publication, calculation runs, adjustments,
exception lifecycle, form generation and overrides, approvals, finalisation,
document downloads.

## Correlation

`X-Correlation-ID` is accepted from the BFF (or generated), echoed on the
response, attached to the log context, stored on audit rows and propagated to
queued jobs so a whole workflow can be reconstructed across processes.

## Calculation lineage

See `docs/TAX_ENGINE.md`: every result links to traces, rule version,
classification and the canonical and raw records that produced it; form values
carry provenance back to those results.

## Immutability

- Published rule versions: immutable.
- Finalised calculation runs: immutable; changes create a new version.
- Generated documents: content-addressed by SHA-256.
- Registration statuses: effective-dated rows, never edited in place.
