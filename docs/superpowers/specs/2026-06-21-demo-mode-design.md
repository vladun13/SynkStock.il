# SyncStock IL — DEMO_MODE Design Spec

**Date:** 2026-06-21  
**Scope:** DEMO_MODE vertical slice — seed data, mock Shopify client, scan loop API, admin dashboard, scanner PWA  
**Goal:** A fully functional demo with no real Shopify credentials. Real JWT/RLS/Realtime/atomic DB paths run underneath; only the Shopify GraphQL call is mocked.

---

## 1. DEMO_MODE Flag

`DEMO_MODE=true` in `.env` gates all mock behavior. No consumer code checks this flag directly — the swap happens exclusively inside `services/shopifyClient.js`. All other modules are unaware of demo vs production.

---

## 2. Seed Script (`backend/db/seed.js`)

Runs via `node db/seed.js`. Idempotent — safe to re-run. Uses service-role key (bypasses RLS).

### Steps

1. **Auth user** — `supabaseAdmin.auth.admin.createUser({ email: 'demo@syncstock.dev', password: 'demo1234', email_confirm: true })`. On conflict (user exists), retrieve existing user. The user's UUID becomes `DEMO_SHOP_ID`.

2. **Shop row** — upsert into `shops`: `{ id: DEMO_SHOP_ID, shopify_domain: 'demo.myshopify.com', is_active: true }`.

3. **Locations** — upsert 2 rows into `locations`:
   - `{ name: 'מחסן ראשי', shopify_location_id: '1001' }`
   - `{ name: 'חנות תל אביב', shopify_location_id: '1002' }`

4. **Products (30)** — Hebrew names (e.g. "ספר לימוד מתמטיקה", "כיסא משרדי ארגונומי"). Each has:
   - Valid EAN-13 barcode: 12 random digits + computed check digit (alternating ×1/×3 weight sum, `(10 - (sum % 10)) % 10`)
   - SKU: `SKU-001` … `SKU-030`
   - `image_url`: `https://picsum.photos/seed/{sku}/200/200` — deterministic per SKU
   - `shopify_product_id`, `shopify_variant_id`, `shopify_inventory_item_id`: fake integers (10000000 + index)

5. **Inventory levels** — stock distribution across both locations:

   | State | Products | Qty (מחסן ראשי) | Qty (חנות תל אביב) |
   |---|---|---|---|
   | Out of stock | 2 | 0 | 0 |
   | Low stock | 5 | 1–3 | 1–3 |
   | Healthy | 23 | 20–200 | 20–200 |
   | Location diverge (healthy ↔ zero) | 4 | 50–150 | 0 |
   | Location diverge (zero ↔ healthy) | 2 | 0 | 50–150 |

   Note: the 6 diverge products are drawn from the 23 healthy pool.

6. **Sync history** — 12 rows in `sync_logs` spread across last 7 days. Mix of `origin: 'scan' | 'order' | 'manual'`, all `status: 'synced'`. Random product/location assignments from the seeded set.

---

## 3. Mock Shopify Client (`services/shopifyClient.js`)

Exports a consistent interface regardless of mode:

```js
adjustInventory(inventoryItemId, locationId, delta)  // → { success: true, newQuantity }
getProducts(shopId)                                   // → [...]
getLocations(shopId)                                  // → [...]
```

When `DEMO_MODE=true`: all methods resolve immediately with mock success data. When `DEMO_MODE=false`: real Shopify Admin GraphQL calls (future implementation).

No consumer (routes, workers, services) imports `DEMO_MODE` — they only import `shopifyClient`.

---

## 4. Backend Scan Loop

### `POST /api/inventory/adjust`

**Auth:** Bearer JWT → `supabaseAdmin.auth.getUser(token)` → `req.shopId = user.id`

**Body:** `{ barcode, locationId, delta, actionId }` where `actionId = "deviceId:timestamp:seq"` (client-generated)

**Flow (all DB ops on direct port `:5432` via knex):**

1. `barcodeService.resolve(barcode, shopId)` — SELECT from `products` where `barcode=$1 AND shop_id=$2`, returns `{ productId, shopifyInventoryItemId }`. 404 if not found.

2. **Atomic transaction:**
   ```sql
   -- Idempotency (inside txn — commits or rolls back with everything)
   INSERT INTO processed_events (event_key, status)
     VALUES ($actionId, 'processing') ON CONFLICT (event_key) DO NOTHING;
   -- returns 0 rows affected → 409 Already processed

   -- Atomic decrement/increment
   UPDATE inventory_levels
     SET available = available + $delta
   WHERE product_id=$productId AND location_id=$locationId
     AND shop_id=$shopId AND available + $delta >= 0
   RETURNING available;
   -- 0 rows → 409 Oversell rejected

   -- Outbox (for Shopify worker)
   INSERT INTO outbox (shop_id, payload, origin, status)
     VALUES ($shopId, $payload, 'scan', 'pending');

   -- Sync log (drives Realtime feed)
   INSERT INTO sync_logs (shop_id, product_id, location_id, delta, origin, status)
     VALUES ($shopId, $productId, $locationId, $delta, 'scan', 'pending');
   ```

3. **Response:** `{ available: <new qty>, syncStatus: 'pending' }`  
   *(do not return 'synced' — the pg-boss worker hasn't run yet)*

4. **pg-boss `shopify-sync` worker** drains outbox rows → calls `shopifyClient.adjustInventory(...)` → updates `outbox.status = 'synced'` and `sync_logs.status = 'synced'`. Supabase Realtime on `sync_logs` fires → UI flips badge to `synced ✅`.

### `GET /api/inventory/:locationId`

Returns all `inventory_levels` for the authenticated shop at the given location. Used by scanner to show current stock after a scan.

---

## 5. Admin Frontend (`frontend-admin`)

**Stack:** CRA + `@shopify/polaris` (standalone, no App Bridge) + `@supabase/supabase-js` + `react-i18next`  
**Port:** `localhost:3001`  
**Default language:** Hebrew (RTL). Toggle persists to `localStorage`.  
**Typography:** Heebo (Hebrew), Inter (English)

### Auth

A pre-filled login screen renders on first load (no active session):
- Email field pre-populated: `demo@syncstock.dev`
- Password field pre-populated: `demo1234`
- Helper text: *"Demo account — click Sign in."*
- On submit: `supabase.auth.signInWithPassword(...)` → redirect to `/`. Session stored in `localStorage`.

### Routes

| Route | Page |
|---|---|
| `/login` | Pre-filled login form |
| `/` | Dashboard |
| `/activity` | SyncLog feed |
| `/connect` | Fake store connection |

### Dashboard (`/`)

**Top row — stat cards:**
- Total SKUs
- Low Stock (qty 1–3)
- Out of Stock (qty 0)
- Sync Health (% `status='synced'` in `sync_logs` last 24h)

**Main — inventory table:**
- Location filter tabs (מחסן ראשי / חנות תל אביב / All)
- Columns: Product image · Name · SKU · Barcode · Available · Actions · Sync status badge
- **Actions column:** `−` (Sell) and `+` (Receive) buttons per row → `POST /api/inventory/adjust` with `{ barcode, locationId, delta: ±1, actionId: "admin:productId:timestamp" }`. Allows full demo without a barcode scanner.
- Low stock rows: yellow badge. Out-of-stock rows: red badge.
- Realtime subscription on `inventory_levels` → rows update live without refresh

**Reset demo button** (top-right, admin only):
- Calls `POST /api/demo/reset` → backend re-runs seed script logic (restores all stock levels to initial values)
- Shows confirmation modal before executing

### Activity Feed (`/activity`)

- Realtime subscription on `sync_logs`
- Each row: origin icon (scan/order/manual) · product name · delta · location · timestamp · status badge
- Status transitions live: `syncing… → synced ✅`

### Connect Store (`/connect`)

- Form: Shopify domain + API key inputs
- On submit: 1s fake delay → show `Connected ✅` banner → store `shopConnected:true` in `localStorage`
- No real API call. Interface is a placeholder for future OAuth.

---

## 6. Scanner PWA (`frontend-scanner`)

**Stack:** CRA PWA + `zxing-browser` + `@supabase/supabase-js` + `idb` (IndexedDB)  
**Port:** `localhost:3002`  
**Language:** Hebrew, RTL  
**Auth:** Same silent pre-fill pattern — pre-filled login screen, one-click sign-in

### Flow

1. **Location selector** in header — מחסן ראשי / חנות תל אביב
2. **Camera view** — `BrowserMultiFormatReader` continuous scan; EAN-13 target < 2s
3. **Product card** (on successful decode):
   - Product image (`picsum.photos` URL from DB)
   - Hebrew name + SKU
   - Current stock at selected location (from `GET /api/inventory/:locationId`)
   - Action buttons: Receive (+) / Sell (−)
4. **Adjust** — `POST /api/inventory/adjust` with client-generated `actionId = "deviceId:timestamp:seq"`
5. **Optimistic update** — immediately shows new qty + `syncing…` badge
6. **Realtime confirm** — subscription on `sync_logs` for this product → flips to `synced ✅`
7. **Offline queue** — if network absent, action written to IndexedDB; auto-drained on reconnect; same `actionId` ensures idempotent apply

---

## 7. Backend Config & CORS

**CORS:** `cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' })` in `server.js`. For deployed demo, `ALLOWED_ORIGINS` lists the frontend domains. Falls back to `*` in local dev.

**API URL:** Both frontends read `REACT_APP_API_URL` from `.env` (e.g. `http://localhost:3000` locally, deployed backend URL in production). No hardcoded localhost.

**Demo reset endpoint:** `POST /api/demo/reset` — only registered when `DEMO_MODE=true`. Calls the seed logic (idempotent upserts, restores stock to initial values). Protected by the same JWT auth middleware; only the authenticated demo user can call it.

---

## 8. Key Invariants (non-negotiable)

- `processed_events` INSERT is always **inside** the atomic transaction — no orphaned idempotency keys
- `syncStatus: 'pending'` in the API response — never `'synced'` synchronously
- The Shopify swap is **only** in `shopifyClient.js` — no DEMO_MODE checks elsewhere
- All tenant DB queries include `AND shop_id = $shopId` — no cross-tenant leakage
- Migrations run on direct `:5432`; app queries use pooled `:6543` with `prepared: false`

---

## 9. Files Created / Modified

| File | Action |
|---|---|
| `.env` / `.env.example` | Add `DEMO_MODE=true`, `ALLOWED_ORIGINS`, `REACT_APP_API_URL` |
| `backend/db/migrations/20260621000002_add_image_url_to_products.js` | Create — adds `image_url text` column to `products` |
| `backend/db/seed.js` | Create |
| `services/shopifyClient.js` | Create (mock + real interface) |
| `services/barcodeService.js` | Create |
| `routes/inventory.js` | Create (`POST /adjust`, `GET /:locationId`) |
| `routes/demo.js` | Create (`POST /demo/reset` — DEMO_MODE only) |
| `server.js` | Mount `/api/inventory` + `/api/demo` routers; add CORS with `ALLOWED_ORIGINS` |
| `frontend-admin/` | Build (CRA + Polaris standalone) |
| `frontend-scanner/` | Build (CRA PWA + zxing-browser) |
