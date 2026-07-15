const fs = require('fs');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';

const tables = [
  'customers',
  'customer_dues',
  'sales',
  'bills',
  'collections',
  'route_sales',
  'dealer_ledger',
  'dealers',
  'dealer_products'
];

async function fetchMetadata(tableName) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
      method: 'OPTIONS',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    if (!res.ok) {
      console.log(`Table "${tableName}": HTTP ${res.status}`);
      return;
    }
    
    const data = await res.json();
    
    // The OPTIONS response contains definitions or parameters/properties
    // PostgREST options returns OpenAPI-like parameters
    const properties = data.definitions?.[tableName]?.properties;
    if (properties) {
      console.log(`\nTable "${tableName}" columns:`);
      for (const [colName, colMeta] of Object.entries(properties)) {
        console.log(`  - ${colName}: ${colMeta.type} (${colMeta.format || ''})`);
      }
    } else {
      console.log(`Table "${tableName}": No properties found in OPTIONS body.`);
    }
  } catch (e) {
    console.error(`Error on "${tableName}":`, e.message);
  }
}

async function run() {
  for (const t of tables) {
    await fetchMetadata(t);
  }
}

run();
