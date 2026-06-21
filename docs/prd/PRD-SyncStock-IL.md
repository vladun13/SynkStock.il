# SyncStock IL — Product Requirements Document

> Real-time inventory sync between Shopify and the physical store/warehouse for Israeli e-commerce merchants — with Hebrew support and ERP connectivity.

**Status:** Draft for review · **Version:** 1.0 (MVP) · **Last updated:** 2026-06-20
**Owner:** Product · **Related docs:** [Opportunity Analysis](./syncstock-assignment-final.md) · [Build Spec / Claude Code prompt](./syncstock-claude-code-prompt-v3.md)

---

## Table of Contents
1. [Overview](#1-overview)
2. [Problem](#2-problem)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [Target Users (ICP & Personas)](#4-target-users-icp--personas)
5. [Market Opportunity](#5-market-opportunity)
6. [Competitive Landscape](#6-competitive-landscape)
7. [Scope — MVP](#7-scope--mvp)
8. [User Stories & Acceptance Criteria](#8-user-stories--acceptance-criteria)
9. [Functional Requirements](#9-functional-requirements)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Success Metrics](#11-success-metrics)
12. [Risks & Mitigations](#12-risks--mitigations)
13. [Release Plan](#13-release-plan)
14. [Out of Scope](#14-out-of-scope)
15. [Open Questions](#15-open-questions)

---

## 1. Overview

SyncStock IL is a Shopify app that keeps a merchant's stock levels accurate across their **online store and their physical store/warehouse**, in real time, via barcode scanning — with a **Hebrew, RTL interface and human Hebrew support**, and optional sync to Israeli ERPs (Priority, Odoo).

**Why now:** Israeli SMB merchants increasingly sell both online (Shopify/WooCommerce) and offline. When a unit sells in-store, the online stock doesn't update — causing overselling, refunds, and manual double-entry. Existing tools exist (notably MFlow) but merchants in the target community actively seek alternatives over poor support and missing Hebrew UX. The opportunity is not "no solution exists" — it's **a better-executed, locally-supported one.**

**One-line value proposition:** *Stop overselling. One scan keeps your Shopify, your shop floor, and your ERP in sync — in Hebrew, with a human to call.*

---

## 2. Problem

Merchants who sell online (Shopify) **and** offline (physical store / warehouse) cannot keep stock in sync, causing:

- **Overselling** — a customer buys online a unit that was just sold in-store → cancellation, refund, angry customer, lost sale.
- **Manual double-entry** — staff update Shopify by hand after offline sales → error-prone and time-consuming.
- **No unified view** — merchants with multiple locations can't see total stock without logging into separate systems.

### Evidence (from the source WhatsApp community, verified in the raw export)

> *"הי, אני מחפשת פתרון לניהול מלאי במחסן קטן שיסתנכרן עם האתר."*
> — Looking for a small-warehouse inventory solution that syncs with the site.

> *"אני מזינה הכל באתר אבל אם לקוחה מגיעה פיזית לרכוש או מבצעת החלפה, אני צריכה לעדכן מלאי באתר בהתאמה."*
> — I enter everything on the site, but if a customer buys or exchanges in person, I have to update the site stock manually.

> *"אז מה יש עוד חוץ מ mflow?"* — So what else is there besides MFlow?

Signal density in the export: `MFlow` 9×, `barcode/ברקוד` 51×, `Priority` 22×, `Odoo` 31× — real products, real comparison, real workflow need.

---

## 3. Goals & Non-Goals

### Goals (MVP)
- **G1** — Keep Shopify stock accurate against physical (warehouse/store) stock in real time via barcode scanning.
- **G2** — Eliminate overselling caused by offline sales not reflecting online.
- **G3** — Provide a Hebrew, RTL interface and human Hebrew onboarding/support (the explicit gap vs incumbents).
- **G4** — Optionally sync stock to a connected Israeli ERP (Priority or Odoo).
- **G5** — Install and reach first successful sync without a developer.

### Non-Goals (MVP)
- Purchase-order management / procurement.
- Full bidirectional real-time ERP sync (MVP is one-way push + manual pull).
- Platforms beyond Shopify (WooCommerce is a fast-follow, not MVP).
- QR codes (EAN/UPC/internal barcodes only).
- Demand forecasting / analytics beyond low-stock alerts.

---

## 4. Target Users (ICP & Personas)

**ICP:** the **omnichannel Israeli SMB** — a Shopify merchant who *also* sells from a physical store or manages a warehouse, runs Hebrew-first, is non-technical, and has a small team. This is the subset of Israeli Shopify merchants for whom online↔offline drift is a daily problem.

| Persona | Description | Primary need |
|---|---|---|
| **P1 — Owner-operator (primary)** | Runs a Shopify store + a physical shop/warehouse, 1–5 staff, non-technical | "Stop overselling without manual updates; talk to a human in Hebrew when stuck" |
| **P2 — Warehouse/shop staff** | Scans/receives/sells stock on the floor | "Fast, reliable scanning that just works, even when WiFi drops" |
| **P3 — ERP-bound merchant (secondary)** | Uses Priority/Odoo as their system of record | "Keep my ERP stock aligned with Shopify without a custom developer" |

---

## 5. Market Opportunity

Directional, bottom-up from public data (full detail in the [Opportunity Analysis](./syncstock-assignment-final.md)). Anchors: ~10,900 live Shopify stores in Israel; ~20,000–31,600 WooCommerce; blended ARPU ≈ $60/mo.

| Layer | Definition | Estimate |
|---|---|---|
| **TAM** | All Israeli Shopify + Woo SMBs managing inventory | ~$22–30M/yr |
| **SAM** | Omnichannel subset (online + physical/warehouse), ~35% assumed | ~$7.6M/yr |
| **SAM (beachhead)** | Shopify-only omnichannel | ~$2.7M/yr |
| **SOM (3 yr)** | 5–10% of beachhead → ~190–380 merchants | ~$140–280K ARR |

> **Key assumption to validate:** the *omnichannel rate* among Israeli Shopify merchants (share with a physical store/warehouse). The SAM hinges on it. See [Open Questions](#15-open-questions).

---

## 6. Competitive Landscape

| Solution | What it is | Gap merchants hit |
|---|---|---|
| **MFlow** | Israeli bidirectional inventory sync | Chat-only support, no onboarding help; merchants compare/seek alternatives |
| **Odoo** | Global ERP + Shopify connector | Foreign support, overbuilt for small merchants |
| **Priority Zoom** | Israeli ERP | Needs a developer to integrate with Shopify; not Shopify-native |
| **Shopify POS** | Native POS | English-first, no warehouse barcode workflow, requires POS Pro |
| **Stocky / inFlow / Katana** | Global inventory apps | No Hebrew RTL, no Israeli support, no local ERP bridge |

**Differentiation:** the only solution combining **Shopify-native barcode sync + Hebrew RTL UX + Hebrew human support + Priority/Odoo bridge.** Positioning: *the better MFlow.*

---

## 7. Scope — MVP

Prioritized; implementation detail in the [Build Spec](./syncstock-claude-code-prompt-v3.md).

### P0 — The Sync Loop (Shopify)
- OAuth install (no-code) and full (paginated) product pull from Shopify.
- Barcode assignment (auto-generate internal barcode where missing; merchant override).
- **Scan → atomic stock update → push to Shopify**, live to the dashboard.
- Order webhook handling that propagates to local + ERP **without** re-decrementing Shopify.
- Low-stock alerts via WhatsApp.
- Hebrew RTL interface (default Hebrew).

### P1 — ERP Bridge (the differentiator)
- ERP settings (Priority/Odoo) with test-connection.
- Product mapping (SKU ↔ ERP part number) with auto-match + manual linking.
- One-way stock push SyncStock → ERP (queued, retried).
- Manual "Sync from ERP" pull for initial alignment.

### P2 — Multi-Location & Resilience
- Multiple locations mapped to Shopify location IDs.
- Offline scanner mode (queue + auto-sync).
- Reconciliation/drift detection across SyncStock / Shopify / ERP.

---

## 8. User Stories & Acceptance Criteria

**US-1 — Install without a developer (P1)**
*As a merchant, I want to install and connect Shopify in minutes so I can start syncing without code.*
- Given a Shopify store, when I install and complete OAuth, then my full catalog (all products, not just 250) is pulled within the onboarding flow.

**US-2 — Scan to update (P2 staff)**
*As warehouse staff, I want to scan a barcode and adjust stock so the change reflects everywhere instantly.*
- Given a known barcode, when I scan and choose Receive/Sell/Move, then Shopify stock and the dashboard update within 3 seconds.
- Concurrent adjustments to the **last unit cannot both succeed** (no oversell).

**US-3 — Offline sale doesn't oversell online (P1)**
*As a merchant, I want an in-store sale to reduce online stock automatically.*
- Given a unit sold in-store (scanned as Sell), when the sale is recorded, then Shopify availability decreases accordingly and the item shows out-of-stock online when it reaches zero.

**US-4 — Keep my ERP aligned (P3)**
*As an ERP-bound merchant, I want stock changes to flow to Priority/Odoo without a developer.*
- Given a mapped product and a connected ERP, when stock changes in SyncStock, then the same delta is pushed to the ERP; on failure it retries and alerts.

**US-5 — Hebrew, with a human (P1)**
*As a Hebrew-speaking merchant, I want the app and support in Hebrew.*
- Given Hebrew is selected (default), then the UI is fully RTL; and human Hebrew support is reachable within the stated SLA.

**US-6 — Work when WiFi drops (P2)**
*As warehouse staff, I want scanning to keep working offline.*
- Given no connection, when I scan, then actions queue locally and auto-sync (idempotently) on reconnect.

---

## 9. Functional Requirements

- **FR-1** Full, paginated product/variant/inventory pull from Shopify on install.
- **FR-2** Barcode scan endpoint applies stock deltas **atomically** (transaction + row lock); rejects unknown barcodes.
- **FR-3** Order webhook (`orders/create`) is idempotent (dedupe by order ID) and propagates to local DB + ERP **only** (Shopify already decremented).
- **FR-4** Every stock change is tagged with an **origin** (scan/order/erp/manual) to prevent sync loops.
- **FR-5** ERP connect/test/map/push (Priority + Odoo); push is queued with retry + dead-letter.
- **FR-6** Manual ERP pull updates SyncStock → Shopify.
- **FR-7** Multi-location stock mapped to Shopify locations.
- **FR-8** Low-stock alerts via WhatsApp, threshold configurable per location.
- **FR-9** Hebrew/English toggle (default Hebrew), full RTL.

---

## 10. Non-Functional Requirements

- **NFR-1 — No oversell (the headline requirement).** Stock math is atomic and concurrency-safe; two simultaneous sales of the last unit can never both succeed. This is the product's core promise and a tracked metric.
- **NFR-2 — Latency.** Scan-to-Shopify-and-dashboard reflect within **3 seconds** (p95).
- **NFR-3 — Reliability.** ≥ 99.5% of sync operations succeed without manual intervention; failed ERP pushes retry (3×, backoff) then dead-letter with alert.
- **NFR-4 — Resilience.** Scanner works offline and reconciles idempotently on reconnect.
- **NFR-5 — Security & tenancy.** Per-shop data isolation (RLS); ERP credentials encrypted at rest; Shopify OAuth + HMAC-verified webhooks.
- **NFR-6 — Localization.** Full Hebrew RTL; ₪ currency.
- **NFR-7 — Onboarding.** Median time-to-first-successful-sync ≤ 1 day, no developer required.

---

## 11. Success Metrics

| Metric | Target |
|---|---|
| Activation (install → first successful sync within 24h) | ≥ 60% |
| Median time-to-first-sync | ≤ 1 day |
| Trial → paid conversion | ≥ 25% |
| Sync reliability (no oversell) | ≥ 99.5% of syncs |
| Monthly logo churn | < 3% |
| Hebrew support first-response time | < 2 hours |

**North-star:** number of merchants with **zero oversell incidents** while active — the proof the product delivers its core promise.

---

## 12. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| MFlow improves support and closes the gap | Medium | Compete on the bundle (Hebrew UX + barcode + ERP bridge + human support), build reputation fast in the community |
| Omnichannel segment smaller than assumed (SAM risk) | Med-High | Validate omnichannel rate *before* heavy build (landing-page/pre-sell test in the WhatsApp group) |
| ERP API maintenance burden (Priority/Odoo changes) | Medium | Limit MVP to 2 ERPs; isolate behind an adapter; one-way push reduces surface area |
| Concurrency oversell (own failure mode) | Medium | Atomic decrements + reservation locks; "0 oversells" as a tracked KPI |
| Shopify ships better native inventory | Low-Med | Stay Israel-specific (Hebrew support, local ERP, barcode workflow) where Shopify won't localize |
| Thin SMB willingness-to-pay for an ops tool | Medium | Anchor pricing on prevented oversells (lost-sale + refund cost) and saved hours |

---

## 13. Release Plan

- **Phase 1 — Shopify beachhead.** P0 sync loop + Hebrew RTL + WhatsApp alerts → P1 ERP bridge. Distribute via Shopify App Store + the WhatsApp community (728 merchants) + free trial with a 1-hour Hebrew setup call.
- **Phase 2 — WooCommerce expansion.** ~112 merchants in the community; weaker native inventory tooling. Sync engine is platform-agnostic from day one to enable this.

---

## 14. Out of Scope

Purchase orders / procurement · full real-time bidirectional ERP sync · platforms beyond Shopify (MVP) · QR codes · demand forecasting · non-Israeli merchants.

---

## 15. Open Questions

1. **Omnichannel rate** — what share of Israeli Shopify merchants run a physical store/warehouse? (Determines SAM; highest-priority validation.)
2. **Source-of-truth default** — keep SyncStock authoritative, or offer "ERP is source of truth" for Priority-led merchants at launch?
3. **Pricing in ₪** — finalize tier pricing and whether ERP sync is Pro-only.
4. **Which ERP first** — confirm Priority vs Odoo demand split to sequence integration depth.
