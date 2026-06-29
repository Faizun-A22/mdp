const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'storage.js');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log("Reading storage.js...");
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('sp_') || line.includes('id') && line.includes('Date.now()')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
}
