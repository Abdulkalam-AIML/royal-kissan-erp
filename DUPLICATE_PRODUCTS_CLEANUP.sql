-- ====================================================================
-- PRODUCT DUPLICATE CLEANUP & UNIQUE CONSTRAINT MIGRATION
-- ====================================================================

BEGIN;

-- 1. Identify and keep only one row per product name (the oldest one).
-- Delete all others, but first, we need to handle foreign key dependencies 
-- if duplicates were already used in sales or stock. 
-- For a safe cleanup, we will remap dependencies to the kept product ID.

DO $$
DECLARE
  rec RECORD;
  dup_id UUID;
BEGIN
  FOR rec IN 
    SELECT name, ids[1] AS kept_id, ids[2:array_length(ids, 1)] AS duplicate_ids
    FROM (
      SELECT name, array_agg(id ORDER BY created_at ASC) AS ids
      FROM products
      GROUP BY name
      HAVING COUNT(*) > 1
    ) t
  LOOP
    FOREACH dup_id IN ARRAY rec.duplicate_ids
    LOOP
      -- Remap foreign keys to the kept_id
      UPDATE sale_items SET product_id = rec.kept_id WHERE product_id = dup_id;
      UPDATE stock SET product_id = rec.kept_id WHERE product_id = dup_id;
      UPDATE stock_transactions SET product_id = rec.kept_id WHERE product_id = dup_id;
      UPDATE dealer_products SET product_id = rec.kept_id WHERE product_id = dup_id;
      
      -- Delete the duplicate product
      DELETE FROM products WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;

-- 2. Add UNIQUE constraint to product name to prevent future duplicates.
-- We must ensure the column doesn't already have one to avoid errors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_name_key'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_name_key UNIQUE (name);
  END IF;
END $$;

-- 3. Verification Query (Should return ZERO rows)
SELECT name, COUNT(*)
FROM products
GROUP BY name
HAVING COUNT(*) > 1;

COMMIT;
