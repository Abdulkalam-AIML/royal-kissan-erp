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

  const sqlPath = path.join(__dirname, '../migrations/006_bridge_workers_heartbeat.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('Applying migration 006_bridge_workers_heartbeat.sql...')
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('COMMIT')
    console.log('✅ Migration 006 applied successfully!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', err)
    process.exit(1)
  }

  // Verification checks
  const resWorkers = await client.query("SELECT to_regclass('public.print_bridge_workers');")
  console.log("Verification to_regclass('public.print_bridge_workers'):", resWorkers.rows[0].to_regclass)

  const resSettings = await client.query("SELECT preferred_connection FROM public.printer_settings;")
  console.log("Updated printer_settings preferred_connection:", resSettings.rows)

  const resDevices = await client.query("SELECT device_name, connection_type, is_default FROM public.printer_devices;")
  console.log("Printer devices defaults:", resDevices.rows)

  await client.end()
}

run().catch(console.error)
