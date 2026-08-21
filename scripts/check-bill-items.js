const { Client } = require('pg')

async function checkBillItemsColumns() {
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
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='bill_items' 
      ORDER BY ordinal_position;
    `)

    console.log('Columns in public.bill_items:')
    res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`))

  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

checkBillItemsColumns()
