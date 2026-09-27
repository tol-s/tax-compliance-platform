# Fixtures

Accounting and golden tax fixtures, grouped by jurisdiction.

```
fixtures/
  philippines/
    scenario-001/
      taxpayer.json          taxpayer profile + registration (vat_status, source, effective dates)
      accounting/xero/*.json provider-shaped payloads (also used by the simulator provider)
      accounting/qbo/*.json
      period.json            tax period under test
      expected.json          expected classifications, calculation results and form values
```

**No scenario contains real Philippine tax values yet.** Rates, thresholds and
expected results must come from the domain expert (see
`docs/PHILIPPINE_TAX_IMPLEMENTATION.md`). Until then, scenario files use
`"DOMAIN_INPUT_REQUIRED"` markers, and the golden test runner (Phase 4) reports
such scenarios as *pending*, never as passing.
