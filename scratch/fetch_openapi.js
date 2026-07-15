const fs = require('fs');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';

async function run() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const definitions = data.definitions;
    
    console.log("Found definitions (tables/views):", Object.keys(definitions));
    
    fs.writeFileSync('scratch/openapi_definitions.json', JSON.stringify(definitions, null, 2));
    console.log("Saved definitions to scratch/openapi_definitions.json");
  } catch (e) {
    console.error("Error fetching OpenAPI:", e.message);
  }
}

run();
