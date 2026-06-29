const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'storage.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 410; i < 455; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
