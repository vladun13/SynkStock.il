# SyncStock IL

> Real-time inventory sync between Shopify and the physical store or warehouse for Israeli e-commerce merchants, with Hebrew support and ERP connectivity.

Built as a PM home assignment: a commercial-opportunity analysis of a 16,000-message Israeli e-commerce community, narrowed to one validated problem, specced into a PRD, and built into a working demo.

---

## Live Links

| App | URL | Description |
|---|---|---|
| **Admin Dashboard** | https://frontend-admin-one-gilt.vercel.app | Inventory management, sync log, ERP settings |
| **Scanner PWA** | https://frontend-scanner.vercel.app | Barcode scanner with offline queue |
| **Landing Page** | https://frontend-landing-three.vercel.app | Marketing site with pricing |

**Login (pre-filled):** `demo@syncstock.dev` / `demo1234` — just click **Sign in**.

Log into the admin and pick a location tab — you'll see the 30 products. In the scanner, scan/enter a barcode (e.g. `0000400000051`) and tap decrement; the admin dashboard updates via Realtime.

### User Flow

```
Landing Page  →  (Login / CTA buttons)  →  Admin Dashboard  →  (Open Scanner button)  →  Scanner PWA
```

1. **Landing page** — marketing site with pricing. All CTA buttons + nav "Login" link redirect to the admin login page.
2. **Admin dashboard** — log in, manage inventory, view sync logs, configure ERP. Top nav has a gradient "Open Scanner" button that launches the scanner PWA in a new tab.
3. **Scanner PWA** — scan barcodes, adjust stock offline/online, syncs back to the admin dashboard in real time.

Cross-app URLs are configured via env vars: `REACT_APP_ADMIN_URL` (landing), `REACT_APP_SCANNER_URL` (landing + admin).

> **This is a demo running in `DEMO_MODE`.** Everything you click runs against the real system: real authentication, a live Postgres database, the actual atomic stock logic, and real-time updates. Only the final outbound call to Shopify is simulated, since no live store is connected. Swapping in the real Shopify API is a single isolated module.

---

## Design

The UI is built from a custom **Inventory Core** design system (created in Google Stitch), applied across all three frontends:

- **Colors:** Primary gradient (`#3953bd` → `#754aa1`), stock-status coding (success `#22c55e` / warning `#f59e0b` / danger `#ef4444`), Material-3 surface tonal layers
- **Typography:** Rubik (headlines, stock numbers), Heebo (body, Hebrew), Inter (labels, SKUs)
- **Shapes:** 8px radius (cards/buttons), pill-shaped badges, 24px scanner viewfinder
- **Icons:** Material Symbols Outlined
- **Layout:** Hebrew RTL default with English LTR toggle, responsive from 320px (mobile bottom nav) to 1280px+ (desktop sidebar)
- **Implementation:** Tailwind CSS v3 with design tokens — no Polaris visual layer (Polaris dep remains in admin but the chrome is Tailwind)

### QA Results (Browser Use v2 cloud agents)

| Frontend | Score | Judge | Notes |
|---|---|---|---|
| Landing Page | 5/5 | PASS | All sections render, nav scrolls, RTL/LTR toggle, 375px responsive |
| Scanner PWA | 5/5 | PASS | Viewfinder, scan line, location selector, bottom nav, mobile layout |
| Admin Dashboard | 4/5 | PASS (UI) | Login, navigation, i18n, responsive all work; data loading requires backend running |

---

## The Problem

Israeli SMB merchants increasingly sell both **online (Shopify) and offline (physical store or warehouse)**. When a unit sells in-store, the online stock doesn't update, which causes **overselling**, refunds, angry customers, and manual double-entry. Tools like MFlow already exist, but merchants in the source community keep asking for alternatives because of poor support and missing Hebrew UX.

So the demand is already proven. **The opening is to execute it better: faster setup, Hebrew-first, with a human to call.**

## What It Does

- **Barcode scan or manual entry** updates stock everywhere in real time.
- **No overselling.** Atomic, concurrency-safe stock math is the core guarantee.
- **Unified multi-location view:** warehouse and store stock in one place.
- **Hebrew, RTL, with human support.** This is the gap incumbents leave open.
- **ERP bridge:** optional sync to Priority or Odoo.
- **Low-stock alerts**, an offline-capable scanner, and a live dashboard.

## How It Works

```
Scan / click  →  atomic update (Supabase Postgres)  →  outbox  →  worker → Shopify/ERP
                          │                                            │
                          └──────────  Supabase Realtime  ────────────→ live dashboard
```

- **Atomic oversell guard:** `UPDATE … WHERE available + delta >= 0`. Two concurrent sales of the last unit cannot both succeed.
- **Transactional outbox plus a pg-boss worker:** the external sync is queued in the same DB transaction, then pushed async, so the UI shows `pending → synced ✅` over Realtime.
- **Idempotent** scans and webhooks, **origin-tagged** changes to prevent sync loops, and **per-shop RLS** for tenant isolation.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend (admin + scanner + landing) | React (CRA), Tailwind CSS v3, Supabase Realtime, react-i18next (Hebrew RTL) |
| Backend | Node.js + Express, pg-boss (Postgres queue) |
| Database / Realtime / Auth | Supabase (Postgres) |
| Scanning | @zxing/browser + @zxing/library (EAN-13 + QR) |
| Offline | IndexedDB via idb (scanner PWA) |
| Hosting | Vercel (3 frontends) + Render (backend + worker) |

## Architecture

```
syncstock/
├── backend/
│   ├── server.js                # CORS, route mounts, pg-boss startup
│   ├── config.js                # validateEnv + getIntegrationStatus
│   ├── db/{supabase.js, migrate.js, migrations/, seed.js}
│   ├── middleware/auth.js       # requireAuth → req.shopId = user.id
│   ├── routes/{health,inventory,orders,erp,demo}.js
│   ├── services/{shopifyClient,odooClient,barcodeService,syncEngine}.js
│   └── __tests__/               # jest: inventory, orders, erp
├── frontend-admin/     # CRA + Tailwind + Supabase Realtime — dashboard, activity, ERP settings
├── frontend-scanner/   # CRA PWA + @zxing/browser + idb offline queue
├── frontend-landing/   # CRA + Tailwind marketing page (hero, pricing, CTA)
└── docs/prd/PRD-SyncStock-IL.md
```

## Repo / Docs

| Doc | What it is |
|---|---|
| [PRD](./docs/prd/PRD-SyncStock-IL.md) | The *what* — goals, ICP, scope, requirements, success metrics, risks |
| [CLAUDE.md](./CLAUDE.md) | Architecture decisions, patterns, build phases |

## Run Locally

```bash
# Backend (Express + pg-boss worker)
cd backend && npm install
cp .env.example .env        # fill in Supabase URL + keys + connection strings
npm run migrate             # against DIRECT_URL (:5432)
npm run seed                # seed 30 demo products across 2 locations
npm start                   # :3000

# Admin frontend
cd frontend-admin && npm install
cp .env.example .env    # fill in Supabase URL + anon key + API URL + scanner URL
npm start               # :3001

# Scanner PWA
cd frontend-scanner && npm install
cp .env.example .env    # fill in Supabase URL + anon key + API URL
npm start               # :3002

# Landing page
cd frontend-landing && npm install
cp .env.example .env    # fill in admin URL + scanner URL
npm start               # :3003
```

Cross-app navigation uses env vars (defaults to localhost):
```bash
# frontend-landing/.env.local
REACT_APP_ADMIN_URL=http://localhost:3001
REACT_APP_SCANNER_URL=http://localhost:3002

# frontend-admin/.env.local
REACT_APP_SCANNER_URL=http://localhost:3002
```

Requires a Supabase project (free tier) with Realtime enabled on `inventory_levels` and `sync_logs`:
```sql
alter publication supabase_realtime add table inventory_levels;
alter publication supabase_realtime add table sync_logs;
```

## Status

- ✅ Working demo (`DEMO_MODE`): auth, atomic sync, Realtime, multi-location, oversell guard, scanner + manual entry, reset.
- ✅ Three frontends with custom Inventory Core design system (Stitch), responsive, RTL/i18n.
- ✅ QA tested via Browser Use cloud agents (landing 5/5, scanner 5/5, admin 4/5).
- 🔜 Production: real Shopify OAuth + GraphQL (single module swap), live Priority/Odoo push, webhook HMAC + shop resolution.

---

*Built by Vlad Nemyrovskyi as a Product Manager home assignment.*
