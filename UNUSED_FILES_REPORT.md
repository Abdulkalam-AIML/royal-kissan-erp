# Unused Files Report: Royal Kissan ERP

The following files were flagged as unused by automated tooling (`knip`, `ts-prune`) and confirmed to have zero internal code imports or asset link tags across the repository:

## Unused Developer Tools & Scripts
- `check_all_tables.js`
- `check_tables.js`
- `find_db_region.js`
- `set_env.js`
- `test-signin.js`
- `test-signup.js`
- `test_extra_regions.js`
- `test_save_bill.js`
- `try_db_connect.js`
- `add_vercel_env.sh`

## Unused Scratchpad Folder
- `scratch/` containing 51 JS files (complete database checks, manual DNS lookups, pooler testing scripts).

## Duplicate Database Client Utils
- `src/utils/supabase/client.ts`
- `src/utils/supabase/middleware.ts`
- `src/utils/supabase/server.ts`
*(Note: These files were duplicates. The active client utilities are located in `src/lib/supabase/`)*

## Unused Boilerplate SVG Assets
- `public/file.svg`
- `public/globe.svg`
- `public/next.svg`
- `public/vercel.svg`
- `public/window.svg`
