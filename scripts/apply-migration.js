const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  const client = new Client({
    user: 'postgres.oweutcivgpmzldlcmkvd',
    password: '24ME1A42ABDULKALAM',
    host: 'aws-1-ap-southeast-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('Connecting to production Supabase PostgreSQL instance (oweutcivgpmzldlcmkvd)...')
    await client.connect()
    console.log('Connected successfully!')

    const sqlPath = path.join(__dirname, '../migrations/fix_bills_schema_items_count.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('Executing Master SQL Migration...')
    await client.query(sql)
    console.log('Migration executed successfully!')

    console.log('\n--- VERIFYING PRODUCTION SCHEMA COLUMNS ---')
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='bills' 
      ORDER BY ordinal_position;
    `)

    console.log(`Found ${res.rows.length} columns in public.bills:`)
    res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`))

    console.log('\n--- VERIFYING PROCESS_POS_BILL RPC ---')
    const rpcRes = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema='public' AND routine_name='process_pos_bill';
    `)
    console.log(`RPC process_pos_bill status: ${rpcRes.rows.length > 0 ? 'INSTALLED & READY' : 'NOT FOUND'}`)

  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await client.end()
  }
}

runMigration()
