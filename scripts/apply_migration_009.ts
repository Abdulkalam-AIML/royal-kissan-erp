import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const envPath = path.join(__dirname, '../.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const pgMatch = envContent.match(/POSTGRES_URL_NON_POOLING=[\"']?([^\"'\r\n]+)[\"']?/)
if (!pgMatch) {
  throw new Error('POSTGRES_URL_NON_POOLING not found in .env.local')
}
const connectionString = pgMatch[1].replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()
  console.log('Connected to Supabase PostgreSQL.')

  const sqlPath = path.join(__dirname, '../migrations/009_dealer_gst_returns_and_driver_settlement.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('Applying migration 009_dealer_gst_returns_and_driver_settlement.sql...')
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('COMMIT')
    console.log('✅ Migration 009 applied successfully!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', err)
    process.exit(1)
  }

  // Verification checks
  const resTables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN (
        'dealer_dispatches', 
        'dealer_dispatch_items', 
        'dealer_return_entries', 
        'dealer_return_items', 
        'dealer_credit_adjustments', 
        'dealer_daily_settlements', 
        'driver_load_dispatches', 
        'driver_load_items', 
        'driver_route_settlements', 
        'driver_route_settlement_items'
      )
    ORDER BY table_name;
  `)
  console.log('Verified created tables:', resTables.rows.map(r => r.table_name))

  const resDealers = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'dealers' AND column_name IN ('is_gst_enabled', 'default_gst_rate', 'state_code', 'pan_number');
  `)
  console.log('Verified dealer GST columns:', resDealers.rows)

  await client.end()
}

run()

