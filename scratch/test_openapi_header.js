async function run() {
  const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';

  // Let's try GET to root URL with Accept: application/openapi+json
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Accept': 'application/openapi+json'
    }
  });
  console.log("Status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log("Body length:", text.length);
  if (res.status === 200) {
    const json = JSON.parse(text);
    console.log("Definitions keys:", Object.keys(json.definitions || {}));
    const fs = require('fs');
    fs.writeFileSync('scratch/openapi_definitions.json', JSON.stringify(json.definitions, null, 2));
    console.log("Saved definitions to scratch/openapi_definitions.json");
  } else {
    console.log("Body:", text);
  }
}
run();
