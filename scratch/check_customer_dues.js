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
    console.log("Connected to database.");

    // Query indexes in public schema
    const indexRes = await client.query(`
      SELECT
          t.relname AS table_name,
          i.relname AS index_name,
          a.attname AS column_name
      FROM
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
      WHERE
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
      ORDER BY
          t.relname,
          i.relname;
    `);
    console.log("\nDatabase Indexes:");
    let currentTable = "";
    indexRes.rows.forEach(r => {
      if (r.table_name !== currentTable) {
        currentTable = r.table_name;
        console.log(`\nTable: ${currentTable}`);
      }
      console.log(`  - Index: ${r.index_name} (Column: ${r.column_name})`);
    });

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
