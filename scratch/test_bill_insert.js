// Test INSERT into bills table via Supabase REST API to find exact error
const https = require('https');

const SUPABASE_URL = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const url = new URL(SUPABASE_URL + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        ...headers
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const d = new Date();
  const invoiceNum = `TEST-${Date.now()}`;
  
  const payload = {
    invoice_number: invoiceNum,
    bill_type: 'company_sale',
    customer_name: 'Test Customer',
    customer_phone: '9999999999',
    customer_address: '123 Test Street',
    dealer_id: null,
    driver_id: null,
    route_id: null,
    subtotal: 30,
    gst_amount: 5.4,
    total_amount: 35.4,
    payment_method: 'cash',
    cash_amount: 35.4,
    upi_amount: 0,
    paid_amount: 35.4,
    due_amount: 0,
    payment_status: 'paid',
    date: d.toISOString().split('T')[0],
    notes: 'Test bill - delete me'
  };

  console.log('📤 Testing INSERT into bills table...');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  const billResult = await request('POST', '/rest/v1/bills', payload);
  console.log('\n📥 Result status:', billResult.status);
  console.log('Result body:', JSON.stringify(billResult.body, null, 2));

  if (billResult.status === 201 || billResult.status === 200) {
    const bill = Array.isArray(billResult.body) ? billResult.body[0] : billResult.body;
    console.log('\n✅ Bill saved successfully! ID:', bill?.id);

    // Test bill_items insert
    const itemPayload = [{
      bill_id: bill.id,
      product_id: null,
      product_name: 'Water Can (20L)',
      quantity: 2,
      rate: 15,
      amount: 30,
      gst_rate: 18,
      gst_amount: 5.4,
      total: 35.4
    }];
    
    const itemsResult = await request('POST', '/rest/v1/bill_items', itemPayload);
    console.log('\n📦 Bill items result:', itemsResult.status, JSON.stringify(itemsResult.body, null, 2));
    
    if (itemsResult.status === 201 || itemsResult.status === 200) {
      console.log('✅ Bill items saved successfully!');
      // Clean up test bill
      await request('DELETE', `/rest/v1/bills?id=eq.${bill.id}`, null);
      console.log('🧹 Test bill deleted');
    }
  } else {
    console.log('\n❌ INSERT FAILED. See error above.');
    
    // Try to understand the schema
    console.log('\n🔍 Checking what columns exist...');
    const schemaResult = await request('GET', '/rest/v1/bills?select=*&limit=0');
    console.log('Schema check:', schemaResult.status, JSON.stringify(schemaResult.body, null, 2));
  }
}

main().catch(console.error);
