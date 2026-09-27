# Tax engine

Status: design (implementation in Phases 4-5).

## Model

```
TaxJurisdiction (PH)
  └ TaxType            (e.g. a VAT type, a percentage-tax type: codes supplied by domain expert)
      └ TaxRuleSet     selector: when does this set apply? (e.g. taxpayer.vat_status == NON_VAT)
          └ TaxRuleVersion  v1, v2 … effective_from / effective_to, DRAFT → PUBLISHED → RETIRED
              └ TaxRule     kind: CLASSIFY | CALCULATE | THRESHOLD | VALIDATE, definition = DSL JSON
TaxClassification     (taxable / exempt / zero-rated / … : codes supplied by domain expert)
TaxMapping            account → classification (DEFAULT or OVERRIDE with reason)
TaxThreshold          amount, window, approaching ratio, effective dates, source reference
TaxPeriod             client, tax type, period start/end, due date, workflow state
```

## Versioning rules

- Published versions are immutable (enforced in the model layer and by a DB
  trigger on `tax_rule_versions`/`tax_rules` rows whose version is `PUBLISHED`).
- Changing a rule means cloning to a new `DRAFT` version, editing, testing,
  publishing. Publication records `published_by`, `published_at`,
  `source_reference` (legal citation supplied by the domain expert) and a
  checksum of the canonical JSON.
- Resolution: for a tax period, the engine picks, per rule set, the published
  version whose `[effective_from, effective_to)` contains the period end
  (configurable per rule set if the domain expert specifies otherwise). The
  selected version ID is stored on the calculation run, so re-running a
  historical period is reproducible.

## Path selection (VAT vs non-VAT)

Rule sets carry a *selector* evaluated against the taxpayer's **registered**
status effective for the period:

```json
{ "field": "taxpayer.vat_status", "operator": "equals", "value": "NON_VAT" }
```

The engine never evaluates selectors against observed revenue. Observed revenue
feeds only `THRESHOLD` rules, whose only permitted outcome is an advisory.

## DSL

Structured JSON; parsed into an AST and evaluated by a closed set of node
types. There is no `eval`, no PHP callables from data, no string templating.

Conditions: `equals`, `not_equals`, `greater_than`, `greater_than_or_equal`,
`less_than`, `less_than_or_equal`, `in`, `not_in`, `and`, `or`, `not`.

Expressions: `add`, `subtract`, `multiply`, `divide`, `sum`, `percentage`,
`round` (mode + scale), `minimum`, `maximum`, plus references:

- `{"ref": "taxpayer.vat_status"}` context fields
- `{"param": "rate"}` rule-version parameters (the rate itself is data)
- `{"aggregate": "sum", "of": "lines.amount", "where": {...classification...}}`

```json
{
  "rule_code": "EXAMPLE_RULE",
  "kind": "CALCULATE",
  "conditions": [
    { "field": "taxpayer.vat_status", "operator": "equals", "value": "NON_VAT" }
  ],
  "parameters": {
    "rate": { "value": null, "DOMAIN_INPUT_REQUIRED": "PHILIPPINE_TAX_RULE_REQUIRED" }
  },
  "calculation": {
    "op": "round", "scale": 2, "mode": "HALF_UP",
    "args": [{ "op": "multiply", "args": [{ "ref": "bases.taxable_revenue" }, { "param": "rate" }] }]
  },
  "output": "percentage_tax.due"
}
```

A parameter with `value: null` and a `DOMAIN_INPUT_REQUIRED` marker cannot be
published; the publish action fails with a list of missing inputs, and the
admin UI shows them.

## Evaluation and lineage

Every node evaluation appends a `CalculationTrace` (`rule_id`, `source_type`,
`source_id`, `input_value`, `operation`, `output_value`, `metadata`,
`parent_trace_id`). Aggregates record which canonical records contributed.
Result: the drill-down *tax amount → rule → formula → classification →
canonical records → raw provider payload* is a tree walk, not a reconstruction.

## Arithmetic

`brick/math` `BigDecimal` throughout; scale and rounding mode are explicit on
every `round`/`divide` node. Floats are rejected by the DSL validator.

## Adjustments

Adjustments never overwrite. `calculation_results` holds `system_value`,
`adjustment_value`, `final_value`; each adjustment is an append-only
`calculation_adjustments` row with reason, user and timestamp. Finalised runs
reject adjustments; a new run version (`supersedes_id`) is created instead.

## Testing

Rule test harness (`rule_test_scenarios`): taxpayer profile + accounting
fixture + period → expected classifications, results and form values; UI shows
Expected / Actual / Difference / PASS-FAIL. Golden fixtures in
`fixtures/<jurisdiction>/scenario-*` run in CI.
