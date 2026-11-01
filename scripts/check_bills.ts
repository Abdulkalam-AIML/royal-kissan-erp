import { Client } from 'pg'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || ''
const connectionString = rawConnectionString.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')

async function checkBills() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })
  await client.connect()

  const colsRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bills';
  `)
  console.log('Bills columns:', colsRes.rows)

  await client.end()
}

checkBills().catch(console.error)
