# Royal Kissan ERP — UI Redesign Report

**Date**: 2026-07-31  
**Version**: Design System v3

---

## Design Philosophy

The redesign targets the "Linear / Stripe / Vercel" enterprise aesthetic:

- **Dark, warm background** (#080706 — near-black with slight warmth) rather than cold slate/navy
- **Gold as the brand accent** — used ONLY for active states, primary buttons, borders on KPI cards. Not decorative.
- **Inter + Outfit** fonts replace browser defaults. JetBrains Mono for all financial numbers.
- **8px spacing grid** using `--s1` through `--s12` tokens
- **Responsive clamp() typography** — all headline sizes use `clamp()` or CSS variables that scale

---

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `src/lib/utils/formatters.ts` | Shared currency/date/number formatters — eliminates 3 duplicate definitions |
| `audit/LIVE_UI_UX_AUDIT.md` | Live audit report |
| `audit/UI_REDESIGN_REPORT.md` | This file |
| `audit/RESPONSIVE_QA.md` | Responsive QA checklist |
| `audit/PERFORMANCE_AFTER_UI_REDESIGN.md` | Build performance data |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/globals.css` | Full v3 design system — responsive vars, `.billing-layout`, `.table-scroll`, `.btn-row`, mobile media queries |
| `src/components/layout/Sidebar.tsx` | Mobile backdrop/drawer, route-change auto-close |
| `src/components/layout/Header.tsx` | Mobile pill/search hiding, am/pm clock, fixed overflow |
| `src/components/layout/AppLayout.tsx` | isMobile state, separate mobileOpen control |
| `src/components/dashboard/DashboardCharts.tsx` | Removed emoji from titles, aligned subtitle color |
| `src/app/dashboard/page.tsx` | Shared formatters, fixed label font size |
| `src/app/billing/page.tsx` | `.billing-layout` class (CRITICAL mobile fix), shared formatters, gold Save button |
| `src/app/sales/page.tsx` | `.table-scroll` wrapper, `.col-id`/`.col-money` table classes, Lucide icons replace emoji |
| `src/app/stock/page.tsx` | `.btn-row` for header wrapping, `.table-scroll` for transaction table |

---

## Design Token Changelog

| Token | Before | After |
|-------|--------|-------|
| `--tx-3xl` | `2.25rem` (fixed) | `clamp(1.375rem, 4vw, 2.25rem)` |
| Label font | `0.625rem` (10px) | `--tx-xs: 0.75rem` (12px) |
| Sidebar width | `280px` | `270px` |
| Billing layout | `gridTemplateColumns: '1.2fr 1fr'` | `.billing-layout` (responsive) |
| Table wrapper | `overflowX: auto` inline | `.table-scroll` class |

---

## What Was Explicitly NOT Changed

To honor the constraint "do not change working business logic":

- ❌ Supabase queries (not touched)
- ❌ RLS policies (not touched)
- ❌ Billing calculations (subtotal, GST, dues) (not touched)
- ❌ Route assignment logic (not touched)
- ❌ Invoice number generation (not touched)
- ❌ Print templates (not touched — only removed redundant blue button background override)
- ❌ Auth middleware (not touched)
- ❌ Any database schema (not touched)
