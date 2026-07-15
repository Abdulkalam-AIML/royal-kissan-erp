const dns = require('dns').promises;

const regions = [
  'ap-south-1',
  'us-west-2',
  'us-east-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'eu-west-3',
  'sa-east-1',
  'eu-west-1',
  'eu-west-2',
  'us-west-1',
  'ca-central-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'eu-central-2',
  'eu-north-1',
  'us-east-2'
];

async function check() {
  console.log('--- DNS LOOKUP ---');
  for (const r of regions) {
    const host = `aws-0-${r}.pooler.supabase.com`;
    try {
      const ips = await dns.resolve(host);
      console.log(`Region ${r} resolves to:`, ips);
    } catch (err) {
      // ignore failures
    }
  }

  try {
    const directHost = 'db.oweutcivgpmzldlcmkvd.supabase.co';
    const ips = await dns.resolve(directHost);
    console.log(`Direct host resolves to:`, ips);
  } catch (err) {
    console.log(`Direct host resolves failed:`, err.message);
  }
}

check();
