import { Client } from 'pg'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const client = new Client({
  connectionString: 'postgres://postgres.oweutcivgpmzldlcmkvd:24ME1A42ABDULKALAM@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
})

async function main() {
  await client.connect()
  const tables = [
    'drivers',
    'routes',
    'driver_load_dispatches',
    'driver_load_items',
    'driver_route_settlements',
    'driver_route_settlement_items',
    'route_sales',
    'route_customers',
    'employees',
    'attendance',
    'employee_advances',
    'salary',
    'salary_payments',
    'bills',
    'bill_items'
  ]
  for (const t of tables) {
    const res = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position`,
      [t]
    )
    console.log(`=== ${t} ===`)
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '))
  }
  await client.end()
}
main().catch(console.error)
