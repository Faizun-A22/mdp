const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'supabase_schema.sql');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

let start = -1;
let end = -1;
lines.forEach((line, idx) => {
  if (line.includes('CREATE TABLE mdp_stock_pallet') || line.includes('create table mdp_stock_pallet')) {
    start = idx + 1;
  }
  if (start !== -1 && end === -1 && line.includes(');')) {
    end = idx + 1;
  }
});

if (start !== -1 && end !== -1) {
  for (let i = start - 1; i < end; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log("Not found or not closed properly.");
}
