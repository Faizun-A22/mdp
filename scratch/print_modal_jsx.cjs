const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'StockPallet.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

function printLines(start, end) {
  console.log(`--- Lines ${start} to ${end} ---`);
  for (let i = start - 1; i < end; i++) {
    if (lines[i] !== undefined) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  }
}

printLines(2100, 2220);
