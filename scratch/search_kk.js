const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'Outstanding.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log("Searching in Outstanding.jsx...");
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('kk') || line.toLowerCase().includes('mutasi') || line.toLowerCase().includes('credit')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
