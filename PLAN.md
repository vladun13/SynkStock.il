# SyncStock IL — MVP Build Plan

## Context

**Problem.** Israeli e-commerce merchants sell both online (Shopify) and offline (physical stores/warehouses), often also running a local ERP (Priority, Odoo). Stock levels drift out of sync across these systems, causing **overselling** and manual double-entry.

**Goal.** Build an MVP where a merchant scans a barcode in the warehouse, the stock updates locally, syncs to Shopify **and** the connected ERP in near-real-time, and the merchant sees unified live inventory on a dashboard.

**The non-negotiable property: never oversell.** Correctness of stock math under concurrency, idempotent webhooks, and loop-free origin tagging beat every feature. This plan front-loads that correctness.

**Decisions locked for this plan (from kickoff Q&A):**
- **Sequencing:** Vertical slice first — one provably-correct end-to-end sync loop before widening surface area.
- **First ERP:** Odoo (free `docker run odoo:latest` sandbox → fully testable locally). Priority is a later phase.
- **Infra:** Starting from zero — Supabase project, Shopify Partner app, and tunnel must be created as explicit setup steps.
- **Source of truth:** SyncStock (configurable "ERP is source of truth" mode is roadmap, not MVP).
- **Migrations:** knex (programmatic, CI-friendly, already in the dependency list).
- **Visual design:** handled separately by the user. Frontend phases (6–7) build **functional structure only** — data flow, Realtime wiring, RTL/i18n plumbing, Polaris defaults — and deliberately leave styling/visual polish as a separate track to be layered on later.

This is a **greenfield** repo — directory is empty except `.claude/`. Nothing to reuse yet; every file below is new.

---

## Architecture (one diagram to anchor everything)

```
Scanner/Admin change ─► ATOMIC update SyncStock DB (txn)
                          │  └─ same txn writes an OUTBOX row (origin-tagged)
                          ▼
                   pg-boss workers
                     ├─ shopify-sync queue (fast)  ─► Shopify inventoryAdjustQuantity
                     └─ erp-sync queue (slow, retry) ─► Odoo/Priority
                          │
                          ▼
        inventory_levels row change ─► Supabase Realtime ─► admin dashboard (auto)

Shopify order (orders/create) ─► webhook (HMAC + dedupe) ─► update SyncStock DB + ERP
                                                            (NEVER re-adjust Shopify)

ERP direct change ─► merchant clicks "Sync from ERP" ─► reconcile ─► Shopify
```

**Three rules enforced everywhere:**
1. **Atomic** stock math (DB-level guard, not app-level read-modify-write).
2. **Idempotent** inbound events (webhooks + offline scans deduped by stable key).
3. **Origin-tagged** changes so a push never echoes back to its source (no sync loops).

**Write/read split:** all writes go through the Express backend with the Supabase **service-role key**. The admin frontend uses the **anon key for read-only Realtime only**. RLS on every tenant table is defense-in-depth.

---

## Phase 0 — Infra & repo setup (from zero)

> Outcome: empty-but-wired monorepo, all external accounts created, secrets in `.env`, app boots and connects to Supabase.

**External accounts (manual, with guided steps):**
- [ ] Create Supabase project → capture `SUPABASE_URL`, anon key, service-role key, pooled URL (`:6543`), direct URL (`:5432`).
- [ ] Create Shopify Partner account + app → `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`; set scopes `read_products,write_inventory,read_orders,read_locations`; create a development store.
- [ ] Install `cloudflared` (or ngrok) for a stable HTTPS tunnel → set as `HOST`.
- [ ] Odoo sandbox: `docker run -d -p 8069:8069 odoo:latest`, create a DB + API key.

**Repo scaffold:**
- [ ] `syncstock/` monorepo per the structure below; root `.gitignore`, `.env.example`, `README` with run steps.
- [ ] `backend/`: `npm init` + install `express @shopify/shopify-api @supabase/supabase-js pg-boss pg knex dotenv cors helmet axios odoo-xmlrpc`.
- [ ] `backend/db/supabase.js`: service-role client + a `pg`/knex pool on the **pooled** URL (transaction mode).
- [ ] `.env` loading + a startup check that fails fast if required secrets are missing (per security rules).
- [ ] Healthcheck route `GET /health` that verifies DB connectivity. **Verify:** boots, `/health` green.

**Target structure:**
```
syncstock/
├── backend/{server.js, db/{supabase.js,migrations/}, routes/, services/{erp/}, models/}
├── frontend-admin/  (CRA + Polaris + App Bridge + supabase anon client)
└── frontend-scanner/(CRA PWA + zxing-browser + IndexedDB queue)
```

---

## Phase 1 — Schema, RLS, migrations (correctness foundation)

> Outcome: all tenant tables exist with RLS on, Realtime enabled, atomic-decrement primitive proven by a SQL-level test.

**Migrations (knex, run against `DIRECT_URL`):** create
- `shops` (+ `erp_type`, `erp_credentials` via Vault, RLS by `id`)
- `products` (+ `erp_item_id`, `erp_part_number`, `shop_id`)
- `locations` (+ `shopify_location_id`, `shop_id`)
- `inventory_levels` (`product_id`, `location_id`, `available`, `shop_id`, unique `(product_id, location_id)`) — **the row that must never go negative**
- `sync_logs` (`origin`, `erp_destination`, `erp_response_status`, `shop_id`)
- `erp_settings` (per shop)
- `processed_events` (dedupe ledger: `event_key` unique — webhook IDs + offline action IDs)
- `outbox` (transactional outbox: pending outbound syncs, origin-tagged)

**RLS:** enable on every tenant table; policy = row visible only where `shop_id` matches the current shop. Backend bypasses via service role; anon key is read-only and RLS-constrained. *(Exact policy idiom — including how this works without Supabase Auth/`auth.uid()` — to be filled from the Supabase + Security books.)*

**Realtime:** enable replication on `inventory_levels` (live stock) and `sync_logs` (live activity feed).

**Atomic decrement primitive (the heart of the product):**
```sql
UPDATE inventory_levels
   SET available = available + :delta
 WHERE id = :id AND available + :delta >= 0
RETURNING available;   -- 0 rows affected ⇒ would oversell ⇒ reject
```
Wrapped in a transaction; `SELECT … FOR UPDATE` only if multi-row coordination is needed. *(Final choice + isolation level from the Prisma transactions + Supabase concurrency chapters.)*

- [ ] **Verify:** concurrency test — N parallel requests against the last unit; exactly one succeeds, rest get a clean "insufficient stock" rejection; row never negative.

---

## Phase 2 — Shopify auth + paginated product pull

> Outcome: merchant installs the app; full catalog (not just 250) lands in `products`/`inventory_levels`.

- [ ] `routes/auth.js`: Shopify OAuth 2.0 via `@shopify/shopify-api`; reject invalid/expired HMAC; persist session keyed to `shop`.
- [ ] `services/shopifyClient.js`: Admin GraphQL client from the stored session.
- [ ] **Paginated** initial pull: loop `products(first:250, after:$cursor)` while `pageInfo.hasNextPage`, capturing variant `sku`, `barcode`, `inventoryItem.id`. (Stub `bulkOperationRunQuery` path noted for very large catalogs.)
- [ ] `routes/locations` + `models/location.js`: pull Shopify locations, map to local locations.
- [ ] Barcode assignment: auto-generate internal barcode for variants without one; allow override.
- [ ] **Verify:** install on dev store, confirm full catalog imported (seed the dev store with >250 variants to prove pagination).

---

## Phase 3 — The atomic scan loop (vertical slice core)

> Outcome: `scan → atomic local update → push to Shopify → enqueue ERP → live on dashboard`. This is the slice that proves the product.

- [ ] `services/barcodeService.js`: resolve `barcode → variant/product` for the shop.
- [ ] `POST /api/inventory/adjust` `{ barcode, locationId, delta, origin:"scan", actionId }`:
  1. Dedupe on `actionId` (insert into `processed_events`; duplicate ⇒ return prior result).
  2. **Atomic** decrement/increment (Phase 1 primitive) inside a transaction.
  3. In the **same transaction**, write an `outbox` row (origin-tagged) for the Shopify push (+ ERP push). *(Transactional outbox — from the reliability book.)*
  4. Write `sync_logs`.
- [ ] `services/syncEngine.js`: drains `outbox` → `shopify-sync` queue → `inventoryAdjustQuantity`; on success marks outbox row done. **Origin tagging** ensures a Shopify-origin change never re-pushes to Shopify, etc.
- [ ] pg-boss setup: `shopify-sync` (fast) and `erp-sync` (slow) as **separate** queues so a flaky ERP never blocks Shopify; 3 retries, exponential backoff, dead-letter + alert.
- [ ] **Verify:** scan a barcode → Shopify level changes → dashboard updates via Realtime within seconds; kill the ERP and confirm Shopify path is unaffected.

---

## Phase 4 — Order webhook (idempotent, no double-decrement)

> Outcome: online sales propagate to local DB + ERP without ever re-touching Shopify, and redeliveries are no-ops.

- [ ] `routes/webhooks.js`: register `ORDERS_CREATE`, `PRODUCTS_CREATE`, `PRODUCTS_UPDATE`; **verify HMAC on every call**.
- [ ] `orders/create`: dedupe by `X-Shopify-Webhook-Id` **and** order ID via `processed_events`. Shopify has **already** decremented itself → apply order deltas to **local DB + ERP only** (never call `inventoryAdjustQuantity`). Origin = `order`.
- [ ] `products/create|update`: pull new product / refresh title/SKU/barcode.
- [ ] **Verify:** place a test order → local + ERP decrement, Shopify untouched; replay the same webhook → no change (idempotent).

---

## Phase 5 — Odoo ERP integration (the differentiator)

> Outcome: stock changes push one-way to Odoo with retries; manual pull from Odoo for initial alignment.

- [ ] `services/erp/odooClient.js` (XML-RPC via `odoo-xmlrpc`): connect, read balance, `stock.quant action_update_quantity`.
- [ ] `services/erp/erpRouter.js`: common ERP interface (so Priority drops in later).
- [ ] `routes/erp.js`: `POST /api/erp/test` (validate creds, return status), config CRUD; store creds via **Supabase Vault** (never plaintext).
- [ ] Product mapping: auto-match SKU ↔ Internal Reference; expose unmatched for manual linking; store `erp_item_id`.
- [ ] ERP push: `erp-sync` worker drains outbox ERP rows → Odoo; origin-tagged so it never re-triggers Shopify; failures → dead-letter + alert.
- [ ] `POST /api/erp/sync`: manual one-way pull Odoo → SyncStock → Shopify for mapped products.
- [ ] **Verify:** scan → stock appears in both Shopify and Odoo within ~3s; ERP down → job retries then dead-letters with alert, Shopify still fine.

---

## Phase 6 — Admin frontend (embedded, live)

> Outcome: Polaris admin embedded in Shopify, live via Realtime, Hebrew-first RTL.

- [ ] CRA + `@shopify/app-bridge-react @shopify/polaris @supabase/supabase-js react-router-dom`.
- [ ] `lib/supabase.js`: **anon** client, read-only Realtime subscription to `inventory_levels` + `sync_logs`.
- [ ] Pages: Dashboard (total SKUs, low-stock count, sync health, ERP status), Products (color-coded: red `≤threshold/2`, yellow `≤threshold`, green else), Locations, SyncLog, ERPSettings (Odoo form + test + mapping table).
- [ ] `RTLProvider` + i18n: Hebrew/English toggle, **default Hebrew**, full RTL when Hebrew.
- [ ] **Verify:** embedded in Shopify Admin; adjust stock elsewhere → dashboard updates with no refresh; RTL correct in Hebrew.

---

## Phase 7 — Scanner PWA

> Outcome: warehouse-grade barcode scanner, offline-capable, idempotent.

- [ ] CRA PWA + `zxing-browser` (or Barcode Detection API) + IndexedDB (`react-indexed-db`); `manifest.json`.
- [ ] Camera scan → show product name/image/current stock at active location; EAN-13 detect < 2s.
- [ ] Actions: Receive (+), Sell (−), Move (target location); each carries a client-generated `actionId`.
- [ ] `OfflineQueue`: queue actions in IndexedDB when offline; auto-sync on reconnect; idempotent via `actionId` (Phase 3 dedupe).
- [ ] **Verify:** scan offline → reconnect → applies exactly once (no double-count); works on Android Chrome + iOS Safari.

---

## Phase 8 — Resilience & widening (post-slice)

- [ ] Priority REST client behind `erpRouter` (needs vendor sandbox).
- [ ] Multi-location CRUD polish.
- [ ] Reconciliation job: scheduled drift check across SyncStock/Shopify/ERP; surface mismatches.
- [ ] Deploy: backend → Render/Railway, scanner → Netlify; Supabase hosts DB/Realtime/queue.

---

## Test plan (correctness is the product)

| Test | Proves | Phase |
|---|---|---|
| Concurrent last-unit adjust | Atomic decrement never oversells | 1, 3 |
| Webhook replay | `orders/create` idempotent, no double-decrement, Shopify untouched | 4 |
| Origin-tag loop | Shopify↔SyncStock↔ERP change does not echo to source | 3, 5 |
| Offline replay | Queued scan applies exactly once after reconnect | 7 |
| Pagination | Full catalog imported beyond 250 | 2 |
| ERP outage | erp-sync dead-letters + alerts; shopify-sync unaffected | 5 |

**End-to-end success:** merchant installs app → connects Odoo → maps products → scans a barcode → stock updates in Shopify **and** Odoo within 3s, live on the dashboard, both connections green. Two simultaneous sales of the last unit (online + in-store) never both succeed.

---

## Resolved correctness guidance (from library: *Supabase PostgreSQL Best Practices*, *Distributed Task Reliability*)

**RLS without Supabase Auth** — Shopify session is the identity, so `auth.uid()` is always NULL. Pass the verified `shop_id` as a **transaction-local** setting and reference it in policies:
```sql
-- Backend (anon/realtime path) sets this per transaction:
SELECT set_config('app.current_shop_id', $1, true);  -- true = txn-local (required under pgbouncer)
-- Policy on every tenant table:
CREATE POLICY t_anon_read ON inventory_levels FOR SELECT TO anon
  USING (shop_id = current_setting('app.current_shop_id', true)::uuid);
REVOKE INSERT, UPDATE, DELETE ON inventory_levels FROM anon;  -- belt + suspenders
GRANT SELECT ON inventory_levels TO anon;
```
Index `shop_id` first in every composite index (`(shop_id, product_id)`) — RLS evaluates the predicate on every query. Service-role (backend) bypasses RLS; it must re-validate `shop_id` from the verified session, never trust request body.

**Atomic decrement** — use the single-statement guard (safe under pgbouncer transaction mode, no held lock across pool checkouts). `READ COMMITTED` is sufficient:
```sql
UPDATE inventory_levels SET available = available + $delta
 WHERE id = $id AND available + $delta >= 0 RETURNING available;  -- 0 rows ⇒ reject (oversell)
```
Use `SELECT … FOR UPDATE` only when read-then-business-logic is needed; if so, keep the txn short and **no network calls inside it**, lock multiple rows in ascending `product_id` order (deadlock avoidance).

**pgbouncer (pooled :6543) gotchas** — set `prepared: false` / `pg_no_prepared_statements=true` for node-postgres/knex (named prepared statements break in transaction mode); session-local `SET` doesn't persist (use txn-local `set_config(..., true)`); no `LISTEN/NOTIFY` or `LOCK TABLE` on the pooled port. Migrations + DDL go through **direct :5432**.

**Idempotency = UNIQUE constraint at the DB**, claimed in the same transaction as the effect (works at any isolation level):
```sql
INSERT INTO processed_events (event_key, status) VALUES ($key, 'processing')
  ON CONFLICT (event_key) DO NOTHING;  -- 0 rows ⇒ duplicate ⇒ commit + return early
```
Webhook key = `topic:order_id:webhook_id` (business key survives fresh random IDs on retry). Offline scan key = `deviceId:timestamp:seq`, **generated client-side before send** so it survives reconnect/restart.

**Transactional outbox** — never `db.save()` then `boss.send()` (CRITICAL dual-write → perpetual inconsistency). Write the stock change **and** the outbox row in one transaction; a relay job drains it:
```sql
SELECT * FROM outbox WHERE status='pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 50;
```
Carry `outbox.id` as the `Idempotency-Key` on the outbound Shopify push (Shopify honors it → no double-update).

**Origin tagging** — `outbox.source` + `outbox.destination`; relay skips when `source == destination`. ERP inbound carries `syncstock_origin_id`; if it's in `processed_events`, we originated it → no-op. (End-to-End Argument: loop detectable only at the originating endpoint.)

**Queues as bulkheads** — separate pg-boss queues: `shopify-sync` (`retryLimit:3, retryDelay:5, retryBackoff:true`) and `erp-sync` (`retryLimit:5, retryDelay:30, retryBackoff:true`), each with its own dead-letter queue + alert on DLQ depth > 0. Retry at **exactly one layer**. Add a circuit breaker (e.g. opossum) around ERP calls so a slow ERP can't starve workers. Guiding principle: *"violations of integrity are perpetual inconsistency"* — a delayed ERP sync self-heals; a lost/duplicated stock change does not.

**Note:** *Web Application Security for AI Agents* is Pro-gated (1/40 pages); OAuth/multi-tenancy specifics above come from the Supabase book + standard practice (timing-safe HMAC via `crypto.timingSafeEqual`, CSRF `state`, validate `*.myshopify.com`, tokens server-side only).
