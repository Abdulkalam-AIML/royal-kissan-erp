const dns = require('dns').promises;

async function check() {
  const host = 'oweutcivgpmzldlcmkvd.supabase.co';
  try {
    const addresses = await dns.resolve4(host);
    console.log(`IPs for ${host}:`, addresses);
  } catch (err) {
    console.error('IP lookup failed:', err.message);
  }

  try {
    const cnames = await dns.resolveCname(host);
    console.log(`CNAMEs for ${host}:`, cnames);
  } catch (err) {
    console.log('CNAME lookup failed:', err.message);
  }
}

check();
