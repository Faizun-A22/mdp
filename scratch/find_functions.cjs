const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'StockPallet.jsx');
const content = fs.readFileSync(filePath, 'utf8');

// Let's print out lines around the form inputs, and where transactions are added or updated.
// Let's search for "handleAddMutasi" or "handleSubmit" or "save" or similar functions.
const lines = content.split('\n');
console.log("Functions in StockPallet.jsx:");
lines.forEach((line, idx) => {
  if (line.includes('const') && (line.includes('Submit') || line.includes('Save') || line.includes('Add') || line.includes('Delete') || line.includes('calculate') || line.includes('stokAwal') || line.includes('saldo'))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
