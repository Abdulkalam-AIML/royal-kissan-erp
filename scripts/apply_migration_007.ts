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

  const sqlPath = path.join(__dirname, '../migrations/007_print_status_verification.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('Applying migration 007_print_status_verification.sql...')
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('COMMIT')
    console.log('✅ Migration 007 applied successfully!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', err)
    process.exit(1)
  }

  // Verify new columns
  const resCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'print_jobs' AND column_name IN ('actual_transport', 'verification_method', 'printed_at');
  `)
  console.log('Verified columns in print_jobs:', resCols.rows)

  await client.end()
}

run()
