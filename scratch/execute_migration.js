const fs = require('fs');
const { Client } = require('pg');

async function run() {
  let connectionString;
  try {
    const envFile = fs.readFileSync('/Users/abdulkalam/Desktop/ROLLY ERP/royal-kissan-erp/.env.local', 'utf8');
    const dbUrlLine = envFile.split('\n').find(line => line.startsWith('DATABASE_URL='));
    if (dbUrlLine) {
      connectionString = dbUrlLine.split('DATABASE_URL=')[1].replace(/['"]/g, '').trim();
    }
  } catch (err) {
    console.error("Error reading .env.local:", err.message);
  }

  if (!connectionString) {
    console.error("❌ DATABASE_URL not found in .env.local!");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("✅ Connected successfully!");

    console.log("Starting Transaction for safe duplicate cleanup and hardening...");
    await client.query("BEGIN;");

    // Helper function to dynamically remap references and delete duplicates for any target table
    const generateRemapQuery = (targetTable) => `
      DO $$
      DECLARE
        rec RECORD;
        dup_id UUID;
        ref_rec RECORD;
      BEGIN
        FOR rec IN 
          SELECT name, ids[1] AS kept_id, ids[2:array_length(ids, 1)] AS duplicate_ids
          FROM (
            SELECT name, array_agg(id ORDER BY created_at ASC) AS ids
            FROM ${targetTable}
            GROUP BY name
            HAVING COUNT(*) > 1
          ) t
        LOOP
          FOREACH dup_id IN ARRAY rec.duplicate_ids
          LOOP
            -- Custom stock merging before dynamic updates
            IF '${targetTable}' = 'products' THEN
              UPDATE stock s1
              SET current_quantity = s1.current_quantity + COALESCE(s2.current_quantity, 0)
              FROM stock s2
              WHERE s1.product_id = rec.kept_id
                AND s2.product_id = dup_id;
              DELETE FROM stock WHERE product_id = dup_id;
            END IF;

            -- Find and update all tables referencing this target table via foreign keys
            FOR ref_rec IN
              SELECT
                  tc.table_name AS referencing_table, 
                  kcu.column_name AS referencing_column
              FROM 
                  information_schema.table_constraints AS tc 
                  JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                  JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
              WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND ccu.table_name = '${targetTable}'
                AND tc.table_schema = 'public'
            LOOP
              BEGIN
                EXECUTE format('UPDATE %I SET %I = %L WHERE %I = %L', 
                               ref_rec.referencing_table, ref_rec.referencing_column, rec.kept_id,
                               ref_rec.referencing_column, dup_id);
              EXCEPTION WHEN unique_violation THEN
                EXECUTE format('DELETE FROM %I WHERE %I = %L', 
                               ref_rec.referencing_table, ref_rec.referencing_column, dup_id);
              END;
            END LOOP;

            -- Finally delete the duplicate target row
            DELETE FROM ${targetTable} WHERE id = dup_id;
          END LOOP;
        END LOOP;
      END $$;
    `;

    // =========================================================================
    // 1. PRODUCTS DEDUPLICATION
    // =========================================================================
    console.log("Cleaning duplicate products...");
    await client.query(generateRemapQuery('products'));

    // Ensure UNIQUE constraint on products.name
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'products_name_key'
        ) THEN
          ALTER TABLE products ADD CONSTRAINT products_name_key UNIQUE (name);
          RAISE NOTICE 'Added UNIQUE constraint to products.name';
        END IF;
      END $$;
    `);

    // =========================================================================
    // 2. EMPLOYEES DEDUPLICATION
    // =========================================================================
    console.log("Cleaning duplicate employees...");
    await client.query(generateRemapQuery('employees'));

    // Ensure UNIQUE constraint on employees.name
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'employees_name_key'
        ) THEN
          ALTER TABLE employees ADD CONSTRAINT employees_name_key UNIQUE (name);
          RAISE NOTICE 'Added UNIQUE constraint to employees.name';
        END IF;
      END $$;
    `);

    // =========================================================================
    // 3. DRIVERS DEDUPLICATION
    // =========================================================================
    console.log("Cleaning duplicate drivers...");
    await client.query(generateRemapQuery('drivers'));

    // Ensure UNIQUE constraint on drivers.name
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'drivers_name_key'
        ) THEN
          ALTER TABLE drivers ADD CONSTRAINT drivers_name_key UNIQUE (name);
          RAISE NOTICE 'Added UNIQUE constraint to drivers.name';
        END IF;
      END $$;
    `);

    // =========================================================================
    // 4. DEALERS DEDUPLICATION
    // =========================================================================
    console.log("Cleaning duplicate dealers...");
    await client.query(generateRemapQuery('dealers'));

    // Ensure UNIQUE constraint on dealers.name
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'dealers_name_key'
        ) THEN
          ALTER TABLE dealers ADD CONSTRAINT dealers_name_key UNIQUE (name);
          RAISE NOTICE 'Added UNIQUE constraint to dealers.name';
        END IF;
      END $$;
    `);

    // =========================================================================
    // 5. ROUTES DEDUPLICATION
    // =========================================================================
    console.log("Cleaning duplicate routes...");
    await client.query(generateRemapQuery('routes'));

    // Ensure UNIQUE constraint on routes.name
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'routes_name_key'
        ) THEN
          ALTER TABLE routes ADD CONSTRAINT routes_name_key UNIQUE (name);
          RAISE NOTICE 'Added UNIQUE constraint to routes.name';
        END IF;
      END $$;
    `);

    // =========================================================================
    // 6. CUSTOMERS DEDUPLICATION
    // =========================================================================
    console.log("Cleaning duplicate customers...");
    await client.query(generateRemapQuery('customers'));

    // Ensure UNIQUE constraint on customers.name
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'customers_name_key'
        ) THEN
          ALTER TABLE customers ADD CONSTRAINT customers_name_key UNIQUE (name);
          RAISE NOTICE 'Added UNIQUE constraint to customers.name';
        END IF;
      END $$;
    `);

    await client.query("COMMIT;");
    console.log("🎉 Database deduplication completed and constraints enforced successfully!");

    // Verification queries
    console.log("\n--- Verification Report ---");
    const tables = ['products', 'employees', 'drivers', 'dealers', 'routes', 'customers'];
    for (const tbl of tables) {
      const check = await client.query(`
        SELECT name, COUNT(*) 
        FROM ${tbl} 
        GROUP BY name 
        HAVING COUNT(*) > 1
      `);
      console.log(`Table '${tbl}' duplicate count: ${check.rows.length}`);
    }

  } catch (err) {
    console.error("❌ Migration failed! Rolling back changes...", err.message);
    await client.query("ROLLBACK;");
  } finally {
    await client.end();
  }
}

run();
