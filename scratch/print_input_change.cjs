const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'StockPallet.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('handleInputChange')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

// Let's print around line 545-565 where handleInputChange should be
for (let i = 535; i < 565; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
