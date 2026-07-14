const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const files = ['test_sheet.xlsx', 'test_sheet_sync.xlsx'];

files.forEach(fileName => {
  const filePath = path.join(__dirname, '..', fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${fileName} at ${filePath}`);
    return;
  }
  
  console.log(`\n=== File: ${fileName} ===`);
  try {
    const workbook = XLSX.readFile(filePath);
    console.log('Worksheets:', workbook.SheetNames);
    
    // Check if there is a sheet that matches "mutasijuni" or similar
    workbook.SheetNames.forEach(sheetName => {
      if (sheetName.toLowerCase().includes('mutasi') || sheetName.toLowerCase().includes('juni')) {
        console.log(`\nFound sheet of interest: "${sheetName}"`);
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log('First 15 rows:');
        json.slice(0, 15).forEach((row, idx) => {
          console.log(`Row ${idx + 1}:`, row);
        });
      }
    });
  } catch (err) {
    console.error(`Error reading ${fileName}:`, err.message);
  }
});
