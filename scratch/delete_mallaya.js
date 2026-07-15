global.WebSocket = class {};
const { createClient } = require('/Users/abdulkalam/Desktop/ROLLY ERP/royal-kissan-erp/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://oweutcivgpmzldlcmkvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  await supabase.auth.signInWithPassword({
    email: 'owner@royalkissan.com',
    password: 'Admin@123'
  });

  const mallayaId = 'c097b6a9-8395-4eb8-a720-3057e07662c2';

  console.log('Unassigning Mallaya from routes...');
  const { error: routeErr } = await supabase
    .from('routes')
    .update({ driver_id: null })
    .eq('driver_id', mallayaId);

  if (routeErr) {
    console.error('❌ Failed to update routes:', routeErr.message);
  } else {
    console.log('✅ Successfully unassigned Mallaya from routes!');
  }

  console.log('Deleting Mallaya from drivers...');
  const { error: drvErr } = await supabase
    .from('drivers')
    .delete()
    .eq('id', mallayaId);

  if (drvErr) {
    console.error('❌ Failed to delete Mallaya from drivers:', drvErr.message);
  } else {
    console.log('✅ Successfully deleted Mallaya from drivers!');
  }

  // Also remove Mallaya from employees if they are listed as employee
  console.log('Checking if Mallaya is in employees...');
  const { data: emp } = await supabase.from('employees').select('id').ilike('name', '%mallaya%').maybeSingle();
  if (emp) {
    console.log(`Deleting Mallaya from employees (ID: ${emp.id})...`);
    const { error: empDelErr } = await supabase.from('employees').delete().eq('id', emp.id);
    if (empDelErr) {
      console.error('❌ Failed to delete Mallaya from employees:', empDelErr.message);
    } else {
      console.log('✅ Successfully deleted Mallaya from employees!');
    }
  }
}

run();
