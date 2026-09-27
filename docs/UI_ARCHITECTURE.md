# UI architecture, information architecture and design system

## 1. Information architecture

Primary navigation (sidebar), grouped by job to be done:

```
Workspace
  Dashboard                 /dashboard
  Clients                   /clients
    └ Client workspace      /clients/[id]/{overview, accounting, tax-profile,
                             tax-periods, calculations, working-papers, forms,
                             exceptions, audit-log}
  Reports                   /reports
Data
  Integrations              /integrations  (/xero, /quickbooks)
Tax configuration   (tax_rules.view)
  Tax engine                /tax-engine  (/rules, /versions, /test-scenarios)
  Forms                     /forms       (/templates, /versions)
Administration      (settings.manage)
  Organisation              /settings/organization
  Users                     /settings/users
  Roles                     /settings/roles
  Integrations              /settings/integrations
  Audit                     /settings/audit
/organizations              organisation switcher / list (multi-org users)
```

Global chrome:
- **TopBar**: breadcrumb, organisation switcher, `Cmd/Ctrl+K` search, notifications,
  user menu.
- **Command palette** (`cmdk` via shadcn Command): navigation now; clients, periods,
  calculations, forms, exceptions as those APIs land.

### Every screen answers "what do I do next?"

Each page uses `PageHeader` with: title, context line, status, and **one**
primary action. Empty states name the precondition and link to the step that
unblocks it (e.g. "Connect an accounting system to import data").

### Progressive disclosure for tax numbers

Summary (amount + status) → Details (formula, rule version, classification) →
Evidence (canonical records → original provider payload).

## 2. ReUI / shadcn component strategy

The shadcn and ReUI registries are copy-and-own; source lives in the repo:

- `components/ui/*`: shadcn primitives (radix base, Nova style), vendored with
  `scripts/vendor-reui.mjs` which reproduces the shadcn CLI transform (the
  registry hosts are not reachable from every build environment).
- `components/reui/*`: ReUI components (Data Grid, Filters, Stepper, Timeline,
  Badge, Alert, Date Selector, Frame, Number Field, Cascader).
- `components/app/*`: platform components composed from the above. Pages use
  these, never raw primitives for recurring patterns.

| Need | Source component |
|------|------------------|
| App shell, sidebar, navigation | shadcn `sidebar`, `breadcrumb`, `dropdown-menu` |
| Data grid (accounting explorer, clients, sync history, working papers) | ReUI `data-grid` (+ virtual table, pagination, column visibility) |
| Filters, saved filters | ReUI `filters` |
| Forms | shadcn `field`, `input`, `select`, `textarea`, `switch` + React Hook Form + Zod |
| Wizards (client onboarding, tax period workflow) | ReUI `stepper` |
| Audit/registration history | ReUI `timeline` |
| Status indicators | ReUI `badge` (light variants) wrapped by `StatusBadge` |
| Exceptions / advisories | ReUI `alert` wrapped by `ExceptionPanel` |
| Dialogs, drawers, sheets | shadcn `dialog`, `alert-dialog`, `drawer`, `sheet` |
| Tabs (client workspace) | shadcn `tabs` |
| Command palette | shadcn `command` |
| Date selectors | ReUI `date-selector`, shadcn `calendar` |
| File upload | ReUI `use-file-upload` hook |
| Toasts | shadcn `sonner` |
| Charts | shadcn `chart` (Recharts); only with real data |
| Loading | shadcn `skeleton`, `spinner` |
| Empty states | shadcn `empty` wrapped by `EmptyState` |

## 3. Design system

Tokens live in `apps/web/app/globals.css` as CSS variables mapped into Tailwind
v4 `@theme`.

- **Colour**: neutral cool-grey foundation, ink-blue primary
  (`oklch(0.36 0.08 257)`), semantic statuses `success`, `warning`, `info`,
  `destructive`, plus `neutral` (muted). No gradients, no glass, no neon.
- **Typography**: Inter (UI), IBM Plex Mono (identifiers, source IDs);
  tabular numerals for every money column (`[data-numeric]`, `.tabular`).
- **Radius**: 8px base; cards `radius-lg`, controls `radius-md`.
- **Density**: 32px controls, 36px table rows by default; compact grid option.
- **Borders over shadows**: 1px `border` tokens; shadows only on overlays.
- **Motion**: 150-200ms opacity/translate for overlays and state changes;
  respects `prefers-reduced-motion`.

### Status language

| Status | Tone |
|--------|------|
| READY, SYNCED, APPROVED | success |
| REVIEW REQUIRED, APPROACHING THRESHOLD, TOKEN EXPIRED | warning |
| EXCEPTION, ERROR, FAILED, CROSSED THRESHOLD | destructive |
| CALCULATING, SYNCING, IN PROGRESS | info |
| FINALIZED | invert (solid, "locked") |
| DRAFT, OPEN, DISCONNECTED | neutral |

`StatusBadge` maps every domain enum to a tone and label in one place
(`components/app/status-badge.tsx`), so the whole product speaks one status
language.

## 4. Accessibility

Radix primitives provide focus management and ARIA; we add: visible focus
rings via tokens, skip-to-content link, landmark roles (`nav`, `main`), labelled
icon buttons, `aria-live` for job progress, table captions, and 4.5:1 contrast
for text tokens in both themes.

## 5. Responsive

Desktop first. Sidebar collapses to icons at `md` and to a sheet on mobile.
Mobile supports dashboard, client overview, notifications, exceptions and
approvals; wide grids scroll horizontally or switch to card lists.
