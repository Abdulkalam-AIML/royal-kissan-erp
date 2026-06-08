# Security Hardening Report: Royal Kissan ERP

## 1. Views Audit & RLS Configuration
All public database views have been inspected to resolve `SECURITY DEFINER` warnings:
- **`public.stock_status`** -> Defined as standard queries referencing base table rules. Evaluates under caller constraints to prevent privilege escalation.
- **`public.customer_dues`** -> Audited. Runs dynamic calculations under RLS constraints.
- **`public.daily_sales_summary`** -> Audited. Filters results securely based on active authenticated user roles.

---

## 2. Row Level Security (RLS) Policy Table
Every table in the database has RLS explicitly enabled:

| Table | RLS Enabled | Policies Installed |
|---|---|---|
| `users` | Yes | SELECT/UPDATE by profile owner |
| `roles` | Yes | SELECT by authenticated |
| `permissions` | Yes | SELECT by authenticated |
| `employees` | Yes | SELECT by authenticated, Write by Admin only |
| `drivers` | Yes | SELECT by authenticated, Write by Admin only |
| `routes` | Yes | SELECT by authenticated, Write by Admin only |
| `customers` | Yes | Read & Write by authenticated |
| `dealers` | Yes | Read & Write by authenticated |
| `products` | Yes | Read & Write by authenticated |
| `stock` | Yes | SELECT by authenticated, Write by authenticated |
| `sales` | Yes | SELECT by authenticated, Write by authenticated |
| `expenses` | Yes | SELECT by authenticated, Write by authenticated |
| `salary_payments` | Yes | SELECT by authenticated, Write by Admin only |
| `settings` | Yes | SELECT by authenticated, Write by Admin only |
| `audit_logs` | Yes | SELECT by Admin only, Write by system trigger |

---

## 3. Role-Based Permissions Checklist
Role checks are calculated using the `get_user_role()` function:
- **Admin (Owner):** Grants full access to add, edit, or delete any record, configure settings, and manage employees and salaries.
- **Worker (Billing Operator):** Restricted access. Can query products, create invoices/bills, and view statistics. Delete operations (`DELETE`) are strictly denied at the database level via PostgreSQL RLS policies.
