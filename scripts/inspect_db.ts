import { Client } from 'pg'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || ''
// Remove sslmode query param so pg object config takes precedence
const connectionString = rawConnectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')

async function inspect() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()
  console.log('Connected to PostgreSQL successfully.')

  // 1. Check to_regclass('public.print_jobs')
  const regclassRes = await client.query("SELECT to_regclass('public.print_jobs') as regclass;")
  console.log('to_regclass(public.print_jobs):', regclassRes.rows[0])

  // 2. Check information_schema.tables for printer-related tables
  const tablesRes = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('print_jobs', 'printer_devices', 'printer_settings', 'print_logs');
  `)
  console.log('Existing printer tables:', tablesRes.rows)

  // 3. Check columns of any existing printer tables
  if (tablesRes.rows.length > 0) {
    const colsRes = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('print_jobs', 'printer_devices', 'printer_settings', 'print_logs')
      ORDER BY table_name, ordinal_position;
    `)
    console.log('Columns count:', colsRes.rows.length)
    for (const c of colsRes.rows) {
      console.log(`- ${c.table_name}.${c.column_name} (${c.data_type})`);
    }
  }

  // 4. Check RLS status
  const rlsRes = await client.query(`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
    WHERE nspname = 'public' 
      AND relname IN ('print_jobs', 'printer_devices', 'printer_settings', 'print_logs');
  `)
  console.log('RLS Status:', rlsRes.rows)

  // 5. Check RLS policies
  const polRes = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('print_jobs', 'printer_devices', 'printer_settings', 'print_logs');
  `)
  console.log('Policies:', polRes.rows)

  await client.end()
}

inspect().catch(err => {
  console.error('Inspection error:', err)
  process.exit(1)
})
