# Philippine tax implementation

The Philippines is the first jurisdiction module. **No Philippine tax law is
encoded in this repository yet.** Rates, thresholds, classifications, effective
dates, BIR form schemas and test expectations will be supplied by the client's
domain expert and loaded through the rule and form engines.

## What the platform already assumes (structure only)

- Jurisdiction code `PH`, currency `PHP`.
- Taxpayer registration attribute `vat_status` with values `VAT_REGISTERED` and
  `NON_VAT`, sourced from `BIR_CERTIFICATE`, `USER_ENTERED` or
  `ADMIN_OVERRIDE`, effective-dated, with a supporting document reference.
- Two calculation paths selected by that registered status: a VAT path and a
  non-VAT / percentage-tax path. Their contents are rule data.
- A revenue registration threshold that can only produce an **advisory**.

## Required domain inputs

Each item below is tracked in code and in the rule admin UI with the marker
`PHILIPPINE_TAX_RULE_REQUIRED` / `DOMAIN_INPUT_REQUIRED`.

```
PHILIPPINE_TAX_RULE_REQUIRED:
- rule name
- source (legal citation / revenue regulation / BIR issuance)
- effective date (from / to)
- formula (inputs, operations, rounding scale and mode)
- threshold (amount, currency, measurement window, "approaching" ratio)
- applicable taxpayer type (registration status, entity type, other selectors)
- form mapping (form code, version, field identifiers, source paths)
```

| Area | Needed from domain expert |
|------|---------------------------|
| Tax types | Codes, names, filing frequencies for VAT and percentage tax (and any others in scope) |
| VAT path | Rate(s), taxable base definition, input/output tax treatment, zero-rated/exempt handling, rounding |
| Non-VAT path | Percentage tax rate(s) and base, effective dates, any rate changes over time |
| Registration threshold | Amount, measurement window (e.g. trailing 12 months vs calendar year), what counts as gross sales/receipts, "approaching" warning level |
| Classifications | Canonical list (taxable, exempt, zero-rated, out of scope, …) and default account mappings |
| Periods and deadlines | Monthly/quarterly periods and due-date rules |
| Forms | Applicable BIR forms per path, form versions, field lists, positions, mapping semantics, validation rules |
| Golden scenarios | Taxpayer profile + ledger fixture + expected results + expected form values for each scenario |

## Where inputs go

- Rule packs: `apps/api/app/Jurisdictions/Philippines/rule-packs/*.json`
  (imported as DRAFT versions, published after review).
- Form definitions: `apps/api/app/Jurisdictions/Philippines/forms/*`.
- Golden fixtures: `fixtures/philippines/scenario-NNN/`.

Until then, demo data uses clearly labelled placeholder values that are
visibly not real law (e.g. a demo threshold marked `DEMO VALUE, NOT BIR`).
