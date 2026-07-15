const fs = require('fs');
const path = require('path');

const files = [
  'seed-data.sql',
  'supabase-route-sales.sql',
  'supabase-updates.sql',
  'security_hardening.sql',
  'consolidated_updates.sql',
  'supabase-route-stops-expenses.sql'
];

const projectDir = '/Users/abdulkalam/Desktop/ROLLY ERP/royal-kissan-erp';

const uuidRegex = /'([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'/g;

files.forEach(file => {
  const filePath = path.join(projectDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace UUID literals not already followed by ::uuid
  let count = 0;
  const newContent = content.replace(uuidRegex, (match, uuid) => {
    // Check if it's already casted
    const index = content.indexOf(match);
    const after = content.substring(index + match.length, index + match.length + 6);
    if (after.startsWith('::uuid')) {
      return match;
    }
    
    // Check if it's in a comment (simple check for leading -- on the line)
    const lineStart = content.lastIndexOf('\n', index) + 1;
    const line = content.substring(lineStart, index);
    if (line.trim().startsWith('--')) {
      return match;
    }
    
    count++;
    return `'${uuid}'::uuid`;
  });
  
  if (count > 0) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${file}: Casted ${count} UUID literals.`);
  } else {
    console.log(`No updates needed for ${file}.`);
  }
});
