# ROYAL KISSAN ERP — DEALERS DATABASE AUDIT REPORT

## 1. Table Verification Status
We inspected the remote Supabase database and compared it against the application source code and schema files.

| Table | Status in DB | Issue Found |
|---|---|---|
| `dealers` | ✅ EXISTS | Empty. Credit limit column is type `numeric(10,2)`. Needs indexes on lowercase name searches. |
| `dealer_products` | ✅ EXISTS | Empty. Unique constraint on `(dealer_id, product_id)` is active. |
| `dealer_sales` | ✅ EXISTS | Empty. Has foreign keys referencing `bills` and `dealers`. |
| `dealer_ledger` | ✅ EXISTS | Empty. Missing RLS updates for Returns & Leakages. |
| `dealer_collections` | ❌ MISSING | **CRITICAL BUG**: Referenced in `dealers/page.tsx` line 114 but does not exist in PostgreSQL. |
| `customer_ledger` | ❌ MISSING | **CRITICAL BUG**: Referenced in `dealers/page.tsx` line 121 and `billing/page.tsx` line 309 but does not exist in PostgreSQL. |
| `customers` | ✅ EXISTS | Empty. Customer type check includes 'dealer'. |
| `customer_dues` | ✅ EXISTS | Empty. Exist as a **Table** in PostgreSQL, but `supabase-schema.sql` tries to declare it as a **View** on top of `customers` and `sales`. This naming collision caused errors in previous script executions. |
| `sales` | ✅ EXISTS | Empty. |
| `bills` | ✅ EXISTS | Empty. |
| `collections` | ✅ EXISTS | Empty. (Driver/Route collections). |
| `route_sales` | ✅ EXISTS | Empty. |
| `dealer_transactions`| ❌ MISSING | Legacy table name, replaced by `dealer_ledger`. |
| `dealer_returns` | ❌ MISSING | Needs to be created for Return Management (Phase 4). |
| `leakage_management` | ❌ MISSING | Needs to be created for Leakage Management (Phase 5). |

---

## 2. Technical Findings & Vulnerabilities

### A. Missing Tables & Mismatches
1. **`dealer_collections` Table Missing:**
   The client code inserts collections here, but the table does not exist. Any attempt to record a payment in the Dealers UI throws a PostgREST error.
2. **`customer_ledger` Table Missing:**
   The client code writes billing and collections here. Since it's missing, no history can be populated in the ledger tabs.
3. **Trigger Function Mismatches:**
   `trg_sync_dealer_collections` attempts to listen to inserts on the non-existent `dealer_collections` table, meaning this trigger is either broken or completely inactive in the database.

### B. Name Conflict Mismatch
- `customer_dues` exists as a table. However, `supabase-schema.sql` tries to do:
  `CREATE OR REPLACE VIEW customer_dues AS ...`
  This causes PostgreSQL to fail with a name collision error if run sequentially. We must drop the view if it is not used, or clean up the naming convention.

### C. Missing Inventory Triggers
- There are no database triggers to automatically adjust stock counts when returns are approved or when leakages are recorded. Everything must be updated manually, creating high risks of data divergence.

### D. Missing Reset Columns
- Active transaction tables do not have an `is_archived` column. If a reset is triggered in the dashboard, the ERP would have to permanently delete records, which violates Phase 9 compliance ("Never permanently delete business transactions").

---

## 3. Recommended Fixes

1. **Create Missing Tables:** Create `dealer_collections`, `customer_ledger` with proper types, foreign keys, and indexes.
2. **Resolve Name Collision:** Explicitly drop any view named `customer_dues` and ensure it runs cleanly.
3. **Create Returns & Leakage Schemas:** Deploy new tables `dealer_returns` and `leakage_management`.
4. **Implement Automatic Triggers:** Deploy PL/pgSQL triggers to handle inventory changes on approved returns and leakages.
5. **Add Archive Support:** Add `is_archived` columns and implement the `public.archive_dealer_data` RPC.
6. **Apply RLS Hardening:** Apply matching select, insert, update, delete policies to all new tables.
