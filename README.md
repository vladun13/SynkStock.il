# SyncStock IL

> Real-time inventory sync between Shopify and the physical store or warehouse for Israeli e-commerce merchants, with Hebrew support and ERP connectivity.

Built as a PM home assignment: a commercial-opportunity analysis of a 16,000-message Israeli e-commerce community, narrowed to one validated problem, specced into a PRD, and built into a working demo.

---

## 🔗 Live Demo

**App:** https://frontend-admin-euj2ia0cw-nemyrovsky1311vlad-gmailcoms-projects.vercel.app
**Login (pre-filled):** `demo@syncstock.dev` / `demo1234` — just click **Sign in**.

Log in, click **Sell** or **Receive** on any product, and watch the stock change while the badge moves from **syncing…** to **synced ✅** and the activity feed updates live. Try selling the last unit of a low-stock item to see the oversell guard block it. **Reset demo** restores the starting state.

> **This is a demo running in `DEMO_MODE`.** Everything you click runs against the real system: real authentication, a live Postgres database, the actual atomic stock logic, and real-time updates. Only the final outbound call to Shopify is simulated, since no live store is connected. Swapping in the real Shopify API is a single isolated module.

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
| Frontend (admin + scanner) | React, Polaris / Tailwind, Supabase Realtime, react-i18next (Hebrew RTL) |
| Backend | Node.js + Express, pg-boss (Postgres queue) |
| Database / Realtime / Auth | Supabase (Postgres) |
| Scanning | zxing-browser (EAN-13 + QR) |
| Hosting | Vercel (frontends) + Render (backend + worker) |

## Repo / Docs

| Doc | What it is |
|---|---|
| [PRD](./docs/prd/PRD-SyncStock-IL.md) | The *what* — goals, ICP, scope, requirements, success metrics, risks |

## Run Locally

```bash
# Backend (Express + pg-boss worker)
cd backend && npm install
cp .env.example .env        # fill in Supabase URL + keys + connection strings
npx knex migrate:latest     # against DIRECT_URL (:5432)
node db/seed.js             # seed demo data
npm start

# Admin frontend
cd frontend-admin && npm install && npm start   # localhost:3001

# Scanner PWA
cd frontend-scanner && npm install && npm start  # localhost:3002
```

Requires a Supabase project (free tier) with Realtime enabled on `inventory_levels` and `sync_logs`:
```sql
alter publication supabase_realtime add table inventory_levels;
alter publication supabase_realtime add table sync_logs;
```

## Status

- ✅ Working demo (`DEMO_MODE`): auth, atomic sync, Realtime, multi-location, oversell guard, scanner + manual entry, reset.
- 🔜 Production: real Shopify OAuth + GraphQL (single module swap), live Priority/Odoo push, webhook HMAC + shop resolution.

---

*Built by Vlad Nemyrovskyi as a Product Manager home assignment.*
