// Run migration by splitting SQL into individual statements and running via Supabase RPC
// Uses the service role key approach or direct HTTP to management API
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';

// Use Supabase Management API
// Project ref: oweutcivgpmzldlcmkvd
// Endpoint: https://api.supabase.com/v1/projects/{ref}/database/query
// This requires a management token, not anon key.

// Alternative: Use the Supabase built-in SQL execution via pg_net or the REST interface
// Let's try a different approach - use the PostgREST rpc endpoint to call a helper function
// OR just test that the existing schema already has all the columns we need

function httpsReq(method, url, body, headers) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        ...headers
      }
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function checkTable(tableName) {
  const r = await httpsReq('GET', `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=0`);
  return r.status === 200;
}

async function checkColumn(tableName, ...columns) {
  const colsParam = columns.join(',');
  const r = await httpsReq('GET', `${SUPABASE_URL}/rest/v1/${tableName}?select=${colsParam}&limit=0`);
  return { exists: r.status === 200, status: r.status, error: r.status !== 200 ? r.body : null };
}

async function main() {
  console.log('🔍 Full schema audit of bills-related tables...\n');
  
  const tables = [
    'bills', 'bill_items', 'daily_reports', 'monthly_reports',
    'driver_performance', 'dealer_sales', 'dealer_ledger', 'driver_sales',
    'route_reports', 'customer_ledger', 'route_sales'
  ];

  for (const t of tables) {
    const exists = await checkTable(t);
    console.log(`  ${exists ? '✅' : '❌'} ${t}`);
  }

  console.log('\n🔍 Checking bills columns...');
  const billCols = ['id', 'invoice_number', 'bill_type', 'customer_name', 
    'customer_phone', 'customer_address', 'dealer_id', 'driver_id', 'route_id',
    'subtotal', 'gst_amount', 'total_amount', 'payment_method', 
    'cash_amount', 'upi_amount', 'paid_amount', 'due_amount', 'payment_status',
    'date', 'notes', 'created_at'];
  
  for (const col of billCols) {
    const r = await checkColumn('bills', col);
    console.log(`  ${r.exists ? '✅' : '❌'} bills.${col} ${r.error ? '— ' + JSON.stringify(r.error).substring(0, 80) : ''}`);
  }
}

main().catch(console.error);
