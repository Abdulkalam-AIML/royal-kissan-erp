const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '../billing-fix-migration.sql'), 'utf8');

const client = new Client({
  connectionString: 'postgresql://postgres:24ME1A42B4ABDUL@db.oweutcivgpmzldlcmkvd.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase database');

    // Split and run statements individually to see which one fails
    // But first try as a whole block
    const result = await client.query(sql);
    console.log('✅ Migration completed successfully');
    
    // Verify the columns exist
    const verify = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bills'
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 bills table columns after migration:');
    verify.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type}) default=${r.column_default} nullable=${r.is_nullable}`);
    });

  } catch (err) {
    console.error('❌ Migration error:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    if (err.hint) console.error('   Hint:', err.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
