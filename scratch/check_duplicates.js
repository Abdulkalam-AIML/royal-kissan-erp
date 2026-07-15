global.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // Query all dealers
  const { data: dealers, error: dErr } = await supabase.from('dealers').select('id, name, phone, area');
  if (dErr) {
    console.error("Error fetching dealers:", dErr.message);
  } else {
    console.log(`Total dealers: ${dealers.length}`);
    const nameMap = {};
    dealers.forEach(d => {
      const key = d.name.toLowerCase().trim();
      if (!nameMap[key]) nameMap[key] = [];
      nameMap[key].push(d);
    });
    console.log("Duplicate dealers (by name):");
    let foundDup = false;
    for (const [name, list] of Object.entries(nameMap)) {
      if (list.length > 1) {
        foundDup = true;
        console.log(`- "${name}":`, list.map(item => item.id));
      }
    }
    if (!foundDup) console.log("  No duplicates found!");
  }
}
run();
