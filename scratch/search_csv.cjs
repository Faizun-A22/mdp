const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'mdp_os_sheet.csv');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log("Searching in mdp_os_sheet.csv...");
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes('kk') || line.toLowerCase().includes('mutasi')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log("mdp_os_sheet.csv does not exist.");
}
