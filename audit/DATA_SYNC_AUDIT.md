# ROYAL KISSAN ERP — DATA SYNCHRONIZATION ARCHITECTURE AUDIT

## 1. Executive Summary

This document outlines the real-time data synchronization, query invalidation, and state management architecture implemented across all 15+ modules of the Royal Kissan Enterprise ERP.

---

## 2. Global Event & Realtime Architecture

### A. Centralized Event Bus (`src/lib/events/data-sync.ts`)
- **Event Dispatcher**: `emitDataChange(moduleKey)`
- **Module Keys**: `'bills' | 'sales' | 'expenses' | 'products' | 'stock' | 'customers' | 'dealers' | 'drivers' | 'routes' | 'collections' | 'dues' | 'attendance' | 'all'`
- **Mechanism**:
  1. **In-Tab Custom Event**: Fires `CustomEvent('rk_data_changed')` for instant UI component re-renders.
  2. **Cross-Tab LocalStorage Event**: Broadcasts via `localStorage.setItem('rk_last_sync_event')` so open tabs on different browser windows sync instantly.
  3. **Window Focus Auto-Refetch**: Re-evaluates active queries whenever the browser tab regains focus (`visibilitychange` / `focus`).
  4. **Supabase Realtime Postgres Changes**: Listens to PostgreSQL `INSERT / UPDATE / DELETE` broadcasts on public schema tables (`bills`, `expenses`, `products`, `dealers`, `customers`, `stock_transactions`, `collections`).

---

## 3. Module-by-Module Mutation & Invalidation Matrix

| Module | Mutation Action | Database Method | Returned Record | Event Emitted | Affected UI Components |
|---|---|---|---|---|---|
| **Billing POS** | Save Bill | `.insert([billPayload]).select().single()` | Exact Bill Record | `bills`, `stock`, `collections` | Dashboard, Sales History, Stock Matrix, Dues Ledger |
| **Sales History** | Reprint / View | Read-Only | N/A | N/A | Bill Receipt Modal |
| **Product Catalog** | Add / Edit Product | `.insert() / .update().select().single()` | Saved Product Record | `products` | Product Catalog, POS Billing Cart, Stock Matrix |
| **Expenses** | Add / Delete Expense | `.insert() / .delete().select().single()` | Saved Expense Record | `expenses` | Expense Ledger, Profit & Loss, Dashboard KPI |
| **Dealers & Ledger** | Create Dealer / Collect Due / Dealer Bill | `.insert() / .update().select().single()` | Saved Dealer Record | `dealers`, `bills`, `collections` | Dealer Directory, Dealer Ledger, Dashboard Stats |
| **Customers** | Add Customer | `.insert().select().single()` | Saved Customer Record | `customers` | Customer Directory, POS Billing |
| **Stock Management** | Stock In / Out / Adjustment | `.insert().select().single()` | Saved Transaction | `stock` | Stock Matrix, Inventory Warnings |
| **Due Dues** | Collect Due | `.update().select().single()` + `.insert(collection)` | Saved Due Record | `dues`, `collections` | Dues Management, Collections Ledger, Dashboard |
| **Profit & Loss** | Auto Calculation | Read-Only | N/A | Listens to `bills`, `expenses` | Profit & Loss Statement, Monthly Margin KPI |
| **Routes & Drivers** | Save Route Run / Assign Driver | `.insert() / .update()` | Reconciled Run | `drivers`, `routes`, `bills` | Driver Profile, Route Performance, Dashboard |

---

## 4. Immediate Verification Checklist

1. **Bill Creation**:
   - Save Bill &rarr; Database Insert &rarr; Emits `bills` &rarr; Dashboard Today's Sales & Recent Bills update instantly without browser reload.
2. **Expense Entry**:
   - Add Expense &rarr; Database Insert &rarr; Emits `expenses` &rarr; Profit & Loss Net Profit & Dashboard Total Expenses update instantly.
3. **Product Creation**:
   - Add Product &rarr; Database Insert &rarr; Emits `products` &rarr; POS Cart & Product list update instantly.
4. **Dealer Due Payment**:
   - Collect Due &rarr; Database Update &rarr; Emits `dealers`, `collections` &rarr; Dealer Outstanding Balance & Dues list update instantly.
