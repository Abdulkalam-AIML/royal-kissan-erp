// Run billing fix migration via Supabase REST API (rpc calls)
// Since direct pg connection is blocked, we'll use the Supabase JS client
// to run each ALTER TABLE via rpc or direct API calls

const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://oweutcivgpmzldlcmkvd.supabase.co';
// We'll use the anon key + service role approach via REST
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';

function httpsPost(url, data, headers) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Supabase Management API - execute SQL
// Note: This requires management API key. Let's try via the REST endpoint
async function executeSQLViaRPC(sql) {
  // Try via PostgREST's rpc endpoint (requires a function to exist)
  // Instead, let's test if bills table has the columns via select
  const url = `${SUPABASE_URL}/rest/v1/bills?select=id,cash_amount,upi_amount,paid_amount,payment_status,customer_address&limit=1`;
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('🔍 Checking current bills table schema via Supabase REST API...');
  const result = await executeSQLViaRPC('');
  console.log(`Status: ${result.status}`);
  console.log(`Response: ${result.body.substring ? result.body.substring(0, 500) : JSON.stringify(result.body).substring(0, 500)}`);
  
  if (result.status === 200) {
    console.log('\n✅ Bills table accessible. Columns exist already!');
  } else if (result.body.includes('cash_amount') || result.body.includes('column') || result.body.includes('does not exist')) {
    console.log('\n❌ Missing columns confirmed. Need to run migration in Supabase SQL Editor.');
  } else {
    console.log('\n⚠️ Unknown state - see response above');
  }
}

main().catch(console.error);
