const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'StockPallet.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 1080; i < 1140; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
