# SyncStock IL — Claude Instructions

Shopify inventory sync app for Israeli SMB merchants. Keeps stock accurate across online store, physical warehouse, and ERP (Odoo/Priority) via barcode scanning. Hebrew RTL, human Hebrew support.

## Locked Decisions

- **Sequencing:** vertical slice first — provably-correct end-to-end sync loop before widening
- **First ERP:** Odoo (`docker run odoo:latest`); Priority is a later phase
- **Infra:** Supabase (DB + Realtime + Vault), Express backend, React frontend
- **Source of truth:** SyncStock (not ERP)
- **Migrations:** knex against direct `:5432`; never the pooled port for DDL
- **Frontend:** functional structure only — data flow, Realtime wiring, RTL/i18n, Polaris defaults; visual polish is a separate track

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
| Admin frontend | CRA + Polaris + App Bridge + Supabase anon client (read-only Realtime) |
| Scanner PWA | CRA PWA + zxing-browser + IndexedDB offline queue |
| ERP | `odoo-xmlrpc` (XML-RPC); common `erpRouter` interface for later adapters |

## Repo Structure

```
syncstock/
├── backend/{server.js, db/{supabase.js,migrations/}, routes/, services/{erp/}, models/}
├── frontend-admin/
└── frontend-scanner/
```

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

## Build Phases

| # | Phase | Key outcome |
|---|---|---|
| 0 | Infra & repo setup | Monorepo wired, secrets loaded, `/health` green |
| 1 | Schema + RLS + migrations | All tenant tables, atomic decrement proven |
| 2 | Shopify auth + product pull | Full paginated catalog in DB |
| 3 | Atomic scan loop | scan → Shopify → ERP → dashboard (the vertical slice) |
| 4 | Order webhook | Idempotent, no double-decrement |
| 5 | Odoo ERP integration | One-way push + manual pull |
| 6 | Admin frontend | Embedded Polaris, live Realtime, Hebrew RTL |
| 7 | Scanner PWA | Offline-capable, idempotent, barcode < 2s |
| 8 | Resilience & widening | Priority adapter, reconciliation, deploy |

## Non-Negotiables

- Never let two simultaneous sales of the last unit both succeed
- Order webhooks never call `inventoryAdjustQuantity` (Shopify already decremented)
- ERP credentials stored via Supabase Vault — never plaintext
- All tenant tables have `shop_id` as first column in every composite index

## Localization

- Hebrew is the default language, RTL layout
- `RTLProvider` + i18n toggle (Hebrew ↔ English) in both frontends
- Typography: Heebo/Rubik (Hebrew), Inter (English)

## Reference Docs

- `PLAN.md` — full build plan with phase checklists and correctness guidance
- `docs/prd/PRD-SyncStock-IL.md` — product requirements, personas, success metrics
