import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || ''
const connectionString = rawConnectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()
  console.log('Connected to Supabase PostgreSQL.')

  const sqlPath = path.join(__dirname, '../migrations/008_purchase_management_and_whatsapp.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('Applying migration 008_purchase_management_and_whatsapp.sql...')
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('COMMIT')
    console.log('✅ Migration 008 applied successfully!')
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
      AND table_name IN ('suppliers', 'purchases', 'purchase_items', 'whatsapp_settings', 'whatsapp_notifications');
  `)
  console.log('Verified created tables:', resTables.rows.map(r => r.table_name))

  const resSettings = await client.query('SELECT * FROM public.whatsapp_settings;')
  console.log('Default whatsapp_settings:', resSettings.rows)

  await client.end()
}

run()

