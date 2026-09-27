/**
 * Design-preview content for staging organisations only.
 *
 * These screens belong to modules that are not built yet (integrations, tax
 * engine, calculations, forms, reports). The preview shows how they will look,
 * using sample records generated deterministically from a seed. It never
 * contains a Philippine tax rate, threshold, due-date rule or BIR form field:
 * wherever one would appear, the value reads "Set by tax expert", exactly as
 * the real rule engine will require. Amounts are illustrative and are not
 * derived from any rate.
 */

export const EXPERT_INPUT = "Set by tax expert"

/** Small deterministic PRNG so every page shows the same sample data on each visit. */
export function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

const between = (rand: () => number, min: number, max: number) => Math.round(min + rand() * (max - min))
const pick = <T>(rand: () => number, items: readonly T[]) => items[Math.floor(rand() * items.length)]

export const peso = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(value)

/* ------------------------------------------------------------------ periods */

export const QUARTERS = [
  { key: "2025-Q4", label: "Oct to Dec 2025", end: "2025-12-31", due: "2026-01-31" },
  { key: "2026-Q1", label: "Jan to Mar 2026", end: "2026-03-31", due: "2026-04-30" },
  { key: "2026-Q2", label: "Apr to Jun 2026", end: "2026-06-30", due: "2026-07-31" },
  { key: "2026-Q3", label: "Jul to Sep 2026", end: "2026-09-30", due: "2026-10-31" },
] as const

const PERIOD_FLOW = ["FINALIZED", "FINALIZED", "APPROVED", "REVIEW_REQUIRED"] as const

export interface SamplePeriod {
  key: string
  label: string
  taxType: string
  status: string
  due: string
  sales: number
  purchases: number
  taxDue: number
  exceptions: number
  version: number
}

export function taxTypeFor(vatRegistered: boolean) {
  return vatRegistered ? "Value-added tax" : "Non-VAT business tax"
}

export function samplePeriods(seed: string, vatRegistered: boolean): SamplePeriod[] {
  const rand = seeded(seed)
  const scale = between(rand, 4, 40) * 100_000
  return QUARTERS.map((q, index) => {
    const sales = Math.round(scale * (0.8 + rand() * 0.5))
    const purchases = Math.round(sales * (0.35 + rand() * 0.3))
    const status =
      index === QUARTERS.length - 1
        ? pick(rand, ["REVIEW_REQUIRED", "CALCULATED", "EXCEPTIONS", "DATA_READY"])
        : PERIOD_FLOW[index]
    return {
      key: q.key,
      label: q.label,
      taxType: taxTypeFor(vatRegistered),
      status,
      due: q.due,
      sales,
      purchases,
      // Illustrative only: deliberately not a fixed share of sales, so no rate is implied.
      taxDue: Math.round((sales - purchases) * (0.05 + rand() * 0.12)),
      exceptions: status === "EXCEPTIONS" ? between(rand, 2, 5) : status === "REVIEW_REQUIRED" ? 1 : 0,
      version: status === "FINALIZED" ? between(rand, 1, 3) : 1,
    }
  })
}

/* -------------------------------------------------------------- integrations */

export interface SampleConnection {
  clientId: string
  clientName: string
  provider: "XERO" | "QUICKBOOKS"
  externalName: string
  status: string
  lastSync: string
  records: number
  errors: number
}

export function sampleConnections(
  clients: { id: string; legal_name: string; trade_name: string | null }[]
): SampleConnection[] {
  return clients.map((client, index) => {
    const rand = seeded(client.id)
    const status = pick(rand, ["SYNCED", "SYNCED", "SYNCED", "SYNCED", "ERROR", "TOKEN_EXPIRED", "SYNCING"])
    return {
      clientId: client.id,
      clientName: client.legal_name,
      provider: index % 3 === 1 ? "QUICKBOOKS" : "XERO",
      externalName: `${client.trade_name ?? client.legal_name} (sample ledger)`,
      status,
      lastSync: `2026-09-${String(between(rand, 18, 26)).padStart(2, "0")}T0${between(rand, 1, 9)}:${String(between(rand, 10, 59))}:00+08:00`,
      records: between(rand, 800, 12_000),
      errors: status === "ERROR" ? between(rand, 1, 14) : 0,
    }
  })
}

export const SYNC_ENTITIES = [
  "Accounts",
  "Contacts",
  "Invoices",
  "Bills",
  "Payments",
  "Journal entries",
  "Bank transactions",
] as const

export function sampleSyncRuns(seed: string) {
  const rand = seeded(seed)
  return Array.from({ length: 8 }, (_, i) => {
    const failed = rand() < 0.15
    return {
      id: `run-${i}`,
      started: `2026-09-${String(26 - i * 2).padStart(2, "0")}T0${between(rand, 1, 8)}:${String(between(rand, 10, 59))}:00+08:00`,
      trigger: i % 3 === 0 ? "Manual" : "Scheduled",
      status: failed ? "FAILED" : "SYNCED",
      fetched: between(rand, 40, 900),
      created: between(rand, 5, 120),
      updated: between(rand, 0, 60),
      failed: failed ? between(rand, 1, 12) : 0,
      duration: `${between(rand, 8, 95)}s`,
    }
  })
}

/* --------------------------------------------------------------- tax engine */

export const RULE_SETS = [
  {
    code: "VAT-SALES",
    name: "VAT on sales",
    taxType: "Value-added tax",
    selector: "taxpayer.vat_status = VAT_REGISTERED",
    published: 3,
    draft: 4,
    rules: 12,
  },
  {
    code: "VAT-INPUT",
    name: "Input tax credits",
    taxType: "Value-added tax",
    selector: "taxpayer.vat_status = VAT_REGISTERED",
    published: 2,
    draft: 3,
    rules: 9,
  },
  {
    code: "NONVAT-GROSS",
    name: "Gross receipts, non-VAT",
    taxType: "Non-VAT business tax",
    selector: "taxpayer.vat_status = NON_VAT",
    published: 2,
    draft: null,
    rules: 6,
  },
  {
    code: "WHT-EXPANDED",
    name: "Expanded withholding",
    taxType: "Withholding tax",
    selector: "always",
    published: 1,
    draft: 2,
    rules: 14,
  },
  {
    code: "THRESHOLD-VAT",
    name: "Registration threshold advisory",
    taxType: "Advisory",
    selector: "taxpayer.vat_status = NON_VAT",
    published: 1,
    draft: null,
    rules: 2,
  },
] as const

export const RULES = [
  {
    code: "CLS-001",
    set: "VAT-SALES",
    kind: "CLASSIFY",
    name: "Classify sales accounts by tax code",
    definition: { when: { "account.type": "REVENUE" }, classify_as: "mapping.classification" },
  },
  {
    code: "CLS-002",
    set: "VAT-SALES",
    kind: "CLASSIFY",
    name: "Zero-rated export sales",
    definition: { when: { "line.tax_code": "mapping.zero_rated_codes" }, classify_as: "ZERO_RATED_SALES" },
  },
  {
    code: "CAL-001",
    set: "VAT-SALES",
    kind: "CALCULATE",
    name: "Output tax on taxable sales",
    definition: {
      base: "sum(classification.TAXABLE_SALES.net)",
      rate: "DOMAIN_INPUT_REQUIRED",
      round: "DOMAIN_INPUT_REQUIRED",
    },
  },
  {
    code: "CAL-002",
    set: "VAT-INPUT",
    kind: "CALCULATE",
    name: "Creditable input tax on purchases",
    definition: { base: "sum(classification.CREDITABLE_PURCHASES.net)", rate: "DOMAIN_INPUT_REQUIRED" },
  },
  {
    code: "VAL-001",
    set: "VAT-INPUT",
    kind: "VALIDATE",
    name: "Input tax requires supplier TIN",
    definition: { require: "contact.taxpayer_identifier", severity: "WARNING" },
  },
  {
    code: "CAL-010",
    set: "NONVAT-GROSS",
    kind: "CALCULATE",
    name: "Tax on gross receipts",
    definition: { base: "sum(classification.GROSS_RECEIPTS.net)", rate: "DOMAIN_INPUT_REQUIRED" },
  },
  {
    code: "THR-001",
    set: "THRESHOLD-VAT",
    kind: "THRESHOLD",
    name: "Rolling turnover advisory",
    definition: {
      measure: "sum(sales.net, window)",
      window: "DOMAIN_INPUT_REQUIRED",
      threshold: "DOMAIN_INPUT_REQUIRED",
      outcome: "ADVISORY_ONLY",
    },
  },
  {
    code: "CAL-020",
    set: "WHT-EXPANDED",
    kind: "CALCULATE",
    name: "Withholding on professional fees",
    definition: { base: "sum(classification.PROFESSIONAL_FEES.gross)", rate: "DOMAIN_INPUT_REQUIRED" },
  },
] as const

export const RULE_VERSIONS = [
  {
    set: "VAT-SALES",
    version: 4,
    status: "DRAFT",
    effective: EXPERT_INPUT,
    published: null,
    by: null,
    source: "Awaiting expert review",
  },
  {
    set: "VAT-SALES",
    version: 3,
    status: "PUBLISHED",
    effective: "2026-01-01",
    published: "2025-12-18",
    by: "Ana Cruz",
    source: "Expert pack 2026-01 (sample)",
  },
  {
    set: "VAT-SALES",
    version: 2,
    status: "RETIRED",
    effective: "2025-07-01",
    published: "2025-06-20",
    by: "Ana Cruz",
    source: "Expert pack 2025-07 (sample)",
  },
  {
    set: "VAT-INPUT",
    version: 3,
    status: "DRAFT",
    effective: EXPERT_INPUT,
    published: null,
    by: null,
    source: "Awaiting expert review",
  },
  {
    set: "VAT-INPUT",
    version: 2,
    status: "PUBLISHED",
    effective: "2026-01-01",
    published: "2025-12-18",
    by: "Ana Cruz",
    source: "Expert pack 2026-01 (sample)",
  },
  {
    set: "NONVAT-GROSS",
    version: 2,
    status: "PUBLISHED",
    effective: "2026-01-01",
    published: "2025-12-19",
    by: "Jose Reyes",
    source: "Expert pack 2026-01 (sample)",
  },
  {
    set: "WHT-EXPANDED",
    version: 2,
    status: "DRAFT",
    effective: EXPERT_INPUT,
    published: null,
    by: null,
    source: "Awaiting expert review",
  },
  {
    set: "WHT-EXPANDED",
    version: 1,
    status: "PUBLISHED",
    effective: "2026-01-01",
    published: "2025-12-20",
    by: "Jose Reyes",
    source: "Expert pack 2026-01 (sample)",
  },
  {
    set: "THRESHOLD-VAT",
    version: 1,
    status: "PUBLISHED",
    effective: "2026-01-01",
    published: "2025-12-20",
    by: "Jose Reyes",
    source: "Expert pack 2026-01 (sample)",
  },
] as const

export const TEST_SCENARIOS = [
  {
    name: "VAT-registered trader, mixed sales",
    set: "VAT-SALES",
    version: 4,
    lastRun: "2026-09-24",
    status: "PASSED",
    assertions: 18,
  },
  {
    name: "Zero-rated exporter",
    set: "VAT-SALES",
    version: 4,
    lastRun: "2026-09-24",
    status: "PASSED",
    assertions: 11,
  },
  {
    name: "Purchases without supplier TIN",
    set: "VAT-INPUT",
    version: 3,
    lastRun: "2026-09-23",
    status: "FAILED",
    assertions: 9,
  },
  {
    name: "Non-VAT service provider",
    set: "NONVAT-GROSS",
    version: 2,
    lastRun: "2026-09-20",
    status: "PASSED",
    assertions: 7,
  },
  {
    name: "Turnover close to advisory threshold",
    set: "THRESHOLD-VAT",
    version: 1,
    lastRun: "2026-09-20",
    status: "PASSED",
    assertions: 5,
  },
  {
    name: "Professional fees with withholding",
    set: "WHT-EXPANDED",
    version: 2,
    lastRun: "2026-09-19",
    status: "PENDING",
    assertions: 12,
  },
] as const

export const CLASSIFICATIONS = [
  "Taxable sales",
  "Zero-rated sales",
  "Exempt sales",
  "Creditable purchases",
  "Non-creditable purchases",
  "Gross receipts",
  "Professional fees",
  "Capital goods",
] as const

/* -------------------------------------------------------------------- forms */

export const FORM_DEFINITIONS = [
  {
    code: "SAMPLE-QVAT",
    name: "Quarterly VAT return",
    frequency: "Quarterly",
    taxType: "Value-added tax",
    version: 3,
    status: "PUBLISHED",
    fields: 42,
  },
  {
    code: "SAMPLE-MWHT",
    name: "Monthly withholding remittance",
    frequency: "Monthly",
    taxType: "Withholding tax",
    version: 2,
    status: "PUBLISHED",
    fields: 27,
  },
  {
    code: "SAMPLE-QPT",
    name: "Quarterly non-VAT business tax return",
    frequency: "Quarterly",
    taxType: "Non-VAT business tax",
    version: 2,
    status: "PUBLISHED",
    fields: 19,
  },
  {
    code: "SAMPLE-AITR",
    name: "Annual income tax return",
    frequency: "Annual",
    taxType: "Income tax",
    version: 1,
    status: "DRAFT",
    fields: 64,
  },
] as const

export const FORM_SECTIONS = [
  {
    title: "Part I · Taxpayer information",
    fields: [
      ["Taxpayer identification number", "client.taxpayer_identifier"],
      ["Registered name", "client.legal_name"],
      ["Registered address", "profile.business_address"],
      ["Revenue district office", "profile.registration_information.rdo_code"],
      ["Period covered", "tax_period.period_start … period_end"],
    ],
  },
  {
    title: "Part II · Computation",
    fields: [
      ["Line A · Total sales", "calculation.results.TOTAL_SALES"],
      ["Line B · Taxable base", "calculation.results.TAXABLE_BASE"],
      ["Line C · Tax on base", "calculation.results.TAX_ON_BASE"],
      ["Line D · Allowable credits", "calculation.results.CREDITS"],
      ["Line E · Tax payable", "calculation.results.TAX_PAYABLE"],
    ],
  },
  {
    title: "Part III · Declaration",
    fields: [
      ["Signatory", "form.approved_by.name"],
      ["Date approved", "form.approved_at"],
    ],
  },
] as const

/* --------------------------------------------------------------- exceptions */

export const EXCEPTION_TEMPLATES = [
  {
    type: "UNMAPPED_ACCOUNT",
    severity: "ERROR",
    title: "Unmapped revenue account",
    description: "Account 4105 Other income has transactions but no tax classification.",
  },
  {
    type: "MISSING_TAX_CODE",
    severity: "WARNING",
    title: "Invoices without a tax code",
    description: "3 sales invoices in the period have no tax code in the ledger.",
  },
  {
    type: "SUPPLIER_TIN",
    severity: "WARNING",
    title: "Purchases without supplier TIN",
    description: "Input credits on 5 bills cannot be supported without the supplier's TIN.",
  },
  {
    type: "SYNC_GAP",
    severity: "CRITICAL",
    title: "Accounting data incomplete",
    description: "The last sync failed; bank transactions after 18 Sep are missing.",
  },
  {
    type: "THRESHOLD",
    severity: "INFO",
    title: "Turnover advisory",
    description:
      "Rolling turnover is approaching the configured advisory threshold. Registration status is not changed automatically.",
  },
  {
    type: "VARIANCE",
    severity: "WARNING",
    title: "Unusual movement",
    description: "Taxable sales are 38% higher than the average of the previous three periods.",
  },
] as const
