const dns = require('dns').promises;

async function check() {
  try {
    const host = 'oweutcivgpmzldlcmkvd.supabase.co';
    const ips = await dns.resolve(host);
    console.log(`REST host ${host} resolves to:`, ips);
  } catch (err) {
    console.log(`Failed:`, err.message);
  }
}

check();
