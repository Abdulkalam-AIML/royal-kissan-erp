global.WebSocket = class {};
const { createClient } = require('/Users/abdulkalam/Desktop/ROLLY ERP/royal-kissan-erp/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  await supabase.auth.signInWithPassword({
    email: 'owner@royalkissan.com',
    password: 'Admin@123'
  });

  console.log('Testing RPC get_user_role...');
  const { data, error } = await supabase.rpc('get_user_role');
  if (error) {
    console.log('get_user_role error:', error.message);
  } else {
    console.log('get_user_role success:', data);
  }
}

check();
