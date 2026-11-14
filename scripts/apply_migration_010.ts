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

  const sqlPath = path.join(__dirname, '../migrations/010_attendance_advances_and_workflows.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('Applying migration 010_attendance_advances_and_workflows.sql...')
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('COMMIT')
    console.log('✅ Migration 010 applied successfully!')
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
      AND table_name = 'employee_advances';
  `)
  console.log('Verified table:', resTables.rows.map(r => r.table_name))

  const resRoutines = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name IN ('record_employee_advance', 'settle_employee_salary', 'apply_dealer_credits_to_bill');
  `)
  console.log('Verified routines:', resRoutines.rows.map(r => r.routine_name))

  await client.end()
}

run()

