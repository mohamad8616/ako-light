# Project memory — Home form (ako-light-cline)

Curated, cross-session notes. Daily detail lives in `YYYY-MM-DD.md`.

## Stack facts that surprise

- **Next.js 16.2** — see `AGENTS.md`. The bundled docs at
  `node_modules/next/dist/docs/` are the authority; APIs differ from older
  training data. `instrumentation.ts` (root, `export function register()`) is
  still the file convention and runs ONCE per server process before it serves
  requests — this is where the env preflight lives.
- **Prisma 7** with `@prisma/adapter-pg`; generated client is at
  `@/generated/prisma/client` (not `@prisma/client`). `Decimal` columns need
  `.toNumber()`.
- **React Compiler is ON** (`next.config.ts`).
- UI is **shadcn/ui + Tailwind**. Never Material UI or Bootstrap.

## Testing — DB tiers (READ BEFORE WRITING A DB TEST)

- Tiers: `unit` (hermetic) · `integration` (DB reads) · `server` (DB writes) ·
  `auth` (boots the real Next dev server in-process over HTTP).
- `fileParallelism: false` + `maxWorkers: 1` — DB-touching files never overlap.

### The one rule that keeps biting: ALWAYS pass an explicit `maxWait`

Prisma's default `maxWait` is **2000 ms**. The remote dev Postgres pooler
regularly exceeds that on a cold connection, and the failure is:

```
Transaction API error: Unable to start a transaction in the given time.
```

**This reads exactly like an application bug and is not one.** It has now cost
time twice (the stock-claim concurrency tests, then `claimPendingOrder`). Use
`{ maxWait: 30_000, timeout: 30_000 }` — `tests/server/order-stock.test.ts`
keeps it in a single `TX_OPTIONS` const; prefer that over inline literals.

Corollary: if a repo function opens its own `$transaction` and a test needs to
run several concurrently, give the function an optional `txOptions` passthrough
rather than leaving the caller unable to raise the budget. `claimPendingOrder`
does this.

### Concurrency tests: don't probe the pooler's connection ceiling

Two mistakes to avoid in a "two claims race" test:

1. **Holding a transaction open with a `setTimeout` sleep** to "force" ordering.
   The sleeping transaction holds BOTH a connection and a row lock, so the
   second one times out waiting for a *connection* while the first sleeps. The
   test then fails for a harness reason and proves nothing. Start the claims
   together and let the guarded UPDATE create the contention.
2. **Firing many transactions in the same tick** (e.g. 5 racing for 3 units).
   The invariant under test ("quantity never goes negative") does not need
   simultaneous connections — the guarded `WHERE` clause serializes them. Stagger
   the starts (~40 ms apart) so the rows still contend.

### Rolled-back-transaction pattern

Most `server` tests roll back with
`throw new Error("intentional test rollback")` + `await expect(...).rejects.toThrow(ROLLBACK)`.

This does NOT work when the code under test opens its OWN transaction (e.g.
`claimPendingOrder`) — the writes must commit to be observable, so those tests
create committed rows and clean up in a `finally` block.

## Domain conventions

- **Money is Toman everywhere** (`Product.priceToman`, `Order.totalAmount`,
  `OrderItem.unitPriceAtPurchase`). `priceEur` is DISPLAY-ONLY and must never
  reach the gateway. The only conversion is the fixed ×10 Toman→Rial at the
  ZarinPal API boundary (`toRial`).
- **Stock is claimed at ORDER CREATION, not at payment** (the customer leaves
  for the gateway). Consequence: an unpaid/abandoned order holds a reservation
  until released.
- **Data identity**: every entity has `id` (PK, stable) and `slug`
  (route handle, `@unique`, renameable — old values go to `SlugHistory` for 301s).
  Parent/child FKs reference `id`, never `slug`.
- Ordered `string[]` / object-list fields map to Postgres `jsonb`.

## Environment

- `ZARINPAL_MERCHANT_ID` must be a **UUID**. Shape is validated at boot
  (`lib/env.ts` + `instrumentation.ts`), skipped when `NODE_ENV=test`.
  A malformed id makes ZarinPal answer `code: 0` for every call.
- `.env` currently has `ZARINPAL_MODE="sandbox"`.

## Sandbox limitations in this environment

- `rm -rf` / bulk deletes are BLOCKED — use `mv` to set a directory aside.
- Child-process spawn (`tasklist`, `taskkill`, `wmic`) returns `EBUSY`;
  PowerShell returns empty. A leftover dev-server listener on port 3000 cannot
  be killed from inside the sandbox — it must be waited out by the user.
- `pnpm run build` needs the sandbox DISABLED (writes to `.next` paths with
  brackets/parens are denied, and a denied Turbopack cache write makes the dev
  server answer 404/500 for real routes).
