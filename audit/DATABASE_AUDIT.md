# ROYAL KISSAN ERP – DATABASE AUDIT REPORT

**Audit Date**: July 24, 2026  
**Auditor**: Senior Database Engineer  

---

## 🗄️ 1. Schema & Table Architecture Overview

The database runs on Cloud Supabase (PostgreSQL) with a structured schema supporting multi-route daily driver operations, customer stop sheets, and reconciliation.

### Core Verified Tables:

1. **`route_customers`**: Persistent registry of customer stops seeded per route (`route_id`, `customer_name`, `section`, `default_quantity`, `default_rate`, `default_product`, `is_manual_rate`, `sort_order`).
2. **`daily_route_assignments`**: Daily mapping of driver to route and vehicle (`driver_id`, `route_id`, `vehicle_number`, `status`, `date`).
3. **`route_dispatches`**: Loaded stock per driver per day (`driver_id`, `route_id`, `assignment_id`, `items`, `date`).
4. **`route_runs`**: Daily trip reconciliation (`driver_id`, `route_id`, `assignment_id`, `sold_qty`, `paid_amount`, `due_amount`, `returned_qty`, `leaked_qty`, `expenses`, `reconciled_at`).
5. **`bills` & `bill_items`**: Enterprise wholesale billing invoices (`invoice_number`, `bill_type`, `total_amount`, `paid_amount`, `due_amount`, `date`).
6. **`customer_dues`**: Active outstanding dues tracking table.

---

## ⚡ 2. B-Tree Composite Indexes (`add_performance_indexes.sql`)

The following 9 B-tree composite performance indexes are applied and verified in Supabase:

```sql
CREATE INDEX IF NOT EXISTS idx_route_sales_date_driver ON route_sales (sale_date, driver_id);
CREATE INDEX IF NOT EXISTS idx_route_sales_date_route ON route_sales (sale_date, route_id);
CREATE INDEX IF NOT EXISTS idx_route_runs_date_driver ON route_runs (date, driver_id);
CREATE INDEX IF NOT EXISTS idx_route_dispatches_date_driver ON route_dispatches (date, driver_id);
CREATE INDEX IF NOT EXISTS idx_bills_date_type ON bills (date, bill_type);
CREATE INDEX IF NOT EXISTS idx_customer_dues_status_due ON customer_dues (status, due_amount);
CREATE INDEX IF NOT EXISTS idx_stock_tx_created ON stock_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_cust_route ON route_customers (route_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_daily_assign_date ON daily_route_assignments (date, driver_id);
```

---

## ⚠️ 3. Schema Recommendations

- **Data Preservation**: `assignment_id` is nullable in `route_dispatches` and `route_runs` to ensure 100% backward compatibility with legacy dispatches.
- **Maintenance**: Recommend scheduling a periodic `VACUUM ANALYZE` on `route_sales` and `bills` tables.
