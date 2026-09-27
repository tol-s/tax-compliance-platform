# Form engine

Status: design (implementation in Phase 7).

## Model

```
FormDefinition (code, jurisdiction, name)
  └ FormVersion (version, status, effective_from/to, template, page size, checksum)
      ├ FormSection
      │   └ FormField (key, label, type, format, required, position: page/x/y/w/h)
      └ FormMapping (field → source)
FormInstance (tax period, calculation run, form_version_id, status)
  └ FormValue (system_value, override_value, final_value, override_reason,
               overridden_by, provenance)
Document (generated PDF: form_instance_id, template version, generated_by,
          generated_at, sha256, storage path)
```

## Mapping sources

```json
{ "field": "field_identifier",
  "source": { "type": "calculation", "path": "vat.output_tax" },
  "format": "currency" }
```

Source types: `taxpayer`, `accounting`, `calculation`, `working_paper`,
`manual`, `derived` (a DSL expression over other fields). Resolution records
provenance per value: source type and path, calculation run ID, result/trace
IDs, contributing canonical records, and the rule version.

## Versioning

Each instance pins `form_version_id`. Regenerating a historical instance always
uses its pinned version; a newer template never re-renders old filings.

## Rendering

- Templates are HTML/CSS with absolutely positioned fields (millimetre units)
  over the official layout where legally appropriate.
- Deterministic: fixed fonts embedded, no current-time or random values in the
  output, locale-fixed number formatting; identical inputs produce an identical
  SHA-256.
- Rendered by headless Chromium (Gotenberg container or Browsershot) in a
  queued `GeneratePdf` job; stored in S3-compatible storage; served via
  short-lived signed URLs; downloads audited.

## Review UI

Three panes: form navigation (sections, required-missing markers) · preview ·
field details (value, source, calculation, rule, supporting records, last
modified, override status). Overrides require a reason and show
SYSTEM / OVERRIDE / REASON / USER / TIMESTAMP.

## Official BIR forms

No official BIR form schema is invented. Until the domain expert supplies field
lists, positions and mapping semantics, only a clearly labelled
**placeholder demo form** exists. See `docs/PHILIPPINE_TAX_IMPLEMENTATION.md`.
