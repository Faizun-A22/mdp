const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = 'c:\\mdp\\scratch\\sample.xlsx';
if (!fs.existsSync(filePath)) {
  console.log(`File not found: ${filePath}`);
  return;
}

try {
  console.log(`=== Inspecting ${filePath} ===`);
  const workbook = XLSX.readFile(filePath);
  console.log('Worksheets in sample.xlsx:', workbook.SheetNames);
  
  // Look for sheets that match "mutasi" or "juni" or list all sheets
  workbook.SheetNames.forEach(sheetName => {
    if (sheetName.toLowerCase().includes('mutasi') || sheetName.toLowerCase().includes('juni')) {
      console.log(`\nFound sheet: "${sheetName}"`);
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log('First 20 rows of this sheet:');
      json.slice(0, 20).forEach((row, idx) => {
        console.log(`Row ${idx + 1}:`, row);
      });
    }
  });
} catch (err) {
  console.error('Error reading sample.xlsx:', err.message);
}
