const http = require('https');

http.get('https://oweutcivgpmzldlcmkvd.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZXV0Y2l2Z3BtemxkbGNta3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgxMTQsImV4cCI6MjA5NjQyNDExNH0.sT3jrcRa3TkcVT5vXFoOQXDG6zREdl_wV0YZs3kBEAo'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const spec = JSON.parse(data);
      console.log('--- EXPOSED FUNCTIONS & PATHS ---');
      const paths = Object.keys(spec.paths);
      const rpcs = paths.filter(p => p.startsWith('/rpc/'));
      console.log('RPCs:', rpcs);
      const tables = paths.filter(p => !p.startsWith('/rpc/'));
      console.log('Tables/Views:', tables);
    } catch (err) {
      console.error('JSON Parse error:', err.message);
      console.log(data);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
