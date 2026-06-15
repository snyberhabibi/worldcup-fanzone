# Testing

Five layers, each catching a different class of regression. Unit + integration
need no infrastructure (Supabase/SMS/Slack are mocked) and run in CI on every
push. E2E, smoke, and load run against a deployed preview/prod.

| Layer | Tool | What it guards | Command |
|---|---|---|---|
| **Unit** | Vitest (node) | Pure logic — phone/name format, slot/voting window, cache TTL + singleflight, count-up | `pnpm test:unit` |
| **Integration** | Vitest (node, mocked) | Route behavior — vote SMS-gating, raffle dedup, session auth, tally/entrants masking, mirror | `pnpm test:integration` |
| **Hook** | Vitest (jsdom) | `useCountUp` monotonic board counter | (runs with unit) |
| **E2E** | Playwright | Real user flows — launcher nav, fan vote, board, staff PIN nav | `pnpm test:e2e` |
| **Smoke** | Node script | Post-deploy health — endpoints + pages return 200 + shape | `pnpm test:smoke [url]` |
| **Load** | Node script | Concurrent signups don't drop votes (20→500) | `pnpm test:load <url> ladder` |

## Quick start

```bash
pnpm test            # all unit + integration (fast, no infra)
pnpm test:coverage   # + coverage report (src/lib, src/app/api)
pnpm test:watch      # watch mode while developing
```

## E2E (Playwright)

Specs **stub `/api/*` via `page.route`**, so no real votes are written — safe to
point at production.

```bash
# Against a deployed preview/prod:
E2E_BASE_URL=https://fifa.yallabites.com pnpm test:e2e

# Against a local dev server (auto-booted):
pnpm test:e2e
```

First run may prompt for browsers: `pnpm exec playwright install chromium`.

## Smoke (post-deploy health)

```bash
pnpm test:smoke https://fifa.yallabites.com   # read-only; exits non-zero on any failure
```

## Load (concurrency)

Uses reserved **555** numbers on **match 104** (the Final — never shown on the
live board, and 555 numbers fire no SMS/Slack), so it's safe against prod. It
leaves synthetic rows behind — clear them with `delete from votes where match_id = 104;`.

```bash
pnpm test:load https://fifa.yallabites.com 300        # single 300-burst
pnpm test:load https://fifa.yallabites.com ladder     # 20,30,50,100,200,300,500
```

## How integration tests mock

Route tests mock `@/lib/db` (Supabase), `@/lib/quo` (SMS), `@/lib/slack`,
`@/lib/cache`, and `@/lib/auth`/`@/lib/ratelimit` where used; they partially mock
`next/server` to **capture `after()` callbacks** so the post-response SMS/CRM
side effects can be asserted. `@/lib/format` is used real (it's pure). See
`tests/integration/vote.route.test.ts` for the canonical pattern and
`tests/unit/format.test.ts` for the unit pattern.

## Continuous integration

`pnpm lint` + `pnpm test:coverage` (unit + integration — no secrets, Supabase/SMS/
Slack mocked) should run on every push. Add the workflow via the GitHub UI
(**Add file → Create new file → `.github/workflows/test.yml`**, which uses your
account's `workflow` scope) — automated tooling can't commit it. Contents:

```yaml
name: tests
on:
  push:
    branches: [main]
  pull_request:
jobs:
  unit-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test:coverage
```

E2E, smoke, and load run against a deployed preview/prod, not in this job.
