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
    await client.connect();
    console.log("Connected to database. Commencing audit...\n");

    // 1. Table list and row counts
    console.log("=== TABLE ROW COUNTS ===");
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    for (const row of tablesRes.rows) {
      const countRes = await client.query(`SELECT COUNT(*) FROM public."${row.table_name}";`);
      console.log(`- ${row.table_name}: ${countRes.rows[0].count} rows`);
    }

    // 2. Duplicate rows in drivers, employees, products, routes, customers
    console.log("\n=== DUPLICATE RECORDS AUDIT ===");
    const checkTbls = ['drivers', 'employees', 'products', 'routes', 'customers', 'dealers'];
    for (const tbl of checkTbls) {
      const dupRes = await client.query(`
        SELECT name, COUNT(*) 
        FROM public."${tbl}" 
        GROUP BY name 
        HAVING COUNT(*) > 1;
      `);
      console.log(`- ${tbl} duplicate names count: ${dupRes.rows.length}`);
      dupRes.rows.forEach(r => console.log(`  - Name: "${r.name}" has ${r.count} rows`));
    }

    // 3. Driver Records List
    console.log("\n=== DRIVER RECORDS LIST ===");
    const driversRes = await client.query(`SELECT id, name, phone, is_active, created_at FROM public.drivers;`);
    driversRes.rows.forEach(r => console.log(`- Driver: ${r.name} (Active: ${r.is_active}, Phone: ${r.phone}, ID: ${r.id})`));

    // 4. Dealer Records Count
    console.log("\n=== DEALER RECORDS COUNT ===");
    const dealersCount = await client.query(`SELECT COUNT(*) FROM public.dealers;`);
    console.log(`Total Dealers in DB: ${dealersCount.rows[0].count}`);

    // 5. Products List
    console.log("\n=== PRODUCTS LIST ===");
    const productsRes = await client.query(`SELECT id, name, category, default_rate, gst_rate, is_active FROM public.products;`);
    productsRes.rows.forEach(r => console.log(`- Product: "${r.name}" (${r.category}, Rate: ${r.default_rate}, GST: ${r.gst_rate}%, Active: ${r.is_active}, ID: ${r.id})`));

    // 6. RLS & Security Advisor
    console.log("\n=== RLS & SECURITY AUDIT ===");
    const rlsRes = await client.query(`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    rlsRes.rows.forEach(r => {
      console.log(`- Table ${r.tablename}: RLS Enabled = ${r.rowsecurity}`);
    });

    // Check security definer functions and search_path
    console.log("\n=== SECURITY DEFINER FUNCTIONS CHECK ===");
    const funcsRes = await client.query(`
      SELECT n.nspname AS schema, p.proname AS name, p.prosecdef AS security_definer, p.proconfig AS config
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.prosecdef = true;
    `);
    funcsRes.rows.forEach(r => {
      console.log(`- Function ${r.name}: Security Definer = ${r.security_definer}, Config: ${JSON.stringify(r.config)}`);
    });

  } catch (err) {
    console.error("Error running audit script:", err.message);
  } finally {
    await client.end();
  }
}

run();
