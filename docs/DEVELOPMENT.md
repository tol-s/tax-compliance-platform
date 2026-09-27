# Development

## Conventions

**Backend (apps/api)**
- Put code in the right layer: `Domain` (models, enums, rules, no HTTP),
  `Application` (actions/use cases, transactions, audit), `Infrastructure`
  (provider clients, PDF, storage), `Http` (thin controllers, FormRequests,
  Resources). Controllers contain no tax logic.
- Every tenant-owned model uses `BelongsToOrganization`. Never accept
  `organization_id` from a request.
- Every state change that matters calls `AuditLogger::record()` inside the same
  transaction.
- New permissions: add to the `Permission` enum, grant in `SystemRole`, run
  `php artisan rbac:sync`, update the RBAC matrix test expectations.
- Money is never a float. Use `NUMERIC` columns and `brick/math` (Phase 4).
- Missing domain input is a visible `DOMAIN_INPUT_REQUIRED` marker, never a guess.
- Style: Pint (`composer lint`). Static analysis: Larastan (`composer analyse`).

**Frontend (apps/web)**
- Next.js 16: `middleware` is now `proxy.ts`; `params`/`searchParams`/`cookies()`
  are async. Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Server components fetch through `lib/api/server.ts` (`apiFetch`). Client
  components fetch through the BFF (`lib/api/client.ts` → `/api/bff/*`) with
  TanStack Query. Never call Laravel directly from the browser.
- Use `components/app/*` for recurring patterns (PageHeader, StatusBadge,
  EmptyState, ErrorState, LoadingState, SectionCard). Do not duplicate them.
- No fabricated data: when there is nothing to show, render an `EmptyState`
  that says what unlocks it.
- No tax calculation logic in React.
- Style: Prettier (`.prettierrc.json`), ESLint.

## ReUI / shadcn components

Components are copy-and-own under `components/ui` (shadcn, radix base, Nova
style) and `components/reui` (ReUI). The public registries were unreachable
from the build environment, so they were vendored from the ReUI source:

```bash
git clone --depth 1 https://github.com/keenthemes/reui /tmp/reui
pnpm vendor:reui /tmp/reui            # adds missing components only
pnpm vendor:reui /tmp/reui --force    # re-sync (review the diff!)
```

The script inlines `cn-*` style tokens from ReUI's `style-nova.css`, rewrites
registry imports to `@/components/...`, and swaps icon placeholders for
`lucide-react`. Where the shadcn CLI and registry are reachable, `npx shadcn add
@reui/<name>` is equivalent. Vendored folders are excluded from Prettier and
from the React Compiler lint rules to keep them diffable against upstream.

## Useful commands

```bash
php artisan rbac:sync
php artisan organization:create "Firm" --owner-email=a@b.c --owner-name="A B"
DEMO_MODE=true php artisan db:seed --class=DemoSeeder
php artisan migrate:fresh --seed
pnpm typecheck && pnpm lint && pnpm test
```
