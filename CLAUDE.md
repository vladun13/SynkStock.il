# SyncStock IL — Claude Instructions

Shopify inventory sync app for Israeli SMB merchants. Keeps stock accurate across online store, physical warehouse, and ERP (Odoo/Priority) via barcode scanning. Hebrew RTL, human Hebrew support.

## Locked Decisions

- **Sequencing:** vertical slice first — provably-correct end-to-end sync loop before widening
- **First ERP:** Odoo (`docker run odoo:latest`); Priority is a later phase
- **Infra:** Supabase (DB + Realtime + Vault), Express backend, React frontend
- **Source of truth:** SyncStock (not ERP)
- **Migrations:** knex against direct `:5432`; never the pooled port for DDL
- **Frontend:** three CRA apps (admin, scanner, landing). Functional structure first; visual layer is Tailwind v3 (Inventory Core design system from Google Stitch — Material-3-style tokens, Rubik/Heebo/Inter typography, Material Symbols). Admin's `AppFrame` is the Tailwind shell — Polaris dep remains but is not used for chrome. Cross-app navigation: landing → admin → scanner via `src/lib/urls.js` env vars.
- **Demo:** `DEMO_MODE=true` gates a self-contained demo — seeded Hebrew inventory + mock Shopify/Odoo clients (same interface, instant success). The atomic loop, JWT auth, RLS, pg-boss worker, and Realtime all run for real against Supabase. No real Shopify/Odoo credentials needed.

## Architecture

```
Scanner/Admin change → ATOMIC update SyncStock DB (txn)
                         └─ same txn writes OUTBOX row (origin-tagged)
                       pg-boss workers
                         ├─ shopify-sync (fast) → Shopify inventoryAdjustQuantity
                         └─ erp-sync (slow, retry) → Odoo/Priority
                       inventory_levels change → Supabase Realtime → admin dashboard

Shopify order webhook → HMAC + dedupe → update SyncStock + ERP (NEVER re-adjust Shopify)
```

Three rules enforced everywhere:
1. **Atomic** — DB-level guard, not app-level read-modify-write
2. **Idempotent** — webhooks + offline scans deduped by stable key via `processed_events`
3. **Origin-tagged** — changes never echo back to their source

## Tech Stack

| Layer | Choice |
|---|---|
| DB | Supabase PostgreSQL (pooled `:6543` for app, direct `:5432` for migrations) |
| Queue | pg-boss (separate `shopify-sync` and `erp-sync` queues) |
| Backend | Express + `@shopify/shopify-api` + `@supabase/supabase-js` + knex |
| Admin frontend | CRA + Tailwind v3 (Inventory Core design system) + Supabase anon client (read-only Realtime). Polaris dep remains but chrome is Tailwind `AppFrame` |
| Scanner PWA | CRA PWA + @zxing/browser + @zxing/library + IndexedDB offline queue |
| Landing page | CRA + Tailwind v3 marketing page (hero, pricing, CTA) |
| ERP | `odoo-xmlrpc` (XML-RPC); common `erpRouter` interface for later adapters |

## User Flow

```
Landing Page  →  Admin Dashboard  →  Scanner PWA
```

- **Landing → Admin:** All CTA buttons + nav "Login" link → `${REACT_APP_ADMIN_URL}/login`
- **Admin → Scanner:** Gradient "Open Scanner" button in top nav → `${REACT_APP_SCANNER_URL}` (new tab)
- Cross-app URLs via env vars (`src/lib/urls.js` in each app), defaults to localhost

## Repo Structure

```
syncstock/
├── backend/
│   ├── server.js                      # CORS (ALLOWED_ORIGINS), route mounts, pg-boss startup
│   ├── config.js                      # validateEnv + getIntegrationStatus
│   ├── db/{supabase.js, migrate.js, migrations/, seed.js}
│   ├── middleware/auth.js             # requireAuth → req.shopId = user.id
│   ├── routes/{health,inventory,orders,erp,demo}.js   # demo.js mounted only in DEMO_MODE
│   ├── services/{shopifyClient,odooClient,barcodeService,syncEngine}.js  # *Client mock/real swap on DEMO_MODE
│   └── __tests__/                     # jest: inventory, orders, erp
├── frontend-admin/    # CRA + Tailwind + Supabase Realtime — dashboard, activity, connect, erp
├── frontend-scanner/  # CRA PWA + @zxing/browser + idb offline queue
├── frontend-landing/  # CRA + Tailwind marketing page (hero, pricing, CTA)
└── docs/prd/PRD-SyncStock-IL.md
```

### Cross-app navigation

| App | Env vars | `src/lib/urls.js` |
|---|---|---|
| frontend-landing | `REACT_APP_ADMIN_URL`, `REACT_APP_SCANNER_URL` | exports both |
| frontend-admin | `REACT_APP_SCANNER_URL` | exports `SCANNER_URL` |

## Critical Patterns

**Atomic decrement:**
```sql
UPDATE inventory_levels SET available = available + $delta
 WHERE id = $id AND available + $delta >= 0 RETURNING available;
-- 0 rows → reject (would oversell)
```

**Idempotency:**
```sql
INSERT INTO processed_events (event_key, status) VALUES ($key, 'processing')
  ON CONFLICT (event_key) DO NOTHING;
```
Webhook key = `topic:order_id:webhook_id`. Offline scan key = `deviceId:timestamp:seq` (client-generated before send).

**Transactional outbox:** stock change + outbox row in one transaction. Never `db.save()` then `boss.send()`.

**RLS with Supabase Auth** (`shops.id = auth.uid()` — user IS the shop):
```sql
CREATE POLICY tenant_isolation ON inventory_levels
  FOR SELECT TO authenticated
  USING (shop_id = auth.uid());
```
Backend uses service-role key (bypasses RLS). Frontend uses authenticated session for read-only Realtime. Auth middleware extracts `req.shopId = user.id` from the JWT via `supabaseAdmin.auth.getUser(token)`.

**pgbouncer (pooled `:6543`):** set `prepared: false` for knex; use `set_config(..., true)` not `SET`; no `LISTEN/NOTIFY` on pooled port.

**Queue bulkheads:** `shopify-sync` (`retryLimit:3, retryDelay:5`) and `erp-sync` (`retryLimit:5, retryDelay:30`) are separate so a flaky ERP never blocks Shopify. Add circuit breaker (opossum) around ERP calls.

**pg-boss v10 gotchas:** (1) queues MUST be created with `boss.createQueue(name)` before `send()`/`work()` — otherwise `send()` is a *silent no-op* (no job, no error). (2) the `work()` handler receives a **batch (array)** of jobs — iterate `jobs`, don't destructure `{ data }` off the array. (3) use `{ batchSize }`, not v9's `teamSize/teamConcurrency`. Worker only starts under `require.main === module`, so tests must call `startSyncWorker()` themselves.

## Build Phases

| # | Phase | Key outcome |
|---|---|---|
| 0 | Infra & repo setup | Monorepo wired, secrets loaded, `/health` green |
| 1 | Schema + RLS + migrations | All tenant tables, atomic decrement proven |
| 2 | Shopify auth + product pull | Full paginated catalog in DB |
| 3 | Atomic scan loop | scan → Shopify → ERP → dashboard (the vertical slice) |
| 4 | Order webhook | Idempotent, no double-decrement |
| 5 | Odoo ERP integration | One-way push + manual pull |
| 6 | Admin frontend | Tailwind AppFrame, live Realtime, Hebrew RTL |
| 7 | Scanner PWA | Offline-capable, idempotent, barcode < 2s |
| 8 | Resilience & widening | Priority adapter, reconciliation, deploy |

## Non-Negotiables

- Never let two simultaneous sales of the last unit both succeed
- Order webhooks never call `inventoryAdjustQuantity` (Shopify already decremented)
- ERP credentials stored via Supabase Vault — never plaintext
- All tenant tables have `shop_id` as first column in every composite index

## Localization

- Hebrew is the default language, RTL layout
- `RTLProvider` + i18n toggle (Hebrew ↔ English) in all three frontends
- Typography: Heebo/Rubik (Hebrew), Inter (English)

## Running the Demo

```
cd backend && npm run migrate && npm run seed && npm start   # :3000, DEMO_MODE ON, pg-boss worker
cd frontend-admin   && npm start   # :3001
cd frontend-scanner && npm start   # :3002
cd frontend-landing && npm start   # :3003 (optional)
```

Login (pre-filled): `demo@syncstock.dev` / `demo1234`. Seed loads 30 Hebrew products across 2 locations (מחסן ראשי / חנות תל אביב) with mixed stock states (out-of-stock, low, healthy). `POST /api/demo/reset` (DEMO_MODE only) restores initial stock. Order webhook for the demo: authenticated `POST /api/orders/webhook` with `{order_id, webhook_id, line_items[]}` — decrements SyncStock + logs, never re-adjusts Shopify.

## Reference Docs

- `docs/superpowers/plans/2026-06-21-demo-mode.md` — the DEMO_MODE build plan (15 tasks)

- `PLAN.md` — full build plan with phase checklists and correctness guidance
- `docs/prd/PRD-SyncStock-IL.md` — product requirements, personas, success metrics
