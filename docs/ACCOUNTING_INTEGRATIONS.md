# Accounting integrations

Status: design (implementation in Phase 3).

## Provider abstraction

```php
interface AccountingProvider
{
    public function key(): ProviderKey;                       // XERO | QUICKBOOKS | SIMULATOR
    public function authorizationUrl(ConnectState $state): string;   // connect()
    public function handleCallback(CallbackRequest $r): TokenSet;
    public function disconnect(AccountingConnection $c): void;
    public function refreshToken(AccountingConnection $c): TokenSet;
    public function getOrganization(AccountingConnection $c): ProviderOrganization;
    public function getAccounts(AccountingConnection $c, SyncWindow $w): iterable;
    public function getContacts(...): iterable;
    public function getTaxRates(...): iterable;
    public function getInvoices(...): iterable;
    public function getBills(...): iterable;
    public function getPayments(...): iterable;
    public function getBankTransactions(...): iterable;
    public function getJournalEntries(...): iterable;
    public function getCreditNotes(...): iterable;
    public function getTrialBalance(..., CarbonImmutable $asAt): ProviderReport;
    public function getProfitAndLoss(..., DateRange $r): ProviderReport;
    public function getBalanceSheet(..., CarbonImmutable $asAt): ProviderReport;
    public function getTrackingCategories(...): iterable;
    public function getPeriods(...): iterable;
    public function handleWebhook(WebhookRequest $r): WebhookResult;
}
```

`sync()` is not on the provider: `SyncAccountingData` (application layer)
orchestrates any provider through the interface, so retry, cursor, rate-limit
and audit behaviour are written once.

Iterables yield `RawRecord` DTOs (`provider_record_id`, `payload`,
`source_updated_at`), paging lazily so memory stays flat for large ledgers.

## Pipeline

```
Provider API → Provider adapter → raw_* (verbatim JSONB, payload hash)
            → Normaliser (per provider × entity, pure function)
            → Canonical ledger (+ lineage columns, normalization_logs)
            → Tax engine (canonical only)
```

- Raw rows are insert-only per payload hash; an updated source record produces
  a new raw row, and the canonical row points to the latest.
- Normalisers are pure (`RawRecord → CanonicalRecord[] + warnings`) and unit
  tested with fixtures from both providers asserting identical canonical output
  for equivalent source data.

## OAuth and tokens

- OAuth2 authorisation code flow with PKCE where supported, `state` bound to
  user + organisation + client + nonce (stored server-side, single use).
- Access/refresh tokens stored with Laravel encrypted casts; never returned by
  any API resource; never sent to the browser.
- Proactive refresh before expiry under a Redis lock per connection; refresh
  failure moves the connection to `TOKEN_EXPIRED` and raises an exception +
  notification.
- Connection status: `CONNECTED`, `SYNCING`, `SYNCED`, `ERROR`,
  `DISCONNECTED`, `TOKEN_EXPIRED`.

## Sync behaviour

- Incremental: Xero `If-Modified-Since`, QBO Change Data Capture / `LastUpdatedTime`
  queries; cursor stored on the connection.
- Retries with exponential backoff and jitter on 429/5xx, honouring
  `Retry-After`; per-record errors stored in `accounting_sync_errors` without
  failing the whole run.
- Each run records API calls, counts (fetched / created / updated / failed),
  timings and a correlation ID shown in the Sync Centre.

## Simulator

When provider credentials are not configured, a `SimulatorProvider` reads
fixture payloads shaped like the real provider responses from `fixtures/`.
It is labelled **Simulator** in every UI surface and API resource, and cannot be
enabled in production (`APP_ENV=production` refuses it unless
`ALLOW_SIMULATOR=true` is set explicitly for demo deployments).
