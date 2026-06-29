const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'supabase_schema.sql');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log("Searching in supabase_schema.sql...");
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes('mutasi') || line.toLowerCase().includes('kk') || line.toLowerCase().includes('credit')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log("supabase_schema.sql does not exist.");
}
