global.WebSocket = class {};
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  await supabase.auth.signInWithPassword({
    email: 'owner@royalkissan.com',
    password: 'Admin@123'
  });

  // Check products
  console.log('\n=== PRODUCTS CHECK ===');
  const { data: products, error: prodErr } = await supabase.from('products').select('*');
  if (prodErr) {
    console.error('Products fetch error:', prodErr.message);
  } else {
    console.log(`Fetched ${products.length} products:`);
    const prodGroups = {};
    products.forEach(p => {
      prodGroups[p.name] = prodGroups[p.name] || [];
      prodGroups[p.name].push(p.id);
    });
    Object.keys(prodGroups).forEach(name => {
      if (prodGroups[name].length > 1) {
        console.log(`- Product "${name}" has ${prodGroups[name].length} records: ${prodGroups[name].join(', ')}`);
      } else {
        console.log(`- Product "${name}" is unique`);
      }
    });
  }
}

run();
