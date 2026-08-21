# Royal Kissan ERP — Responsive QA Checklist

**Date**: 2026-07-31

## Breakpoints Tested

| Viewport | Device Equivalent |
|----------|-----------------|
| 390px | iPhone 15, most Android flagships |
| 640px | Small tablet landscape / phablet |
| 768px | iPad portrait, small laptop |
| 1024px | iPad landscape, standard laptop |
| 1440px | Full desktop |
| 1920px | Wide desktop |

---

## Critical Path — Billing

| Test | 390px | 640px | 768px | 1440px |
|------|-------|-------|-------|--------|
| Bill Config section visible | ✅ | ✅ | ✅ | ✅ |
| Line Items section visible (no overflow) | ✅ | ✅ | ✅ | ✅ |
| Save & Generate Bill button — full width | ✅ | ✅ | ✅ | ✅ |
| Invoice number input readable | ✅ | ✅ | ✅ | ✅ |
| Form fields touch-friendly (44px min height) | ✅ | ✅ | ✅ | ✅ |
| Payment mode buttons wrap (no overflow) | ✅ | ✅ | ✅ | ✅ |

---

## Tables

| Page | Table scrolls on mobile | Invoice nowrap | Money right-aligned |
|------|------------------------|----------------|---------------------|
| /sales | ✅ `.table-scroll` | ✅ `.col-id` | ✅ `.col-money` |
| /stock | ✅ `.table-scroll` | — | ✅ |
| /customers | ✅ | — | ✅ |
| /employees | ✅ | — | ✅ |

---

## Header

| Test | 390px | 768px | 1440px |
|------|-------|-------|--------|
| Status pills hidden | ✅ hidden | ✅ hidden | ✅ visible |
| Search bar hidden | ✅ hidden | ✅ hidden | ✅ visible |
| Time display hidden | ✅ hidden | ✅ visible | ✅ visible |
| Menu button visible | ✅ | ✅ | ✅ |
| User avatar visible | ✅ | ✅ | ✅ |

---

## Sidebar

| Test | 390px | 1440px |
|------|-------|--------|
| Sidebar hidden (off-screen) | ✅ | — |
| Hamburger opens drawer | ✅ | — |
| Backdrop closes drawer | ✅ | — |
| Route change closes drawer | ✅ | — |
| Collapse/expand works | — | ✅ |

---

## Dashboard

| Test | 390px | 1440px |
|------|-------|--------|
| Page title clamp (no overflow) | ✅ | ✅ |
| KPI cards wrap in auto-fill grid | ✅ | ✅ |
| Secondary stat cards 2-column on mobile | ✅ | ✅ |
| Charts responsive (ResponsiveContainer) | ✅ | ✅ |

---

## Stock Page

| Test | 390px | 1440px |
|------|-------|--------|
| Action buttons wrap (no page overflow) | ✅ `.btn-row` | ✅ |
| Stock cards auto-fill grid | ✅ | ✅ |
| Transaction table scroll | ✅ | ✅ |

---

## Known Remaining Issues (Post v3)

These are out of scope for this pass (business logic or design preference items):

- `/deliveries` and `/employees` tables: still use the older class patterns — could benefit from full rewrite
- Some pages still use emoji as category indicators (stock card icons) — acceptable as they are purely decorative
- Recharts charts do not handle very narrow viewports (<350px) well — Recharts library limitation
