const { Client } = require('pg')

async function checkSchemas() {
  const client = new Client({
    user: 'postgres.oweutcivgpmzldlcmkvd',
    password: '24ME1A42ABDULKALAM',
    host: 'aws-1-ap-southeast-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    
    const tables = ['collections', 'customer_dues', 'products', 'stock_transactions']
    for (const table of tables) {
      const res = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name=$1 
        ORDER BY ordinal_position;
      `, [table])

      console.log(`\nColumns in public.${table}:`)
      if (res.rows.length === 0) console.log('  (Table does not exist)')
      res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`))
    }

  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

checkSchemas()
