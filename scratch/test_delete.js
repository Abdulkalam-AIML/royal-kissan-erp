const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false }, global: { fetch: fetch }, realtime: { transport: WebSocket } });

async function testDelete() {
  console.log("Fetching products...");
  const { data, error } = await supabase.from('products').select('*');
  if (error) {
    console.error("Select Error:", error);
    return;
  }
  console.log(`Found ${data.length} products.`);
  
  if (data.length > 0) {
    console.log("Trying to delete a product to see if RLS allows it...");
    const { error: delError } = await supabase.from('products').delete().eq('id', data[0].id);
    if (delError) {
      console.error("Delete Error:", delError.message);
    } else {
      console.log("Delete successful! RLS is NOT blocking anon key from deleting!");
    }
  }
}
testDelete();
