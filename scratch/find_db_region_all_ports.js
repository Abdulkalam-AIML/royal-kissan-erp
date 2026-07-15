const { Client } = require('pg');
const dns = require('dns').promises;

const regions = [
  'ap-south-1', 'ap-south-2', 'ap-southeast-1', 'ap-southeast-2', 
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1',
  'eu-central-1', 'eu-central-2', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1',
  'sa-east-1', 'me-central-1', 'af-south-1'
];

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  
  try {
    await dns.lookup(host);
  } catch (dnsErr) {
    return;
  }

  const client = new Client({
    connectionString: `postgresql://postgres.oweutcivgpmzldlcmkvd:Admin%40123@${host}:6543/postgres`,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 2000
  });

  try {
    await client.connect();
    console.log(`🚀 SUCCESS! Connected to region ${region}!`);
    await client.end();
  } catch (err) {
    console.log(`  Region ${region}: ${err.message}`);
  }
}

async function run() {
  console.log('Searching deep for the correct Supabase region...');
  for (const region of regions) {
    await testRegion(region);
  }
}

run();
