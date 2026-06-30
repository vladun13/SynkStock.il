# SyncStock E2E — Handoff

Playwright suite under `e2e/`. **Written:** config, libs, global-setup, specs **05-oversell** & **06-idempotency** (the core guarantees). **TODO:** specs 01–04, 07–09 (blueprints below), then run to green.

## Run
```bash
cd e2e && npm install && npx playwright install chromium
npm run test:e2e          # boots backend:3000 + admin:3001 + scanner:3002 via webServer
npm run test:report
```
Prereq: `cd backend && npm run migrate && npm run seed` once (DEMO_MODE=true). Ports override via env `API_URL/ADMIN_URL/SCANNER_URL`. Trace+video are `on` globally → artifacts in `e2e/test-results/<spec>/` (use these for the sync-loop & oversell videos).

## Ground truth (verified from source)
- **Ports:** backend 3000, admin 3001, scanner 3002. Backend default PORT=3000 (not 4000).
- **Auth:** `lib/supa.login()` = Supabase password grant → JWT. Reads via PostgREST with that JWT (RLS-scoped). Backend wants `Bearer`.
- **adjust:** `POST /api/inventory/adjust {barcode, locationId, delta, actionId}` → 200 `{available, syncStatus:'pending'}`; **409 "Insufficient stock"** (oversell), **409 "Already processed"** (dup actionId). Worker flips sync_logs `pending→synced`.
- **reset:** `POST /api/demo/reset` (auth) → 200.
- **Login UI (admin & scanner):** inputs pre-filled `demo@syncstock.dev`/`demo1234`. Submit = `page.locator('input[type="password"]').press('Enter')`. Logged-in marker (admin) = `getByText('SyncStock IL')`.
- **Admin InventoryTable row:** `page.locator('div.bg-surface-container-low').filter({hasText: title})`. Inside: qty=`.text-data-stock`; **Receive(+1)**=`row.getByRole('button').filter({hasText:'add'})`; **Sell(-1)**=`...filter({hasText:'remove'})` (disabled at 0). Out-of-stock row has class `border-danger`; low (1–3) has `border-warning`.
- **Dashboard:** stat labels HE — Total SKUs=`סך מוצרים`, Low Stock=`מלאי נמוך`, Out of Stock=`אזל המלאי` (out-of-stock card may not render; prove via red rows instead). Location tabs = buttons `מחסן ראשי` / `חנות תל אביב` (NO "All" tab); active location shown in an `h3`. Stock filter buttons (distinct from tabs) = `getByRole('button',{name:'הכל'})` / `{name:'מלאי נמוך'}`. "Simulate order" button decrements via `/api/orders/webhook`.
- **Activity (`/activity`):** table; each row has `<SyncBadge>` — synced renders text **`סונכרן`** (+ `check_circle`), pending **`מסנכרן...`**. Origin column.
- **Reset button (AppFrame):** `getByRole('button',{name:'איפוס הדמו'})` → modal → confirm `getByRole('button',{name:'אישור'})`.
- **Language toggle (AppFrame):** `getByRole('button',{name:'language'})`. Direction is on a wrapping `div[dir]` (App.jsx), default `rtl`, persists via localStorage `language`. (NOT on `<html>`.)
- **Scanner:** login same pattern at `SCANNER_URL`. Toggle manual: `getByRole('button',{name:'הקלדת קוד'})` (aria-pressed). Input placeholder `הזן ברקוד או מק"ט`; submit = Enter or `חיפוש`. Selected location id = `await page.locator('select').inputValue()`. ProductCard: title visible, stock `מלאי נוכחי:`, **Sell**=`.btn-scan-action.bg-danger` (text `מכירה`, disabled at 0), **Receive**=`.btn-scan-action.bg-success` (`קבלה`). Camera getUserMedia fails headless — manual path is the tested one.

## Remaining specs
**01-auth:** (a) goto `/login`; assert `input` first value=`demo@syncstock.dev`, `input[type=password]` value=`demo1234`; Enter → `await expect(page.getByText('סך מוצרים')).toBeVisible()` and URL is `/`. (b) fresh context, goto `/` → `await page.waitForURL(/\/login/)` (ProtectedRoute).

**02-dashboard:** login. Assert `getByText('סך מוצרים')` & `getByText('מלאי נמוך')` visible; ≥1 row (`div.bg-surface-container-low`). Assert a `border-danger` row exists with qty `0` and its Sell (`remove`) disabled (red badge). Assert a `border-warning` row with qty 1–3 (yellow badge). Tabs: click `חנות תל אביב` → `h3` shows that name; click `מחסן ראשי` back. Filter: click button `מלאי נמוך` → every visible `.text-data-stock` ∈ {1,2,3}; click `הכל` → restores.

**03-sync-loop (CORE — keep trace/video):** login. token=`login(request)`; `getLocations` → main=`[0]`; `inventoryForLocation(main.id)` pick `available>5` → title/barcode. Read UI qty Q on that row. Click Sell(`remove`) → expect qty `Q-1`. Go `/activity` → row `filter({hasText:title})` eventually shows `סונכרן` (timeout 20s) = pending→synced proven. Back to `/`, click Receive(`add`) → qty `Q`.

**04-realtime:** login (page A). Read active `h3` location name; map to id via `getLocations`. Pick a visible product (title+barcode via `inventoryForLocation`). Read UI qty Q. From `request` (no reload): `adjust(+1)` new actionId. `await expect(rowLoc.locator('.text-data-stock')).toHaveText(String(Q+1), {timeout:20000})` — updates without `page.reload()`.

**07-scanner:** goto `SCANNER_URL`; login (Enter on password); wait for `select`. locId=`select.inputValue()`; `inventoryForLocation(locId)` pick `available>0` barcode/title. Click `הקלדת קוד`; fill placeholder input with barcode; Enter. Assert ProductCard `getByText(title)`. Click Sell `.btn-scan-action.bg-danger` → assert card stock decremented; assert `getQty` dropped by 1. (Optional: load admin, same location tab, assert row qty matches.)

**08-reset-demo:** token=login. baseline `q0=getQty(product,loc)`; `adjust(-1)` to dirty. Admin UI: login → reset button `איפוס הדמו` → confirm `אישור`. Assert `getQty===q0` (poll) and dashboard row shows q0.

**09-localization:** login. `await expect(page.locator('div[dir]').first()).toHaveAttribute('dir','rtl')`; assert `סך מוצרים` visible. Click `language` toggle → dir `ltr`, `getByText('Total SKUs')` visible. `page.reload()` → still `ltr` (persistence). Toggle back to he.

## Honest spec↔app deltas (do NOT fake these)
No "Out of Stock" stat card (prove via red rows/disabled Sell). No "All" location tab ("All" is a stock filter). Admin uses +/− icons, not "Sell/Receive" labels (scanner has the labels). No per-row dashboard sync badge — sync status lives in Activity/sync-log SyncBadge. `dir` is on a wrapper div, not `<html>`.
