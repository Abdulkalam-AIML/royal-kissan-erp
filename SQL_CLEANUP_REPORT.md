# SQL Cleanup Report: Royal Kissan ERP

The Supabase project database migrations were audited.

## Production SQL Migration Status
- **Active Migration Chain**: [migrations/add_missing_billing_columns.sql](file:///Users/abdulkalam/Desktop/ROLLY%20ERP/royal-kissan-erp/migrations/add_missing_billing_columns.sql)
- This is the single local migration file tracked by active source control.

## Redundant SQL Scripts Removed
A total of 17 SQL scratch files created in the project root by developers during database diagnostic/rebuild cycles were deleted. Grep analysis verified these are never read by the Next.js runtime, build pipelines, or vercel deployments.
- `DATABASE_FIXES.sql`
- `DUPLICATE_PRODUCTS_CLEANUP.sql`
- `FUNCTION_FIXES.sql`
- `INDEX_FIXES.sql`
- `MASTER_RESET.sql`
- `RLS_FIXES.sql`
- `SECURITY_FIXES.sql`
- `billing-fix-migration.sql`
- `consolidated_updates.sql`
- `erp_complete_update.sql`
- `security_hardening.sql`
- `seed-data.sql`
- `supabase-billing-v2.sql`
- `supabase-route-sales.sql`
- `supabase-route-stops-expenses.sql`
- `supabase-schema.sql`
- `supabase-updates.sql`
