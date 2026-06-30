# SyncStock IL — E2E Test Report

**Date:** 2026-06-30
**Runner:** Playwright 1.48 (chromium 149.0.7827.55)
**Mode:** `DEMO_MODE=true` against live Supabase, real pg-boss worker, real Realtime
**Stack under test:** backend `:3000` · admin `:3001` · scanner `:3002`
**Config:** `workers: 1`, `fullyParallel: false` (shared demo DB → deterministic), demo stock reset to seeded baseline in `globalSetup` and per-spec `beforeEach`.

## Summary

| | |
|---|---|
| Specs | 9 |
| Tests | **12 passed / 0 failed** |
| Duration | ~38s (full suite) |

```
✓ 01-auth          (2)   ✓ 04-realtime    (1)   ✓ 07-scanner      (1)
✓ 02-dashboard     (1)   ✓ 05-oversell    (2)   ✓ 08-reset-demo   (1)
✓ 03-sync-loop     (1)   ✓ 06-idempotency (2)   ✓ 09-localization (1)
```

## Coverage by spec

| Spec | Proves | Layer |
|---|---|---|
| 01-auth | Pre-filled demo creds log in → dashboard; unauthenticated `/` redirects to `/login` (ProtectedRoute) | UI |
| 02-dashboard | Stat labels; out-of-stock row (danger, qty 0, Sell disabled); low-stock row (warning, qty 1–3); location tabs; low-stock filter | UI |
| 03-sync-loop | **CORE:** UI sell → dashboard decrements → Activity shows `סונכרן` (pending→synced via worker) → receive restores. Trace + video retained. | UI + worker |
| 04-realtime | Out-of-band API `adjust(+1)` updates the open dashboard **without reload** (Supabase Realtime) | UI + Realtime |
| 05-oversell | **Non-negotiable:** two concurrent −1 on a qty-1 product → exactly one 200 + one 409, final stock 0; UI blocks a second sell of the last unit | API + UI |
| 06-idempotency | Same `actionId` twice → second 409, single decrement; concurrent duplicate → one 200, one 409, single decrement | API |
| 07-scanner | Manual barcode entry → ProductCard → sell decrements source of truth (camera path is headless-blocked, manual path tested) | UI + API |
| 08-reset-demo | `POST /api/demo/reset` via admin UI restores a dirtied product to baseline (UI + DB) | UI + API |
| 09-localization | Hebrew RTL default; toggle → English LTR; persists across reload | UI |

The three correctness invariants from CLAUDE.md are all exercised: **atomic** (05), **idempotent** (06), **origin-tagged sync loop** (03).

## Findings — live-app facts discovered & resolved

These were real selector/timing facts about the running app, fixed in the specs (not worked around by weakening assertions):

1. **`מלאי נמוך` is ambiguous** — matches a stat-card `<span>` and the filter `<button>`. Resolved with `.first()` for the visibility check.
2. **Product rows vs. activity-log panel** — both use `bg-surface-container-low`. Product rows are `.rounded-md`; the recent-activity panel is `.rounded`. Row selectors scoped to `.rounded-md` (also fixed a latent strict-mode violation in the pre-existing 05-oversell UI test).
3. **Dashboard rows hydrate async** from Supabase — must await the first row before counting (the unscoped count previously "passed" only by matching the always-present log panel).
4. **Reset trigger is an icon-only button** — its accessible name is the Material-Symbols ligature, not the title. Targeted by `title="איפוס הדמו"`; confirm dialog uses `t('confirm')` = `אישור`.
5. **Scanner location `<select>` populates async** — visible before its value is set; reading too early sent `location_id=eq.` → PostgREST 400 (`invalid input syntax for type uuid: ""`). Resolved by polling for a non-empty location id.

## Known limitations

- **Scanner camera path not covered** — `getUserMedia` fails headless; the manual barcode-entry path is the tested equivalent.
- **Shared demo DB** — suite must run single-worker, serially; parallelism would race on stock state.
- **Transient sync-timing** — 03's Activity `סונכרן` assertion depends on the worker flipping pending→synced within 20s; observed one transient miss in a shared-state run that passed on isolation and re-run. Not a product defect; flag if it recurs in CI.

## Reproduce

```bash
# backend prerequisites (once)
cd backend && npm run migrate && npm run seed

# servers (backend:3000, admin:3001, scanner:3002) — Playwright webServer
# can boot them, or run them yourself and rely on reuseExistingServer
cd e2e && npm install && npx playwright install chromium
npm run test:e2e            # full suite
npm run test:report         # open HTML report
```

Artifacts (trace / video / screenshots) are written to `e2e/test-results/` and `e2e/playwright-report/`.
